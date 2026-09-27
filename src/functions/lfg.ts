import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    LabelBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
    ThreadAutoArchiveDuration,
    type Client,
    type Interaction,
    type Message,
    type TextChannel
} from "discord.js";
import {
    LFG_LANGUAGE_OPTIONS,
    getLanguageOption,
    getUiCopy as getTranslatedCopy,
    inferLobbyLanguageId,
    isLanguageChoiceId,
    lobbyLanguageDisplay,
    uiLanguageFromChoice,
    uiLanguageFromDiscordLocale,
    type LfgLanguageChoiceId,
    type LfgUiLanguageId
} from "./lfgTranslations.js";

import type {GuildSettings} from "../config.js";

export function createLfgSystem(settings: GuildSettings) {
    let stopped = false;
    let maintenanceTimer: NodeJS.Timeout | undefined;
    const cleanupTimers = new Set<NodeJS.Timeout>();
    function scheduleCleanup(callback: () => Promise<void>, delay: number): NodeJS.Timeout {
        const timer = setTimeout(() => {
            cleanupTimers.delete(timer);
            if (!stopped)
                void callback().catch((error) =>
                    console.error("[LFG] Cleanup failed:", error instanceof Error ? error.message : "Unknown error")
                );
        }, delay);
        cleanupTimers.add(timer);
        return timer;
    }
    const LFG_CHANNEL_ID = settings.boardId;
    const LFG_START_HERE_CHANNEL_ID = settings.startId;
    const LFG_RULES_CHANNEL_ID = settings.rulesId;
    const playersOptions = [
        ...Array.from({length: settings.teamSize - 1}, (_, i) => (i === 0 ? "1 player" : `${i + 1} players`)),
        "Not specified"
    ];
    const modeOptions = [...settings.modes, "Not specified"];
    const codeMin = settings.codeLength || 1;
    const codeMax = settings.codeLength || 32;
    const codeLengthDisplay = settings.codeLength ? String(settings.codeLength) : "1–32";
    function getUiCopy(language: LfgUiLanguageId) {
        return getTranslatedCopy(language, settings.gameName, codeLengthDisplay, settings.expiryMinutes);
    }
    const LOBBY_CODE_VALUE_REGEX = new RegExp(`^[A-Za-z0-9_-]{${codeMin},${codeMax}}$`);
    const LFG_INTERFACE_CREATE_CUSTOM_ID = "lfg:interface:create";
    const LFG_CREATE_MODAL_CUSTOM_ID = "lfg:createmodal";
    const LFG_BROWSE_CUSTOM_ID = "lfg:browse";
    const LFG_BROWSE_LANGUAGE_CUSTOM_ID = "lfg:browse:language";
    const LFG_UI_LANGUAGE_START_CUSTOM_ID = "lfg:ui-language:start";
    const LFG_UI_LANGUAGE_RULES_CUSTOM_ID = "lfg:ui-language:rules";
    const LFG_RULES_EMBED_TITLE = "📜 LFG Rules";
    const LFG_STATS_EMBED_TITLE = "🔎 LFG";

    const LFG_STATS_TOTAL_FIELD = "📊 LFGs created";
    const LFG_STATS_OPEN_FIELD = "🟢 Open now";
    const LFG_STATS_READY_FIELD = "✅ Team Ready events";
    const LFG_STATS_LAST_FIELD = "🕒 Last lobby created";

    const LFG_EXPIRY_MINUTES = settings.expiryMinutes;
    const LFG_EXPIRY_MS = LFG_EXPIRY_MINUTES * 60 * 1_000;

    // Keep expired lobby cards visible for the same short grace period as
    // manually closed cards, then remove them from #find-a-team.
    const LFG_EXPIRED_CLEANUP_SECONDS: number = 15;
    const LFG_EXPIRED_CLEANUP_MS = LFG_EXPIRED_CLEANUP_SECONDS * 1_000;

    // Manually closed lobby cards only need a short grace period so users can
    // see that the room was intentionally closed before it disappears.
    const LFG_CLOSED_CLEANUP_SECONDS: number = 15;
    const LFG_CLOSED_CLEANUP_MS = LFG_CLOSED_CLEANUP_SECONDS * 1_000;

    // Team Ready is reversible. Keep those cards around long enough for the host
    // to reopen the same in-game lobby if somebody leaves after the team fills.
    const LFG_TEAM_READY_RETENTION_MINUTES = settings.expiryMinutes;
    const LFG_TEAM_READY_RETENTION_MS = LFG_TEAM_READY_RETENTION_MINUTES * 60 * 1_000;

    const LFG_MAINTENANCE_INTERVAL_MS = 60 * 1_000;
    const LFG_BOOTSTRAP_MAX_MESSAGES = 5000;

    // Backward compatibility only. New cards do not expose metadata in a footer.
    const LEGACY_LFG_FOOTER_REGEX = /^LFG\|(OPEN|CLOSED)\|(\d{17,20})\|([A-Za-z0-9_-]{1,32})$/;

    type LfgStatus = "OPEN" | "CLOSED" | "EXPIRED";

    type LfgMeta = {
        status: LfgStatus;
        hostId: string;
        code: string;
    };

    type LfgDetails = {
        playersNeeded: string;
        language: string;
        region: string;
        microphone: string;
        mode: string;
        notes: string;
    };

    type ActiveLobbyRef = {
        channelId: string;
        messageId: string;
        hostId: string;
        code: string;
    };

    type CreateLobbyResult =
        | {kind: "created"; lobbyPost: Message}
        | {kind: "host-exists"; lobbyPost: Message}
        | {kind: "code-exists"; lobbyPost: Message}
        | {kind: "error"};

    type ExpiredLobbyCleanupRef = ActiveLobbyRef & {
        cleanupAt: number;
    };

    type ClosedLobbyCleanupRef = ActiveLobbyRef & {
        cleanupAt: number;
    };

    const EMPTY_DETAILS: LfgDetails = {
        playersNeeded: "Not specified",
        language: "Not specified",
        region: "Not specified",
        microphone: "Not specified",
        mode: "Not specified",
        notes: "Not specified"
    };

    const LFG_FIELD_NAMES = {
        playersNeeded: "👥 Players needed",
        language: "🗣️ Language",
        region: "🌍 Region",
        microphone: "🎤 Microphone",
        mode: "🎮 Mode",
        notes: "📝 Notes",
        legacyModeNotes: "🎮 Mode / notes"
    } as const;

    const activeLobbyByHost = new Map<string, ActiveLobbyRef>();
    const activeLobbyByCode = new Map<string, ActiveLobbyRef>();
    const expiredLobbyCleanupByMessage = new Map<string, ExpiredLobbyCleanupRef>();
    const closedLobbyCleanupByMessage = new Map<string, ClosedLobbyCleanupRef>();
    const preferredUiLanguageByUser = new Map<string, LfgUiLanguageId>();
    let maintenanceStarted = false;
    let maintenanceRunning = false;

    function lfgTransientErrorDetails(error: unknown): {
        name: string;
        code: string;
        message: string;
    } {
        if (!error || typeof error !== "object") {
            return {
                name: "",
                code: "",
                message: String(error)
            };
        }

        const candidate = error as {
            name?: unknown;
            code?: unknown;
            message?: unknown;
            cause?: unknown;
        };

        const cause =
            candidate.cause && typeof candidate.cause === "object"
                ? (candidate.cause as {
                      name?: unknown;
                      code?: unknown;
                      message?: unknown;
                  })
                : null;

        return {
            name:
                typeof candidate.name === "string" ? candidate.name : typeof cause?.name === "string" ? cause.name : "",
            code:
                typeof candidate.code === "string" ? candidate.code : typeof cause?.code === "string" ? cause.code : "",
            message:
                typeof candidate.message === "string"
                    ? candidate.message
                    : typeof cause?.message === "string"
                      ? cause.message
                      : String(error)
        };
    }

    function isLfgTransientDiscordError(error: unknown): boolean {
        const details = lfgTransientErrorDetails(error);
        const transientCodes = new Set([
            "ECONNRESET",
            "ECONNREFUSED",
            "ETIMEDOUT",
            "EAI_AGAIN",
            "ENETUNREACH",
            "EHOSTUNREACH",
            "UND_ERR_CONNECT_TIMEOUT",
            "UND_ERR_SOCKET"
        ]);

        return (
            details.name === "AbortError" ||
            transientCodes.has(details.code) ||
            /socket disconnected|network|fetch failed|timed? ?out|aborted/i.test(details.message)
        );
    }

    function isUnknownDiscordMessage(error: unknown): boolean {
        if (!error || typeof error !== "object") {
            return false;
        }

        const candidate = error as {
            code?: unknown;
            rawError?: {code?: unknown};
        };

        return candidate.code === 10008 || candidate.rawError?.code === 10008;
    }

    function lfgSleep(ms: number): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(resolve, ms);
            (timeout as unknown as {unref?: () => void}).unref?.();
        });
    }

    async function withLfgDiscordRetry<T>(label: string, operation: () => Promise<T>, attempts = 3): Promise<T> {
        let lastError: unknown;

        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (!isLfgTransientDiscordError(error) || attempt >= attempts) {
                    throw error;
                }

                const delayMs = attempt === 1 ? 1_500 : 4_000;
                console.warn(
                    `[LFG RETRY] ${label} failed transiently (${attempt}/${attempts}); retrying in ${delayMs}ms`
                );
                await lfgSleep(delayMs);
            }
        }

        throw lastError;
    }

    async function getLfgMessageResilient(channel: TextChannel, messageId: string): Promise<Message | null> {
        const cached = channel.messages.cache.get(messageId);

        if (cached) {
            return cached;
        }

        try {
            return await withLfgDiscordRetry(`message fetch ${messageId}`, () => channel.messages.fetch(messageId));
        } catch (error) {
            if (isUnknownDiscordMessage(error)) {
                return null;
            }

            throw error;
        }
    }

    // The stats dashboard message also acts as the persistent counter store.
    // Lobby-Finder parses the counters back from that same embed after restart.
    let lfgStatsMessageId: string | null = null;
    let lifetimeLfgCreated = 0;
    let lifetimeTeamReady = 0;
    let lastLfgCreatedAt: number | null = null;
    let statsPanelInitialized = false;
    let statsRefreshQueue: Promise<void> = Promise.resolve();

    function getInteractionUiLanguage(interaction: Interaction): LfgUiLanguageId {
        return preferredUiLanguageByUser.get(interaction.user.id) ?? uiLanguageFromDiscordLocale(interaction.locale);
    }

    function buildUiLanguageMenu(context: "start" | "rules"): ActionRowBuilder<StringSelectMenuBuilder> {
        const customId = context === "rules" ? LFG_UI_LANGUAGE_RULES_CUSTOM_ID : LFG_UI_LANGUAGE_START_CUSTOM_ID;

        const menu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(
                context === "rules" ? "🌐 Read the rules in your language" : "🌐 View the LFG guide in your language"
            )
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                LFG_LANGUAGE_OPTIONS
                    // Tamil is currently a lobby-language option only. The full LFG help/
                    // rules UI does not have Tamil copy yet, so keep it out of this menu.
                    .filter((option) => option.id !== "ta")
                    .map((option) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(option.label)
                            .setValue(option.id)
                            .setEmoji(option.emoji)
                    )
            );

        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    }

    function formatLocalizedBody(value: string, context: "start" | "rules"): string {
        // Some older generated translation entries contained the two literal
        // characters "\n" instead of a real line break. Normalize both forms.
        const normalized = value.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();

        if (context === "rules") {
            // Rules are easier to scan with a blank line between each bullet.
            return normalized
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .join("\n\n");
        }

        // Preserve the natural paragraph structure of the Start Here guide.
        return normalized
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .join("\n\n");
    }

    function buildLocalizedHelpEmbed(language: LfgUiLanguageId, context: "start" | "rules"): EmbedBuilder {
        const ui = getUiCopy(language);
        const body = context === "rules" ? ui.rulesBody : ui.startBody;

        return new EmbedBuilder()
            .setColor(context === "rules" ? 0x3498db : 0xf5a623)
            .setTitle(context === "rules" ? ui.rulesTitle : ui.startTitle)
            .setDescription(formatLocalizedBody(body, context));
    }

    function normalizeFieldValue(value: string, fallback = "Not specified"): string {
        const trimmed = value.trim();
        return trimmed || fallback;
    }

    function getEmbedFieldValue(message: Message, name: string): string | null {
        const field = message.embeds[0]?.fields.find((entry) => entry.name === name);
        return field?.value ?? null;
    }

    function extractDetails(message: Message): LfgDetails {
        return {
            playersNeeded: getEmbedFieldValue(message, LFG_FIELD_NAMES.playersNeeded) ?? EMPTY_DETAILS.playersNeeded,
            language: getEmbedFieldValue(message, LFG_FIELD_NAMES.language) ?? EMPTY_DETAILS.language,
            region: getEmbedFieldValue(message, LFG_FIELD_NAMES.region) ?? EMPTY_DETAILS.region,
            microphone: getEmbedFieldValue(message, LFG_FIELD_NAMES.microphone) ?? EMPTY_DETAILS.microphone,
            mode: getEmbedFieldValue(message, LFG_FIELD_NAMES.mode) ?? EMPTY_DETAILS.mode,
            notes:
                getEmbedFieldValue(message, LFG_FIELD_NAMES.notes) ??
                getEmbedFieldValue(message, LFG_FIELD_NAMES.legacyModeNotes) ??
                EMPTY_DETAILS.notes
        };
    }

    /**
     * Active cards store ownership in the compact Manage button:
     *   lfg:manage:<HOST_ID>:<LOBBY_CODE>
     *
     * Older active cards used:
     *   lfg:close:<HOST_ID>:<LOBBY_CODE>
     *
     * Team Ready cards use a reversible reopen action:
     *   lfg:reopen:<HOST_ID>:<LOBBY_CODE>
     *
     * Manually closed cards keep a disabled lfg:close button so maintenance can
     * still recognize them, while expired cards use:
     *   lfg:expired:<HOST_ID>:<LOBBY_CODE>
     */
    function parseLfgMeta(message: Message): LfgMeta | null {
        for (const row of message.components) {
            if (!("components" in row)) continue;

            for (const rawComponent of row.components) {
                const component = rawComponent as unknown as {
                    customId?: string | null;
                    disabled?: boolean;
                };

                const customId = component.customId;
                if (typeof customId !== "string") continue;

                if (customId.startsWith("lfg:expired:")) {
                    const parts = customId.split(":");
                    const hostId = parts[2];
                    const code = parts[3];
                    if (hostId && code) {
                        return {status: "EXPIRED", hostId, code};
                    }
                }

                if (customId.startsWith("lfg:reopen:")) {
                    const parts = customId.split(":");
                    const hostId = parts[2];
                    const code = parts[3];
                    if (hostId && code) {
                        // Team Ready is intentionally treated as CLOSED for browsing and
                        // duplicate-active-lobby tracking until the host reopens it.
                        return {status: "CLOSED", hostId, code};
                    }
                }

                if (customId.startsWith("lfg:manage:")) {
                    const parts = customId.split(":");
                    const hostId = parts[2];
                    const code = parts[3];
                    if (hostId && code) {
                        return {status: "OPEN", hostId, code};
                    }
                }

                if (customId.startsWith("lfg:close:")) {
                    const parts = customId.split(":");
                    const hostId = parts[2];
                    const code = parts[3];
                    if (hostId && code) {
                        return {
                            status: component.disabled === true ? "CLOSED" : "OPEN",
                            hostId,
                            code
                        };
                    }
                }
            }
        }

        const footerText = message.embeds[0]?.footer?.text;
        if (!footerText) return null;

        const match = LEGACY_LFG_FOOTER_REGEX.exec(footerText);
        if (!match) return null;

        const status = match[1];
        const hostId = match[2];
        const code = match[3];

        if ((status !== "OPEN" && status !== "CLOSED") || !hostId || !code) {
            return null;
        }

        return {status, hostId, code};
    }

    function getDiscussionUrl(message: Message): string | undefined {
        for (const row of message.components) {
            if (!("components" in row)) continue;

            for (const rawComponent of row.components) {
                const component = rawComponent as unknown as {
                    label?: string | null;
                    url?: string | null;
                    emoji?: {
                        name?: string | null;
                    } | null;
                };

                if (
                    typeof component.url === "string" &&
                    (component.label === "Discussion" || component.emoji?.name === "💬")
                ) {
                    return component.url;
                }
            }
        }

        return undefined;
    }

    function getLobbyActivityTimestamp(message: Message): number {
        const raw = message.embeds[0]?.timestamp;
        if (raw) {
            const parsed = Date.parse(raw);
            if (Number.isFinite(parsed)) return parsed;
        }
        return message.createdTimestamp;
    }

    function getLobbyExpiryTimestamp(message: Message): number {
        return getLobbyActivityTimestamp(message) + LFG_EXPIRY_MS;
    }

    function isLobbyStale(message: Message, now = Date.now()): boolean {
        const meta = parseLfgMeta(message);
        return meta?.status === "OPEN" && now >= getLobbyExpiryTimestamp(message);
    }

    function buildLfgFields(
        _status: LfgStatus,
        details: LfgDetails
    ): {name: string; value: string; inline?: boolean}[] {
        const fields: {name: string; value: string; inline?: boolean}[] = [
            {
                name: LFG_FIELD_NAMES.playersNeeded,
                value: details.playersNeeded,
                inline: true
            },
            {
                name: LFG_FIELD_NAMES.language,
                value: details.language,
                inline: true
            },
            {
                name: LFG_FIELD_NAMES.mode,
                value: details.mode,
                inline: true
            }
        ];

        if (details.notes !== "Not specified") {
            fields.push({
                name: LFG_FIELD_NAMES.notes,
                value: details.notes,
                inline: false
            });
        }

        return fields;
    }

    const LFG_ACTION_LEGEND = "🔐 Reveal Code • 💬 Discussion • ⚙️ Manage • ✅ Team Full • ✖️ Close";

    function buildOpenDescription(_code: string, hostId: string, expiryUnixSeconds: number): string {
        return `**Host:** <@${hostId}> • ⏱️ Expires <t:${expiryUnixSeconds}:R>`;
    }

    function buildOpenEmbed(
        hostName: string,
        hostId: string,
        hostAvatarUrl: string,
        code: string,
        details: LfgDetails = EMPTY_DETAILS
    ): EmbedBuilder {
        const now = new Date();
        const expiryUnix = Math.floor((now.getTime() + LFG_EXPIRY_MS) / 1_000);

        return (
            new EmbedBuilder()
                .setColor(0x57f287)
                .setAuthor({
                    name: `${hostName}'s Lobby`,
                    iconURL: hostAvatarUrl
                })
                // Show the host's Discord avatar as the large thumbnail on the
                // right side of the lobby card as well as the small author icon.
                .setThumbnail(hostAvatarUrl)
                .setDescription(buildOpenDescription(code, hostId, expiryUnix))
                .setFields(buildLfgFields("OPEN", details))
                .setFooter({
                    text: LFG_ACTION_LEGEND
                })
                .setTimestamp(now)
        );
    }

    function buildUpdatedOpenEmbed(
        source: Message,
        hostId: string,
        code: string,
        details: LfgDetails,
        refreshTime?: Date
    ): EmbedBuilder {
        const current = source.embeds[0];
        const embed = current ? EmbedBuilder.from(current) : new EmbedBuilder();

        embed.setFooter({
            text: LFG_ACTION_LEGEND
        });

        if (refreshTime) {
            embed.setTimestamp(refreshTime);
        } else if (!current?.timestamp) {
            embed.setTimestamp(new Date());
        }

        const activityTimestamp = refreshTime ? refreshTime.getTime() : getLobbyActivityTimestamp(source);
        const expiryUnix = Math.floor((activityTimestamp + LFG_EXPIRY_MS) / 1_000);

        embed
            .setColor(0x57f287)
            .setTitle(null)
            .setDescription(buildOpenDescription(code, hostId, expiryUnix))
            .setFields(buildLfgFields("OPEN", details));

        return embed;
    }

    function buildClosedEmbed(source: Message, hostId: string, code: string): EmbedBuilder {
        const details = extractDetails(source);
        const current = source.embeds[0];
        const embed = current ? EmbedBuilder.from(current) : new EmbedBuilder();

        embed.setFooter(null);
        embed
            .setColor(0xed4245)
            .setTitle("🎮 Lobby Closed")
            .setDescription(
                [
                    `# 🔒 ${code}`,
                    "",
                    `**Lobby hosted by:** <@${hostId}>`,
                    "",
                    "This LFG post has been closed by the host or a moderator."
                ].join("\n")
            )
            .setFields(buildLfgFields("CLOSED", details))
            // The embed timestamp becomes the moment the lobby was manually closed.
            // Maintenance uses it for the short closed-card cleanup grace period.
            .setTimestamp(new Date());

        return embed;
    }

    function buildExpiredEmbed(source: Message, hostId: string, code: string): EmbedBuilder {
        const details = extractDetails(source);
        const current = source.embeds[0];
        const embed = current ? EmbedBuilder.from(current) : new EmbedBuilder();

        embed.setFooter(null);
        embed
            .setColor(0x747f8d)
            .setTitle("🎮 Lobby Expired")
            .setDescription(
                [
                    `# ⏱️ ${code}`,
                    "",
                    `**Lobby hosted by:** <@${hostId}>`,
                    "",
                    `This LFG post expired after **${LFG_EXPIRY_MINUTES} minutes** without a lobby update.`,
                    "The host can create a new lobby post with a current in-game Lobby Code."
                ].join("\n")
            )
            .setFields(buildLfgFields("EXPIRED", details))
            // The embed timestamp becomes the moment the card visibly expired.
            // Maintenance uses it to calculate the delayed cleanup time.
            .setTimestamp(new Date());

        return embed;
    }

    function buildOpenButtons(hostId: string, code: string, discussionUrl?: string): ActionRowBuilder<ButtonBuilder> {
        // Compact icon-only action row:
        // 🔐 Reveal Code • 💬 Discussion • ⚙️ Manage • ✅ Team Full • ✖️ Close
        //
        // Discord accepts emoji-only buttons, which keeps the lobby card much
        // narrower and cleaner on both desktop and mobile.
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`lfg:join:${code}`).setEmoji("🔐").setStyle(ButtonStyle.Success)
        );

        if (discussionUrl) {
            row.addComponents(new ButtonBuilder().setEmoji("💬").setStyle(ButtonStyle.Link).setURL(discussionUrl));
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`lfg:manage:${hostId}:${code}`)
                .setEmoji("⚙️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`lfg:full:${hostId}:${code}`).setEmoji("✅").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`lfg:close:${hostId}:${code}`).setEmoji("✖️").setStyle(ButtonStyle.Danger)
        );

        return row;
    }

    function buildOpenComponents(
        hostId: string,
        code: string,
        _details: LfgDetails,
        discussionUrl?: string
    ): ActionRowBuilder<ButtonBuilder>[] {
        // Keep the public lobby card compact. All editable details, including
        // language, are changed from the Edit modal instead of permanent rows.
        return [buildOpenButtons(hostId, code, discussionUrl)];
    }

    function buildTeamReadyFields(details: LfgDetails): {name: string; value: string; inline?: boolean}[] {
        const fields: {name: string; value: string; inline?: boolean}[] = [
            {
                name: LFG_FIELD_NAMES.language,
                value: details.language,
                inline: true
            },
            {
                name: LFG_FIELD_NAMES.mode,
                value: details.mode,
                inline: true
            }
        ];

        if (details.notes !== "Not specified") {
            fields.push({
                name: LFG_FIELD_NAMES.notes,
                value: details.notes,
                inline: false
            });
        }

        return fields;
    }

    function buildTeamFullEmbed(source: Message, hostId: string, code: string): EmbedBuilder {
        const details = extractDetails(source);
        const current = source.embeds[0];
        const embed = current ? EmbedBuilder.from(current) : new EmbedBuilder();

        embed.setFooter(null);
        embed
            .setColor(0x57f287)
            .setTitle(`✅ Team Ready • ${code}`)
            .setDescription(`**Host:** <@${hostId}>`)
            .setFields(buildTeamReadyFields(details))
            .setTimestamp(new Date());

        return embed;
    }

    function buildTeamFullButtons(
        hostId: string,
        code: string,
        discussionUrl?: string
    ): ActionRowBuilder<ButtonBuilder> {
        // Team Ready is reversible: if somebody leaves, the host can reopen this
        // exact card and continue using the same in-game lobby code.
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`lfg:reopen:${hostId}:${code}`)
                .setLabel("Reopen Lobby")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Primary)
        );

        if (discussionUrl) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel("Discussion")
                    .setEmoji("💬")
                    .setStyle(ButtonStyle.Link)
                    .setURL(discussionUrl)
            );
        }

        return row;
    }

    function buildInactiveButtons(
        status: "CLOSED" | "EXPIRED",
        hostId: string,
        code: string,
        discussionUrl?: string
    ): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`lfg:join:${code}`)
                .setLabel(status === "EXPIRED" ? "Lobby Expired" : "Lobby Closed")
                .setEmoji(status === "EXPIRED" ? "⏱️" : "🔒")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        if (discussionUrl) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel("Discussion")
                    .setEmoji("💬")
                    .setStyle(ButtonStyle.Link)
                    .setURL(discussionUrl)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`lfg:edit:${hostId}:${code}`)
                .setLabel("Edit")
                .setEmoji("📝")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            status === "EXPIRED"
                ? new ButtonBuilder()
                      .setCustomId(`lfg:expired:${hostId}:${code}`)
                      .setLabel("Expired")
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(true)
                : new ButtonBuilder()
                      .setCustomId(`lfg:close:${hostId}:${code}`)
                      .setLabel("Closed")
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(true)
        );

        return row;
    }

    function hasComponentCustomId(message: Message, customId: string): boolean {
        for (const row of message.components) {
            if (!("components" in row)) continue;

            for (const rawComponent of row.components) {
                const component = rawComponent as unknown as {
                    customId?: string | null;
                };

                if (component.customId === customId) {
                    return true;
                }
            }
        }

        return false;
    }

    function buildStartHereEmbed(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(0xf5a623)
            .setTitle(`🎮 ${settings.gameName} • Looking for Group`)
            .setDescription(
                [
                    `Find a **${settings.teamSize}-player team** for **${settings.gameName}**.`,
                    "",
                    "### Hosting a lobby?",
                    `Press **Create Lobby** and enter a **${codeLengthDisplay}-character lobby code**. Use letters, numbers, underscores or hyphens; case is preserved.`,
                    "",
                    "### Looking for a team?",
                    "Press **Browse Lobbies** to see the current lobby posts. Use **Reveal Code** for the lobby code and **Discussion** to coordinate with the host.",
                    "",
                    "### Lobby lifecycle",
                    `• One active lobby per host`,
                    `• Lobby cards expire after **${LFG_EXPIRY_MINUTES} minutes** without an update`,
                    `• Using **Manage → Submit** updates the card and resets the ${LFG_EXPIRY_MINUTES}-minute timer`,
                    `• Expired and manually closed cards are cleaned up after **${LFG_EXPIRED_CLEANUP_SECONDS} seconds**`,
                    "• Use **Team Full** when your team is ready, or **Close** when the room is no longer active"
                ].join("\n")
            );
    }

    function buildStartHereButtons(guildId: string): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(LFG_INTERFACE_CREATE_CUSTOM_ID)
                .setLabel("Create Lobby")
                .setEmoji("➕")
                .setStyle(ButtonStyle.Success)
        );

        if (LFG_CHANNEL_ID) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(LFG_BROWSE_CUSTOM_ID)
                    .setLabel("Browse Lobbies")
                    .setEmoji("🔎")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (LFG_RULES_CHANNEL_ID) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel("LFG Rules")
                    .setEmoji("📜")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${guildId}/${LFG_RULES_CHANNEL_ID}`)
            );
        }

        return row;
    }

    function buildRulesEmbed(): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(LFG_RULES_EMBED_TITLE)
            .setDescription(
                "Keep **#find-a-team** useful, current and easy to browse. " +
                    "Create lobby posts only for active rooms."
            )
            .addFields(
                {
                    name: "🔑 Use a current Lobby Code",
                    value:
                        `Only post a current **${codeLengthDisplay}-character lobby code** ` +
                        "for a room that is currently available to join."
                },
                {
                    name: "👤 One active lobby per host",
                    value:
                        "You may have **one active LFG post at a time**. " +
                        "Close your current lobby before creating another one."
                },
                {
                    name: "💬 Use Discussion for chat",
                    value:
                        "**#find-a-team is for lobby cards, not general conversation.** " +
                        "Use the lobby's **Discussion** thread to coordinate with players."
                },
                {
                    name: "📝 Keep lobby details accurate",
                    value:
                        "Use **Manage** to edit **Players needed, Language, Mode and Notes**. " +
                        `Submitting the edit also resets the ${LFG_EXPIRY_MINUTES}-minute activity timer.`
                },
                {
                    name: "⏱️ Active lobby timer",
                    value:
                        `Lobby posts expire after **${LFG_EXPIRY_MINUTES} minutes** without a lobby update. ` +
                        `Expired cards are removed automatically after **${LFG_EXPIRED_CLEANUP_SECONDS} seconds**.`
                },
                {
                    name: "✅ Finish or close the lobby",
                    value:
                        "Press **Team Full** when your team is ready/full. " +
                        "Use **Close** when the in-game lobby is no longer active."
                },
                {
                    name: "🚫 No spam, fake or misleading posts",
                    value:
                        "Do not repeatedly recreate lobbies, post fake codes, impersonate " +
                        "another host, or deliberately provide misleading LFG details."
                },
                {
                    name: "🔒 Privacy & server rules",
                    value:
                        "Never post passwords, login codes, email addresses, API keys, " +
                        "account credentials or other sensitive information.\n\n" +
                        "**All normal Discord server rules also apply here.**"
                }
            );
    }

    function buildRulesButtons(guildId: string): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(LFG_INTERFACE_CREATE_CUSTOM_ID)
                .setLabel("Create Lobby")
                .setEmoji("➕")
                .setStyle(ButtonStyle.Success)
        );

        if (LFG_START_HERE_CHANNEL_ID) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel("Start Here")
                    .setEmoji("📖")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${guildId}/${LFG_START_HERE_CHANNEL_ID}`)
            );
        }

        if (LFG_CHANNEL_ID) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(LFG_BROWSE_CUSTOM_ID)
                    .setLabel("Browse Lobbies")
                    .setEmoji("🔎")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        return row;
    }

    async function ensureLfgRulesInterface(client: Client): Promise<void> {
        if (!LFG_RULES_CHANNEL_ID) {
            console.log("[LFG] LFG_RULES_CHANNEL_ID not set; rules interface skipped");
            return;
        }

        const fetched = await client.channels.fetch(LFG_RULES_CHANNEL_ID).catch(() => null);

        if (!fetched || fetched.type !== ChannelType.GuildText) {
            console.error("[LFG] LFG_RULES_CHANNEL_ID does not point to a guild text channel");
            return;
        }

        const channel = fetched as TextChannel;
        const recent = await channel.messages.fetch({limit: 100});

        const existing = recent.find(
            (entry) =>
                entry.author.id === channel.client.user?.id &&
                entry.embeds.some((embed) => embed.title === LFG_RULES_EMBED_TITLE)
        );

        const payload = {
            embeds: [buildRulesEmbed()],
            components: [buildRulesButtons(channel.guild.id), buildUiLanguageMenu("rules")],
            allowedMentions: {parse: []}
        };

        if (existing) {
            await existing.edit(payload);
            console.log("[LFG] Refreshed existing rules interface");
            return;
        }

        await channel.send(payload);
        console.log("[LFG] Created rules interface");
    }

    function buildCreateLobbyModal(language: LfgUiLanguageId): ModalBuilder {
        const ui = getUiCopy(language);

        const lobbyCodeInput = new TextInputBuilder()
            .setCustomId("lobbyCode")
            .setLabel(ui.codeLabel.slice(0, 45))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Your lobby code")
            .setMinLength(codeMin)
            .setMaxLength(codeMax)
            .setRequired(true);

        return new ModalBuilder()
            .setCustomId(LFG_CREATE_MODAL_CUSTOM_ID)
            .setTitle(ui.createTitle.slice(0, 45))
            .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(lobbyCodeInput));
    }

    async function ensureLfgStartHereInterface(client: Client): Promise<void> {
        if (!LFG_START_HERE_CHANNEL_ID) {
            console.log("[LFG] LFG_START_HERE_CHANNEL_ID not set; start-here interface skipped");
            return;
        }

        const fetched = await client.channels.fetch(LFG_START_HERE_CHANNEL_ID).catch(() => null);

        if (!fetched || fetched.type !== ChannelType.GuildText) {
            console.error("[LFG] LFG_START_HERE_CHANNEL_ID does not point to a guild text channel");
            return;
        }

        const channel = fetched as TextChannel;
        const recent = await channel.messages.fetch({limit: 100});

        const existing = recent.find(
            (entry) =>
                entry.author.id === channel.client.user?.id &&
                hasComponentCustomId(entry, LFG_INTERFACE_CREATE_CUSTOM_ID)
        );

        const payload = {
            embeds: [buildStartHereEmbed()],
            components: [buildStartHereButtons(channel.guild.id), buildUiLanguageMenu("start")],
            allowedMentions: {parse: []}
        };

        if (existing) {
            await existing.edit(payload);
            console.log("[LFG] Refreshed existing start-here interface");
            return;
        }

        await channel.send(payload);
        console.log("[LFG] Created start-here interface");
    }

    function modalValue(value: string, maxLength: number): string | undefined {
        if (!value || value === "Not specified") return undefined;
        return value.slice(0, maxLength);
    }

    function buildEditModal(message: Message, hostId: string, code: string): ModalBuilder {
        const details = extractDetails(message);
        const selectedLanguageId = inferLobbyLanguageId(details.language);

        const playersSelect = new StringSelectMenuBuilder()
            .setCustomId("playersNeeded")
            .setPlaceholder("Choose players needed")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                playersOptions.map((value) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(value)
                        .setValue(value)
                        .setDefault(
                            value ===
                                (playersOptions.includes(details.playersNeeded)
                                    ? details.playersNeeded
                                    : "Not specified")
                        )
                )
            );

        const languageSelect = new StringSelectMenuBuilder()
            .setCustomId("language")
            .setPlaceholder("Choose lobby language")
            .setMinValues(1)
            .setMaxValues(1)
            // Discord string selects allow at most 25 options. LFG_LANGUAGE_OPTIONS
            // now contains exactly 25 real lobby languages, including Tamil. "Any"
            // is kept as a Browse filter state instead of consuming a language slot.
            .addOptions(
                LFG_LANGUAGE_OPTIONS.map((option) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(option.label)
                        .setValue(option.id)
                        .setEmoji(option.emoji)
                        .setDefault(selectedLanguageId === option.id)
                )
            );

        const modeSelect = new StringSelectMenuBuilder()
            .setCustomId("mode")
            .setPlaceholder("Choose game mode")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                modeOptions.map((value) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(value)
                        .setValue(value)
                        .setDefault(value === (modeOptions.includes(details.mode) ? details.mode : "Not specified"))
                )
            );

        const notesInput = new TextInputBuilder()
            .setCustomId("notes")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Example: Beginners welcome, chill run, achievements")
            .setMaxLength(300)
            .setRequired(false);

        const notesValue = modalValue(details.notes, 300);
        if (notesValue) notesInput.setValue(notesValue);

        return new ModalBuilder()
            .setCustomId(`lfg:editmodal:${message.id}:${hostId}:${code}`)
            .setTitle(`Edit Lobby ${code}`)
            .addLabelComponents(
                new LabelBuilder().setLabel("Players needed").setStringSelectMenuComponent(playersSelect),
                new LabelBuilder().setLabel("Language").setStringSelectMenuComponent(languageSelect),
                new LabelBuilder().setLabel("Game mode").setStringSelectMenuComponent(modeSelect),
                new LabelBuilder().setLabel("Notes").setDescription("Optional").setTextInputComponent(notesInput)
            );
    }

    function makeActiveRef(message: Message, meta: LfgMeta): ActiveLobbyRef {
        return {
            channelId: message.channelId,
            messageId: message.id,
            hostId: meta.hostId,
            code: meta.code
        };
    }

    function registerActiveLobby(message: Message, meta?: LfgMeta): void {
        const parsed = meta ?? parseLfgMeta(message);
        if (!parsed || parsed.status !== "OPEN") return;

        const ref = makeActiveRef(message, parsed);
        activeLobbyByHost.set(parsed.hostId, ref);
        activeLobbyByCode.set(parsed.code, ref);
    }

    function unregisterActiveLobby(meta: LfgMeta): void {
        const byHost = activeLobbyByHost.get(meta.hostId);
        if (byHost?.code === meta.code) {
            activeLobbyByHost.delete(meta.hostId);
        }

        const byCode = activeLobbyByCode.get(meta.code);
        if (byCode?.hostId === meta.hostId) {
            activeLobbyByCode.delete(meta.code);
        }
    }

    function getExpiredCleanupTimestamp(message: Message): number {
        // New expired cards are timestamped at the exact moment they expire.
        // Older cards from before this feature may still carry their last activity
        // timestamp; treating that as the expiry timestamp simply makes them clean
        // up sooner after the upgrade, which is safe because they are already expired.
        return getLobbyActivityTimestamp(message) + LFG_EXPIRED_CLEANUP_MS;
    }

    function registerExpiredLobbyCleanup(message: Message, meta?: LfgMeta): void {
        const parsed = meta ?? parseLfgMeta(message);
        if (!parsed || parsed.status !== "EXPIRED") return;

        const cleanupAt = getExpiredCleanupTimestamp(message);

        expiredLobbyCleanupByMessage.set(message.id, {
            channelId: message.channelId,
            messageId: message.id,
            hostId: parsed.hostId,
            code: parsed.code,
            cleanupAt
        });

        // Honor the 15-second expired-card grace period with a one-shot timer.
        // The regular maintenance loop remains as a restart/failure fallback.
        const delay = Math.max(0, cleanupAt - Date.now());
        const timeout = scheduleCleanup(async () => {
            if (message.channel.type !== ChannelType.GuildText) return;

            const freshMessage = await (message.channel as TextChannel).messages.fetch(message.id).catch(() => null);

            if (!freshMessage) {
                unregisterExpiredLobbyCleanup(message.id);
                return;
            }

            await cleanupExpiredLobbyIfDue(freshMessage, Date.now());
        }, delay + 250);

        (timeout as unknown as {unref?: () => void}).unref?.();
    }

    function unregisterExpiredLobbyCleanup(messageId: string): void {
        expiredLobbyCleanupByMessage.delete(messageId);
    }

    async function deleteExpiredLobbyCard(message: Message, meta?: LfgMeta): Promise<boolean> {
        const parsed = meta ?? parseLfgMeta(message);
        if (!parsed || parsed.status !== "EXPIRED") {
            unregisterExpiredLobbyCleanup(message.id);
            return false;
        }

        try {
            // The discussion thread was already locked/archived when the lobby expired.
            // We only remove the stale card from #find-a-team here.
            await message.delete();
            unregisterExpiredLobbyCleanup(message.id);
            console.log(
                `[LFG] Cleaned expired lobby card ${parsed.code} after ${LFG_EXPIRED_CLEANUP_SECONDS} ` +
                    `second${LFG_EXPIRED_CLEANUP_SECONDS === 1 ? "" : "s"}`
            );
            return true;
        } catch (error) {
            console.error(`[LFG] Failed to clean expired lobby card ${parsed.code}:`, error);
            return false;
        }
    }

    async function cleanupExpiredLobbyIfDue(message: Message, now = Date.now()): Promise<boolean> {
        const meta = parseLfgMeta(message);
        if (!meta || meta.status !== "EXPIRED") {
            unregisterExpiredLobbyCleanup(message.id);
            return false;
        }

        const cleanupAt = getExpiredCleanupTimestamp(message);
        if (now < cleanupAt) {
            registerExpiredLobbyCleanup(message, meta);
            return false;
        }

        return deleteExpiredLobbyCard(message, meta);
    }

    function isTeamReadyMessage(message: Message): boolean {
        return message.embeds[0]?.title?.startsWith("✅ Team Ready •") ?? false;
    }

    function getClosedCleanupTimestamp(message: Message): number {
        const retentionMs = isTeamReadyMessage(message) ? LFG_TEAM_READY_RETENTION_MS : LFG_CLOSED_CLEANUP_MS;

        return getLobbyActivityTimestamp(message) + retentionMs;
    }

    function registerClosedLobbyCleanup(message: Message, meta?: LfgMeta): void {
        const parsed = meta ?? parseLfgMeta(message);
        if (!parsed || parsed.status !== "CLOSED") return;

        closedLobbyCleanupByMessage.set(message.id, {
            channelId: message.channelId,
            messageId: message.id,
            hostId: parsed.hostId,
            code: parsed.code,
            cleanupAt: getClosedCleanupTimestamp(message)
        });
    }

    function scheduleClosedLobbyCleanup(message: Message, hostId: string, code: string, closedAt = Date.now()): void {
        const cleanupAt = closedAt + LFG_CLOSED_CLEANUP_MS;

        closedLobbyCleanupByMessage.set(message.id, {
            channelId: message.channelId,
            messageId: message.id,
            hostId,
            code,
            cleanupAt
        });

        // Run a one-shot cleanup so a 15-second grace period is actually honored.
        // The regular maintenance loop remains as a restart/failure fallback.
        const timeout = scheduleCleanup(async () => {
            if (message.channel.type !== ChannelType.GuildText) return;

            const freshMessage = await (message.channel as TextChannel).messages.fetch(message.id).catch(() => null);

            if (!freshMessage) {
                unregisterClosedLobbyCleanup(message.id);
                return;
            }

            await cleanupClosedLobbyIfDue(freshMessage, Date.now());
        }, LFG_CLOSED_CLEANUP_MS + 250);

        (timeout as unknown as {unref?: () => void}).unref?.();
    }

    function unregisterClosedLobbyCleanup(messageId: string): void {
        closedLobbyCleanupByMessage.delete(messageId);
    }

    async function deleteClosedLobbyCard(message: Message, meta?: LfgMeta): Promise<boolean> {
        const parsed = meta ?? parseLfgMeta(message);
        if (!parsed || parsed.status !== "CLOSED") {
            unregisterClosedLobbyCleanup(message.id);
            return false;
        }

        try {
            // The Discussion thread is already locked/archived when Close Lobby is
            // pressed. Only the stale CLOSED card is removed from #find-a-team.
            await message.delete();
            unregisterClosedLobbyCleanup(message.id);

            console.log(
                `[LFG] Cleaned closed lobby card ${parsed.code} after ${LFG_CLOSED_CLEANUP_SECONDS} ` +
                    `second${LFG_CLOSED_CLEANUP_SECONDS === 1 ? "" : "s"}`
            );
            return true;
        } catch (error) {
            console.error(`[LFG] Failed to clean closed lobby card ${parsed.code}:`, error);
            return false;
        }
    }

    async function cleanupClosedLobbyIfDue(message: Message, now = Date.now()): Promise<boolean> {
        const meta = parseLfgMeta(message);
        if (!meta || meta.status !== "CLOSED") {
            unregisterClosedLobbyCleanup(message.id);
            return false;
        }

        const cleanupAt = getClosedCleanupTimestamp(message);
        if (now < cleanupAt) {
            registerClosedLobbyCleanup(message, meta);
            return false;
        }

        return deleteClosedLobbyCard(message, meta);
    }

    async function archiveDiscussionThread(message: Message, code: string, reason: string): Promise<void> {
        if (!message.guild) return;

        const thread = await message.guild.channels.fetch(message.id).catch(() => null);

        if (!thread?.isThread()) return;

        await thread.setLocked(true, reason).catch(() => undefined);
        await thread.setArchived(true, reason).catch(() => undefined);

        console.log(`[LFG] Archived discussion thread for ${code}`);
    }

    async function reopenDiscussionThread(message: Message, code: string, reason: string): Promise<void> {
        if (!message.guild) return;

        const thread = await message.guild.channels.fetch(message.id).catch(() => null);

        if (!thread?.isThread()) return;

        // Unarchive first, then unlock. Keep both operations best-effort so reopening
        // the lobby card still succeeds even if the thread state cannot be changed.
        await thread.setArchived(false, reason).catch(() => undefined);
        await thread.setLocked(false, reason).catch(() => undefined);

        console.log(`[LFG] Reopened discussion thread for ${code}`);
    }

    async function expireLobbyMessage(message: Message): Promise<boolean> {
        const meta = parseLfgMeta(message);
        if (!meta || meta.status !== "OPEN") return false;

        const discussionUrl = getDiscussionUrl(message);

        try {
            const expiredMessage = await message.edit({
                embeds: [buildExpiredEmbed(message, meta.hostId, meta.code)],
                components: [buildInactiveButtons("EXPIRED", meta.hostId, meta.code, discussionUrl)]
            });

            unregisterActiveLobby(meta);
            registerExpiredLobbyCleanup(expiredMessage, {
                status: "EXPIRED",
                hostId: meta.hostId,
                code: meta.code
            });

            await archiveDiscussionThread(expiredMessage, meta.code, `LFG lobby ${meta.code} expired`);

            console.log(
                `[LFG] Expired lobby ${meta.code} after ${LFG_EXPIRY_MINUTES} minutes without a lobby update; ` +
                    `cleanup scheduled in ${LFG_EXPIRED_CLEANUP_SECONDS} ` +
                    `second${LFG_EXPIRED_CLEANUP_SECONDS === 1 ? "" : "s"}`
            );

            if (statsPanelInitialized) {
                await refreshLfgStatsPanel(message.client);
            }

            return true;
        } catch (error) {
            console.error(`[LFG] Failed to expire lobby ${meta.code}:`, error);
            return false;
        }
    }

    async function expireIfStale(message: Message): Promise<boolean> {
        if (!isLobbyStale(message)) return false;
        return expireLobbyMessage(message);
    }

    async function fetchTrackedLobby(channel: TextChannel, ref: ActiveLobbyRef): Promise<Message | null> {
        const message = await channel.messages.fetch(ref.messageId).catch(() => null);
        if (!message) {
            activeLobbyByHost.delete(ref.hostId);
            activeLobbyByCode.delete(ref.code);
            return null;
        }

        const meta = parseLfgMeta(message);
        if (!meta || meta.status !== "OPEN") {
            if (meta) unregisterActiveLobby(meta);
            else {
                activeLobbyByHost.delete(ref.hostId);
                activeLobbyByCode.delete(ref.code);
            }
            return null;
        }

        if (await expireIfStale(message)) return null;
        return message;
    }

    async function findExistingOpenLobby(
        channel: TextChannel,
        hostId: string,
        code: string
    ): Promise<{hostLobby: Message | null; codeLobby: Message | null}> {
        const trackedHost = activeLobbyByHost.get(hostId);
        const trackedCode = activeLobbyByCode.get(code);

        let hostLobby: Message | null = null;
        let codeLobby: Message | null = null;

        if (trackedHost) {
            hostLobby = await fetchTrackedLobby(channel, trackedHost);
        }
        if (trackedCode) {
            codeLobby = await fetchTrackedLobby(channel, trackedCode);
        }

        if (hostLobby || codeLobby) {
            return {hostLobby, codeLobby};
        }

        // Fallback for a recent lobby created before a restart/bootstrap finishes.
        let before: string | undefined;
        let scanned = 0;
        const maxScan = Math.min(LFG_BOOTSTRAP_MAX_MESSAGES, 500);

        while (scanned < maxScan) {
            const batch = before
                ? await channel.messages.fetch({limit: 100, before})
                : await channel.messages.fetch({limit: 100});

            if (batch.size === 0) break;
            scanned += batch.size;

            for (const entry of batch.values()) {
                if (entry.author.id !== channel.client.user?.id) continue;

                const meta = parseLfgMeta(entry);
                if (!meta || meta.status !== "OPEN") continue;

                if (await expireIfStale(entry)) continue;
                registerActiveLobby(entry, meta);

                if (!hostLobby && meta.hostId === hostId) hostLobby = entry;
                if (!codeLobby && meta.code === code) codeLobby = entry;
                if (hostLobby && codeLobby) return {hostLobby, codeLobby};
            }

            const oldest = batch.last();
            if (!oldest || batch.size < 100) break;
            before = oldest.id;
        }

        return {hostLobby, codeLobby};
    }

    type LfgLiveStats = {
        openCount: number;
        languages: Map<string, number>;
        modes: Map<string, number>;
        playersNeeded: Map<string, number>;
    };

    function parseStatsInteger(message: Message, fieldName: string): number | null {
        const value = message.embeds[0]?.fields.find((field) => field.name === fieldName)?.value;

        if (!value) {
            return null;
        }

        const match = value.match(/[\d,]+/);

        if (!match) {
            return null;
        }

        const parsed = Number.parseInt(match[0].replace(/,/g, ""), 10);

        return Number.isFinite(parsed) ? parsed : null;
    }

    function parseStatsTimestamp(message: Message): number | null {
        const value = message.embeds[0]?.fields.find((field) => field.name === LFG_STATS_LAST_FIELD)?.value;

        if (!value) {
            return null;
        }

        const match = value.match(/<t:(\d+):R>/);

        if (!match?.[1]) {
            return null;
        }

        const unix = Number.parseInt(match[1], 10);

        return Number.isFinite(unix) ? unix * 1_000 : null;
    }

    function incrementCount(map: Map<string, number>, rawValue: string): void {
        const value = rawValue.trim();

        if (!value || value === "Not specified") {
            return;
        }

        map.set(value, (map.get(value) ?? 0) + 1);
    }

    async function collectLiveLfgStats(client: Client): Promise<LfgLiveStats> {
        const channel = await getLfgChannel(client);

        const result: LfgLiveStats = {
            openCount: 0,
            languages: new Map(),
            modes: new Map(),
            playersNeeded: new Map()
        };

        if (!channel) {
            return result;
        }

        const refs = Array.from(activeLobbyByHost.values());

        const seen = new Set<string>();

        for (const ref of refs) {
            if (seen.has(ref.messageId)) {
                continue;
            }

            seen.add(ref.messageId);

            const message = await getLfgMessageResilient(channel, ref.messageId);

            if (!message) {
                continue;
            }

            const meta = parseLfgMeta(message);

            if (!meta || meta.status !== "OPEN" || isLobbyStale(message)) {
                continue;
            }

            result.openCount += 1;

            const details = extractDetails(message);

            incrementCount(result.languages, details.language);

            incrementCount(result.modes, details.mode);

            incrementCount(result.playersNeeded, details.playersNeeded);
        }

        return result;
    }

    function formatCountMap(map: Map<string, number>, emptyText: string, limit = 6): string {
        const entries = Array.from(map.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, limit);

        if (entries.length === 0) {
            return emptyText;
        }

        return entries.map(([name, count]) => `${name} — **${count}**`).join("\n");
    }

    function buildLfgStatsEmbed(stats: LfgLiveStats): EmbedBuilder {
        const lastCreated = lastLfgCreatedAt
            ? `<t:${Math.floor(lastLfgCreatedAt / 1_000)}:R>`
            : "No lobby recorded yet";

        return new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(LFG_STATS_EMBED_TITLE)
            .addFields(
                {
                    name: LFG_STATS_TOTAL_FIELD,
                    value: `**${lifetimeLfgCreated.toLocaleString("en-US")}**`,
                    inline: true
                },
                {
                    name: LFG_STATS_OPEN_FIELD,
                    value: `**${stats.openCount}**`,
                    inline: true
                },
                {
                    name: LFG_STATS_READY_FIELD,
                    value: `**${lifetimeTeamReady.toLocaleString("en-US")}**`,
                    inline: true
                },
                {
                    name: "⏱️ Lobby lifetime",
                    value: `**${LFG_EXPIRY_MINUTES} minutes**`,
                    inline: true
                },
                {
                    name: LFG_STATS_LAST_FIELD,
                    value: lastCreated,
                    inline: true
                },
                {
                    name: "👥 Active player demand",
                    value: formatCountMap(stats.playersNeeded, "No active player requests", 4),
                    inline: true
                },
                {
                    name: "🌐 Active lobby languages",
                    value: formatCountMap(stats.languages, "No active lobby languages yet"),
                    inline: true
                },
                {
                    name: "🎮 Active game modes",
                    value: formatCountMap(stats.modes, "No active game modes yet"),
                    inline: true
                }
            )
            .setTimestamp(new Date());
    }

    async function findExistingStatsPanel(channel: TextChannel): Promise<{
        message: Message | null;
        observedLobbies: number;
        observedTeamReady: number;
        observedLastCreatedAt: number | null;
    }> {
        let before: string | undefined;

        let scanned = 0;
        let observedLobbies = 0;
        let observedTeamReady = 0;
        let observedLastCreatedAt: number | null = null;

        while (scanned < LFG_BOOTSTRAP_MAX_MESSAGES) {
            const remaining = LFG_BOOTSTRAP_MAX_MESSAGES - scanned;

            const limit = Math.min(100, remaining);

            const batch = before
                ? await channel.messages.fetch({
                      limit,
                      before
                  })
                : await channel.messages.fetch({
                      limit
                  });

            if (batch.size === 0) {
                break;
            }

            scanned += batch.size;

            for (const entry of batch.values()) {
                if (entry.author.id !== channel.client.user?.id) {
                    continue;
                }

                if (entry.embeds[0]?.title === LFG_STATS_EMBED_TITLE) {
                    return {
                        message: entry,
                        observedLobbies,
                        observedTeamReady,
                        observedLastCreatedAt
                    };
                }

                const meta = parseLfgMeta(entry);

                if (!meta) {
                    continue;
                }

                observedLobbies += 1;

                if (isTeamReadyMessage(entry)) {
                    observedTeamReady += 1;
                }

                observedLastCreatedAt = Math.max(observedLastCreatedAt ?? 0, entry.createdTimestamp);
            }

            const oldest = batch.last();

            if (!oldest || batch.size < limit) {
                break;
            }

            before = oldest.id;
        }

        return {
            message: null,
            observedLobbies,
            observedTeamReady,
            observedLastCreatedAt
        };
    }

    async function refreshLfgStatsPanelNow(client: Client): Promise<void> {
        if (!statsPanelInitialized) {
            return;
        }

        const channel = await getLfgChannel(client);

        if (!channel) {
            return;
        }

        let statsMessage: Message | null = null;

        if (lfgStatsMessageId) {
            statsMessage = await getLfgMessageResilient(channel, lfgStatsMessageId);
        }

        const live = await collectLiveLfgStats(client);

        const payload = {
            embeds: [buildLfgStatsEmbed(live)],
            allowedMentions: {
                parse: []
            }
        };

        if (statsMessage) {
            await withLfgDiscordRetry("stats panel edit", () => statsMessage.edit(payload));

            return;
        }

        const created = await withLfgDiscordRetry("stats panel create", () => channel.send(payload));

        lfgStatsMessageId = created.id;
    }

    function refreshLfgStatsPanel(client: Client): Promise<void> {
        const job = statsRefreshQueue.then(() => refreshLfgStatsPanelNow(client));

        statsRefreshQueue = job.catch((error) => {
            if (isLfgTransientDiscordError(error)) {
                const details = lfgTransientErrorDetails(error);
                console.warn(
                    "[LFG] Stats panel refresh deferred because Discord is temporarily unavailable after retries:",
                    details.code || details.name,
                    details.message
                );
            } else {
                console.error("[LFG] Stats panel refresh failed:", error);
            }
        });

        return job;
    }

    async function ensureLfgStatsInterface(client: Client): Promise<void> {
        const channel = await getLfgChannel(client);

        if (!channel) {
            return;
        }

        const found = await findExistingStatsPanel(channel);

        if (found.message) {
            lfgStatsMessageId = found.message.id;

            lifetimeLfgCreated = parseStatsInteger(found.message, LFG_STATS_TOTAL_FIELD) ?? 0;

            lifetimeTeamReady = parseStatsInteger(found.message, LFG_STATS_READY_FIELD) ?? 0;

            lastLfgCreatedAt = parseStatsTimestamp(found.message);

            console.log(`[LFG] Restored stats dashboard: total=${lifetimeLfgCreated}, teamReady=${lifetimeTeamReady}`);
        } else {
            // Exact older history cannot be reconstructed because expired/closed
            // lobby cards are intentionally removed. Use currently visible/tracked
            // cards as the initial baseline, then count accurately from this point on.
            lifetimeLfgCreated = Math.max(found.observedLobbies, activeLobbyByHost.size);

            lifetimeTeamReady = found.observedTeamReady;

            lastLfgCreatedAt = found.observedLastCreatedAt;

            console.log(`[LFG] Creating stats dashboard with initial baseline total=${lifetimeLfgCreated}`);
        }

        statsPanelInitialized = true;

        await refreshLfgStatsPanel(client);
    }

    async function recordLfgCreated(client: Client, createdAt: number): Promise<void> {
        lifetimeLfgCreated += 1;
        lastLfgCreatedAt = createdAt;

        if (statsPanelInitialized) {
            await refreshLfgStatsPanel(client);
        }
    }

    async function recordTeamReady(client: Client): Promise<void> {
        lifetimeTeamReady += 1;

        if (statsPanelInitialized) {
            await refreshLfgStatsPanel(client);
        }
    }

    async function fetchOpenLobbiesForBrowse(client: Client, filter: LfgLanguageChoiceId): Promise<Message[]> {
        const channel = await getLfgChannel(client);
        if (!channel) return [];

        const results: Message[] = [];
        const seen = new Set<string>();

        for (const ref of activeLobbyByHost.values()) {
            if (seen.has(ref.messageId)) continue;
            seen.add(ref.messageId);

            const message = await channel.messages.fetch(ref.messageId).catch(() => null);

            if (!message) continue;

            const meta = parseLfgMeta(message);
            if (!meta || meta.status !== "OPEN") continue;
            if (await expireIfStale(message)) continue;

            if (filter !== "any") {
                const languageId = inferLobbyLanguageId(extractDetails(message).language);
                if (languageId !== filter) continue;
            }

            results.push(message);
        }

        return results.sort((a, b) => getLobbyActivityTimestamp(b) - getLobbyActivityTimestamp(a)).slice(0, 10);
    }

    function buildBrowseLanguageMenu(
        selected: LfgLanguageChoiceId,
        uiLanguage: LfgUiLanguageId
    ): ActionRowBuilder<StringSelectMenuBuilder> {
        const ui = getUiCopy(uiLanguage);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(LFG_BROWSE_LANGUAGE_CUSTOM_ID)
            .setPlaceholder(`🌐 ${ui.browseFilter}`.slice(0, 150))
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                LFG_LANGUAGE_OPTIONS.map((option) => {
                    const item = new StringSelectMenuOptionBuilder()
                        .setLabel(option.label)
                        .setValue(option.id)
                        .setEmoji(option.emoji);

                    if (selected === option.id) {
                        item.setDefault(true);
                    }

                    return item;
                })
            );

        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    }

    function buildBrowseActionsRow(
        guildId: string,
        selected: LfgLanguageChoiceId,
        uiLanguage: LfgUiLanguageId
    ): ActionRowBuilder<ButtonBuilder> {
        const ui = getUiCopy(uiLanguage);

        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("lfg:browse:any")
                .setLabel("Any language")
                .setEmoji("🌐")
                .setStyle(selected === "any" ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`lfg:browse:refresh:${selected}`)
                .setLabel("Refresh")
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel(ui.openBoard.slice(0, 80))
                .setEmoji("🔎")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${guildId}/${LFG_CHANNEL_ID}`)
        );
    }

    async function buildBrowsePayload(
        client: Client,
        guildId: string,
        selected: LfgLanguageChoiceId,
        uiLanguage: LfgUiLanguageId
    ) {
        const ui = getUiCopy(uiLanguage);
        const lobbies = await fetchOpenLobbiesForBrowse(client, selected);
        const selectedOption = getLanguageOption(selected);

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(ui.browseTitle)
            .setDescription(
                `${ui.browseIntro}\n\n` +
                    `**${ui.browseFilter}:** ${selected === "any" ? "🌐 Any language" : selectedOption.display}\n` +
                    `**Open lobbies:** ${lobbies.length}`
            );

        if (lobbies.length === 0) {
            embed.addFields({
                name: "—",
                value: ui.browseEmpty
            });
        } else {
            for (const message of lobbies) {
                const meta = parseLfgMeta(message);
                if (!meta) continue;

                const details = extractDetails(message);
                embed.addFields({
                    name: `🔑 ${meta.code} • ${details.language}`,
                    value: `👥 ${details.playersNeeded} • 🎮 ${details.mode}\n` + `[Open lobby](${message.url})`
                });
            }
        }

        return {
            embeds: [embed],
            components: [
                buildBrowseLanguageMenu(selected, uiLanguage),
                buildBrowseActionsRow(guildId, selected, uiLanguage)
            ],
            allowedMentions: {parse: []}
        };
    }

    async function createLobbyPostUnsafe(
        channel: TextChannel,
        guildId: string,
        hostId: string,
        hostName: string,
        hostAvatarUrl: string,
        userTag: string,
        code: string
    ): Promise<CreateLobbyResult> {
        try {
            const existing = await findExistingOpenLobby(channel, hostId, code);

            if (existing.hostLobby) {
                return {
                    kind: "host-exists",
                    lobbyPost: existing.hostLobby
                };
            }

            if (existing.codeLobby) {
                return {
                    kind: "code-exists",
                    lobbyPost: existing.codeLobby
                };
            }

            const lobbyPost = await channel.send({
                embeds: [buildOpenEmbed(hostName, hostId, hostAvatarUrl, code)],
                components: buildOpenComponents(hostId, code, EMPTY_DETAILS),
                allowedMentions: {parse: []}
            });

            let discussionUrl: string | undefined;

            try {
                const thread = await lobbyPost.startThread({
                    name: `💬 ${hostName} — ${code}`.slice(0, 100),
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                    reason: `LFG discussion for ${code}`
                });

                discussionUrl = `https://discord.com/channels/${guildId}/${thread.id}`;

                await thread.send({
                    content:
                        `## 🎮 ${hostName}'s Lobby\n\n` +
                        `### 🔑 Lobby Code\n# ${code}\n\n` +
                        "Use this thread to coordinate with the host and other players.",
                    allowedMentions: {parse: []}
                });
            } catch (error) {
                console.error("[LFG] Failed to create discussion thread:", error);
            }

            await lobbyPost.edit({
                components: buildOpenComponents(hostId, code, EMPTY_DETAILS, discussionUrl)
            });

            registerActiveLobby(lobbyPost, {
                status: "OPEN",
                hostId,
                code
            });

            await recordLfgCreated(channel.client, lobbyPost.createdTimestamp).catch((error) => {
                console.error("[LFG] Failed to record created lobby in stats:", error);
            });

            console.log(`[LFG] Created lobby ${code} for ${userTag}`);

            return {
                kind: "created",
                lobbyPost
            };
        } catch (error) {
            console.error("[LFG] Failed to create lobby:", error);
            return {kind: "error"};
        }
    }

    async function getLfgChannel(client: Client): Promise<TextChannel | null> {
        if (!LFG_CHANNEL_ID) return null;

        const fetched = await client.channels.fetch(LFG_CHANNEL_ID).catch(() => null);
        if (!fetched || fetched.type !== ChannelType.GuildText) {
            console.error("[LFG] LFG_CHANNEL_ID does not point to a guild text channel");
            return null;
        }

        return fetched as TextChannel;
    }

    async function bootstrapLfgState(client: Client): Promise<void> {
        const channel = await getLfgChannel(client);
        if (!channel) return;

        activeLobbyByHost.clear();
        activeLobbyByCode.clear();
        expiredLobbyCleanupByMessage.clear();
        closedLobbyCleanupByMessage.clear();

        let before: string | undefined;
        let scanned = 0;
        let active = 0;
        let expired = 0;
        let cleanupQueued = 0;
        let cleaned = 0;

        while (scanned < LFG_BOOTSTRAP_MAX_MESSAGES) {
            const remaining = LFG_BOOTSTRAP_MAX_MESSAGES - scanned;
            const limit = Math.min(100, remaining);
            const batch = before
                ? await channel.messages.fetch({limit, before})
                : await channel.messages.fetch({limit});

            if (batch.size === 0) break;
            scanned += batch.size;

            for (const entry of batch.values()) {
                if (entry.author.id !== channel.client.user?.id) continue;

                const meta = parseLfgMeta(entry);
                if (!meta) continue;

                if (meta.status === "EXPIRED") {
                    if (await cleanupExpiredLobbyIfDue(entry)) {
                        cleaned += 1;
                    } else {
                        cleanupQueued += 1;
                    }
                    continue;
                }

                if (meta.status === "CLOSED") {
                    if (await cleanupClosedLobbyIfDue(entry)) {
                        cleaned += 1;
                    } else {
                        cleanupQueued += 1;
                    }
                    continue;
                }

                if (meta.status !== "OPEN") continue;

                if (await expireIfStale(entry)) {
                    expired += 1;
                    continue;
                }

                // Newest open lobby wins if old duplicate cards somehow exist.
                if (activeLobbyByHost.has(meta.hostId) || activeLobbyByCode.has(meta.code)) {
                    continue;
                }

                registerActiveLobby(entry, meta);
                active += 1;
            }

            const oldest = batch.last();
            if (!oldest || batch.size < limit) break;
            before = oldest.id;
        }

        console.log(
            `[LFG] Bootstrap complete: scanned=${scanned}, active=${active}, expired=${expired}, ` +
                `cleanupQueued=${cleanupQueued}, cleaned=${cleaned}`
        );
    }

    async function runLfgMaintenance(client: Client): Promise<void> {
        if (maintenanceRunning) return;
        maintenanceRunning = true;

        try {
            const channel = await getLfgChannel(client);
            if (!channel) return;

            const refs = Array.from(activeLobbyByCode.values());
            const seen = new Set<string>();

            for (const ref of refs) {
                if (seen.has(ref.messageId)) continue;
                seen.add(ref.messageId);

                const message = await getLfgMessageResilient(channel, ref.messageId);
                if (!message) {
                    activeLobbyByHost.delete(ref.hostId);
                    activeLobbyByCode.delete(ref.code);
                    continue;
                }

                const meta = parseLfgMeta(message);
                if (!meta || meta.status !== "OPEN") {
                    if (meta) unregisterActiveLobby(meta);
                    continue;
                }

                if (isLobbyStale(message)) {
                    await expireLobbyMessage(message);
                }
            }

            // Expired cards stay visible for a short grace period, then disappear.
            // Processing a map of known expired cards avoids repeatedly scanning the
            // whole channel every minute. Bootstrap repopulates this map after restarts.
            const now = Date.now();
            const cleanupRefs = Array.from(expiredLobbyCleanupByMessage.values());

            for (const ref of cleanupRefs) {
                if (now < ref.cleanupAt) continue;

                const message = await getLfgMessageResilient(channel, ref.messageId);

                if (!message) {
                    unregisterExpiredLobbyCleanup(ref.messageId);
                    continue;
                }

                const meta = parseLfgMeta(message);
                if (!meta || meta.status !== "EXPIRED") {
                    unregisterExpiredLobbyCleanup(ref.messageId);
                    continue;
                }

                // Recalculate from the current embed timestamp in case an older card
                // was migrated or its timestamp differs from the cached value.
                const cleanupAt = getExpiredCleanupTimestamp(message);
                if (now < cleanupAt) {
                    expiredLobbyCleanupByMessage.set(ref.messageId, {
                        ...ref,
                        cleanupAt
                    });
                    continue;
                }

                await deleteExpiredLobbyCard(message, meta);
            }

            // Manually closed cards have a short grace period. Team Ready cards are
            // intentionally retained longer so the host can reopen the same lobby if
            // somebody leaves after the team fills.
            const closedCleanupRefs = Array.from(closedLobbyCleanupByMessage.values());

            for (const ref of closedCleanupRefs) {
                if (now < ref.cleanupAt) continue;

                const message = await getLfgMessageResilient(channel, ref.messageId);

                if (!message) {
                    unregisterClosedLobbyCleanup(ref.messageId);
                    continue;
                }

                const meta = parseLfgMeta(message);
                if (!meta || meta.status !== "CLOSED") {
                    unregisterClosedLobbyCleanup(ref.messageId);
                    continue;
                }

                const cleanupAt = getClosedCleanupTimestamp(message);
                if (now < cleanupAt) {
                    closedLobbyCleanupByMessage.set(ref.messageId, {
                        ...ref,
                        cleanupAt
                    });
                    continue;
                }

                await deleteClosedLobbyCard(message, meta);
            }

            if (statsPanelInitialized) {
                await refreshLfgStatsPanel(client);
            }
        } catch (error) {
            if (isLfgTransientDiscordError(error)) {
                const details = lfgTransientErrorDetails(error);
                console.warn(
                    "[LFG] Maintenance paused because Discord is temporarily unavailable after retries:",
                    details.code || details.name,
                    details.message
                );
            } else {
                console.error("[LFG] Maintenance failed:", error);
            }
        } finally {
            maintenanceRunning = false;
        }
    }

    /**
     * Call ONCE from ClientReady.
     * It restores active-lobby state after a restart and expires stale cards.
     */
    async function startLfgMaintenance(client: Client): Promise<void> {
        if (maintenanceStarted) return;
        maintenanceStarted = true;
        await bootstrapLfgState(client);
        await ensureLfgStatsInterface(client);
        await ensureLfgStartHereInterface(client);
        await ensureLfgRulesInterface(client);
        await runLfgMaintenance(client);
        if (stopped) return;
        maintenanceTimer = setInterval(() => {
            if (!stopped) void runLfgMaintenance(client);
        }, LFG_MAINTENANCE_INTERVAL_MS);
        maintenanceTimer.unref();
    }

    async function rejectIfExpired(interaction: Interaction, message: Message, actionName: string): Promise<boolean> {
        if (!isLobbyStale(message)) return false;

        if (interaction.isRepliable()) {
            await interaction
                .reply({
                    content:
                        `⏱️ This lobby expired after ${LFG_EXPIRY_MINUTES} minutes without a lobby update. ` +
                        `It can no longer be ${actionName}.`,
                    ephemeral: true
                })
                .catch(() => undefined);
        }

        await expireLobbyMessage(message);
        return true;
    }

    /** Handles join/manage/edit/refresh/close actions and edit-modal submissions. */
    async function handleLfgInteraction(interaction: Interaction): Promise<boolean> {
        if (
            stopped ||
            interaction.guildId !== settings.guildId ||
            ![settings.boardId, settings.startId, settings.rulesId].includes(interaction.channelId ?? "")
        )
            return false;
        if (interaction.isMessageComponent() && interaction.message.author.id !== interaction.client.user?.id)
            return false;
        if (interaction.isModalSubmit() && interaction.customId === LFG_CREATE_MODAL_CUSTOM_ID) {
            const rawCode = interaction.fields.getTextInputValue("lobbyCode").trim();

            const uiLanguage = getInteractionUiLanguage(interaction);
            const ui = getUiCopy(uiLanguage);

            if (!LOBBY_CODE_VALUE_REGEX.test(rawCode)) {
                await interaction.reply({
                    content: ui.invalidCode,
                    ephemeral: true
                });
                return true;
            }

            if (!interaction.guildId) {
                await interaction.reply({
                    content: "❌ LFG lobby creation only works inside the server.",
                    ephemeral: true
                });
                return true;
            }

            const channel = await getLfgChannel(interaction.client);

            if (!channel) {
                await interaction.reply({
                    content: "❌ I couldn't find the LFG channel. Please tell a moderator.",
                    ephemeral: true
                });
                return true;
            }

            await interaction.deferReply({ephemeral: true});

            const hostName = interaction.user.globalName ?? interaction.user.username;

            const result = await createLobbyPost(
                channel,
                interaction.guildId,
                interaction.user.id,
                hostName,
                interaction.user.displayAvatarURL(),
                interaction.user.tag,
                rawCode
            );

            if (result.kind === "created") {
                await interaction.editReply({
                    content: `${ui.created}\n` + `[${ui.viewLobby}](${result.lobbyPost.url})\n\n` + ui.editHint
                });
                return true;
            }

            if (result.kind === "host-exists") {
                await interaction.editReply({
                    content:
                        `❌ You already have an active lobby: [View lobby](${result.lobbyPost.url})\n` +
                        "Close it before creating another one."
                });
                return true;
            }

            if (result.kind === "code-exists") {
                await interaction.editReply({
                    content: `❌ Lobby code \`${rawCode}\` already has an active LFG post: [View lobby](${result.lobbyPost.url})`
                });
                return true;
            }

            await interaction.editReply({
                content: "❌ I couldn't create that LFG post. Please try again."
            });
            return true;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("lfg:editmodal:")) {
            const parts = interaction.customId.split(":");
            const messageId = parts[2];
            const hostId = parts[3];
            const code = parts[4];

            if (!messageId || !hostId || !code) {
                await interaction.reply({
                    content: "This LFG edit form is missing lobby information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can edit this lobby.",
                    ephemeral: true
                });
                return true;
            }

            if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
                await interaction.reply({
                    content: "I couldn't find the LFG channel for this lobby.",
                    ephemeral: true
                });
                return true;
            }

            const channel = interaction.channel as TextChannel;
            const lobbyPost = await channel.messages.fetch(messageId).catch(() => null);

            if (!lobbyPost) {
                await interaction.reply({
                    content: "I couldn't find that lobby post anymore.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(lobbyPost);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "That lobby is no longer open or its information changed.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, lobbyPost, "edited")) return true;

            const currentDetails = extractDetails(lobbyPost);

            const playersNeeded = interaction.fields.getStringSelectValues("playersNeeded")[0];
            const selectedLanguage = interaction.fields.getStringSelectValues("language")[0];
            const mode = interaction.fields.getStringSelectValues("mode")[0];

            if (!playersNeeded || !playersOptions.includes(playersNeeded)) {
                await interaction.reply({
                    content: "❌ Invalid players-needed selection.",
                    ephemeral: true
                });
                return true;
            }

            if (!mode || !modeOptions.includes(mode)) {
                await interaction.reply({
                    content: "❌ Invalid game-mode selection.",
                    ephemeral: true
                });
                return true;
            }

            if (!selectedLanguage || !isLanguageChoiceId(selectedLanguage)) {
                await interaction.reply({
                    content: "❌ Invalid lobby-language selection.",
                    ephemeral: true
                });
                return true;
            }

            const language = lobbyLanguageDisplay(selectedLanguage);

            const details: LfgDetails = {
                playersNeeded,
                language,
                // Legacy values are retained internally so older cards can still be read
                // during the transition, but Region/Microphone are no longer shown.
                region: currentDetails.region,
                microphone: currentDetails.microphone,
                mode,
                notes: normalizeFieldValue(interaction.fields.getTextInputValue("notes"))
            };

            const discussionUrl = getDiscussionUrl(lobbyPost);
            const refreshTime = new Date();
            const updatedEmbed = buildUpdatedOpenEmbed(lobbyPost, hostId, code, details, refreshTime);
            const updatedComponents = buildOpenComponents(hostId, code, details, discussionUrl);

            // Manage opens this modal directly from the public LFG card. Submitting the
            // modal updates that same card and resets its activity timestamp, so there
            // is no second management card and no separate Refresh action required.
            if (interaction.isFromMessage()) {
                await interaction.update({
                    embeds: [updatedEmbed],
                    components: updatedComponents
                });
            } else {
                // Compatibility fallback if Discord does not associate the modal with
                // its source message for any reason.
                await lobbyPost.edit({
                    embeds: [updatedEmbed],
                    components: updatedComponents
                });
                await interaction.reply({
                    content: `✅ Lobby \`${code}\` updated and refreshed.`,
                    ephemeral: true
                });
            }

            registerActiveLobby(lobbyPost, meta);

            if (statsPanelInitialized) {
                await refreshLfgStatsPanel(interaction.client);
            }

            console.log(`[LFG] Updated + auto-refreshed lobby ${code} by ${interaction.user.tag}`);
            return true;
        }

        if (
            interaction.isStringSelectMenu() &&
            (interaction.customId === LFG_UI_LANGUAGE_START_CUSTOM_ID ||
                interaction.customId === LFG_UI_LANGUAGE_RULES_CUSTOM_ID)
        ) {
            const selected = interaction.values[0];

            if (!selected || !isLanguageChoiceId(selected)) {
                await interaction.reply({
                    content: "❌ Unsupported language selection.",
                    ephemeral: true
                });
                return true;
            }

            const uiLanguage = uiLanguageFromChoice(selected);
            preferredUiLanguageByUser.set(interaction.user.id, uiLanguage);
            const ui = getUiCopy(uiLanguage);
            const context = interaction.customId === LFG_UI_LANGUAGE_RULES_CUSTOM_ID ? "rules" : "start";

            await interaction.reply({
                content: ui.uiSaved,
                embeds: [buildLocalizedHelpEmbed(uiLanguage, context)],
                ephemeral: true,
                allowedMentions: {parse: []}
            });
            return true;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === LFG_BROWSE_LANGUAGE_CUSTOM_ID) {
            const selected = interaction.values[0];

            if (!selected || !isLanguageChoiceId(selected) || !interaction.guildId) {
                await interaction.reply({
                    content: "❌ Invalid lobby-language filter.",
                    ephemeral: true
                });
                return true;
            }

            const uiLanguage = getInteractionUiLanguage(interaction);
            const payload = await buildBrowsePayload(interaction.client, interaction.guildId, selected, uiLanguage);

            await interaction.update(payload);
            return true;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("lfg:players:")) {
            const parts = interaction.customId.split(":");
            const hostId = parts[2];
            const code = parts[3];
            const selectedPlayers = interaction.values[0];

            if (!hostId || !code || !selectedPlayers) {
                await interaction.reply({
                    content: "This players-needed selector is missing lobby information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can change players needed.",
                    ephemeral: true
                });
                return true;
            }

            const validValues = new Set(playersOptions);

            if (!validValues.has(selectedPlayers)) {
                await interaction.reply({
                    content: "That players-needed value is not supported.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "This lobby is already closed or its information changed.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, interaction.message, "changed")) {
                return true;
            }

            const details = extractDetails(interaction.message);
            details.playersNeeded = selectedPlayers;
            const discussionUrl = getDiscussionUrl(interaction.message);

            await interaction.update({
                embeds: [buildUpdatedOpenEmbed(interaction.message, hostId, code, details)],
                components: buildOpenComponents(hostId, code, details, discussionUrl)
            });

            registerActiveLobby(interaction.message, meta);
            return true;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("lfg:microphone:")) {
            const parts = interaction.customId.split(":");
            const hostId = parts[2];
            const code = parts[3];
            const selectedMicrophone = interaction.values[0];

            if (!hostId || !code || !selectedMicrophone) {
                await interaction.reply({
                    content: "This microphone selector is missing lobby information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can change the microphone preference.",
                    ephemeral: true
                });
                return true;
            }

            const validValues = new Set(["Required", "Preferred", "Not required", "Not specified"]);

            if (!validValues.has(selectedMicrophone)) {
                await interaction.reply({
                    content: "That microphone preference is not supported.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "This lobby is already closed or its information changed.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, interaction.message, "changed")) {
                return true;
            }

            const details = extractDetails(interaction.message);
            details.microphone = selectedMicrophone;
            const discussionUrl = getDiscussionUrl(interaction.message);

            await interaction.update({
                embeds: [buildUpdatedOpenEmbed(interaction.message, hostId, code, details)],
                components: buildOpenComponents(hostId, code, details, discussionUrl)
            });

            registerActiveLobby(interaction.message, meta);
            return true;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("lfg:language:")) {
            const parts = interaction.customId.split(":");
            const hostId = parts[2];
            const code = parts[3];
            const selected = interaction.values[0];

            if (!hostId || !code || !selected || !isLanguageChoiceId(selected)) {
                await interaction.reply({
                    content: "This lobby language selector is missing information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can change the lobby language.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "This lobby is already closed or its information changed.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, interaction.message, "changed")) {
                return true;
            }

            const details = extractDetails(interaction.message);
            details.language = lobbyLanguageDisplay(selected);
            const discussionUrl = getDiscussionUrl(interaction.message);

            await interaction.update({
                embeds: [buildUpdatedOpenEmbed(interaction.message, hostId, code, details)],
                components: buildOpenComponents(hostId, code, details, discussionUrl)
            });

            registerActiveLobby(interaction.message, meta);
            return true;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("lfg:mode:")) {
            const parts = interaction.customId.split(":");
            const hostId = parts[2];
            const code = parts[3];
            const selectedMode = interaction.values[0];

            if (!hostId || !code || !selectedMode) {
                await interaction.reply({
                    content: "This lobby mode selector is missing information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can change the lobby mode.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "This lobby is already closed or its information changed.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, interaction.message, "changed")) {
                return true;
            }

            const validModes = new Set(modeOptions);

            if (!validModes.has(selectedMode)) {
                await interaction.reply({
                    content: "That lobby mode is not supported.",
                    ephemeral: true
                });
                return true;
            }

            const details = extractDetails(interaction.message);
            details.mode = selectedMode;
            const discussionUrl = getDiscussionUrl(interaction.message);

            await interaction.update({
                embeds: [buildUpdatedOpenEmbed(interaction.message, hostId, code, details)],
                components: buildOpenComponents(hostId, code, details, discussionUrl)
            });

            registerActiveLobby(interaction.message, meta);
            return true;
        }

        if (interaction.isButton() && interaction.customId === LFG_INTERFACE_CREATE_CUSTOM_ID) {
            await interaction.showModal(buildCreateLobbyModal(getInteractionUiLanguage(interaction)));
            return true;
        }

        if (interaction.isButton() && interaction.customId === "lfg:browse:any") {
            if (!interaction.guildId) {
                await interaction.reply({
                    content: "❌ LFG browsing only works inside the server.",
                    ephemeral: true
                });
                return true;
            }

            const uiLanguage = getInteractionUiLanguage(interaction);
            const payload = await buildBrowsePayload(interaction.client, interaction.guildId, "any", uiLanguage);

            await interaction.update(payload);
            return true;
        }

        if (interaction.isButton() && interaction.customId.startsWith("lfg:browse:refresh:")) {
            if (!interaction.guildId) {
                await interaction.reply({
                    content: "❌ LFG browsing only works inside the server.",
                    ephemeral: true
                });
                return true;
            }

            const selected = interaction.customId.split(":")[3];

            if (!selected || !isLanguageChoiceId(selected)) {
                await interaction.reply({
                    content: "❌ Invalid lobby-language filter.",
                    ephemeral: true
                });
                return true;
            }

            const uiLanguage = getInteractionUiLanguage(interaction);
            const payload = await buildBrowsePayload(interaction.client, interaction.guildId, selected, uiLanguage);

            await interaction.update(payload);
            return true;
        }

        if (interaction.isButton() && interaction.customId === LFG_BROWSE_CUSTOM_ID) {
            if (!interaction.guildId) {
                await interaction.reply({
                    content: "❌ LFG browsing only works inside the server.",
                    ephemeral: true
                });
                return true;
            }

            const uiLanguage = getInteractionUiLanguage(interaction);
            const payload = await buildBrowsePayload(interaction.client, interaction.guildId, "any", uiLanguage);

            await interaction.reply({
                ...payload,
                ephemeral: true
            });
            return true;
        }

        if (!interaction.isButton()) return false;
        if (!interaction.customId.startsWith("lfg:")) return false;

        const parts = interaction.customId.split(":");
        const action = parts[1];

        if (action === "join") {
            const code = parts[2];
            if (!code) {
                await interaction.reply({
                    content: "This lobby code is missing or invalid.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN") {
                await interaction.reply({
                    content: "This lobby is no longer open.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, interaction.message, "joined")) {
                return true;
            }

            // Reveal the code privately. The fenced block keeps Discord's native
            // copy control available without exposing the lobby code on the public card.
            await interaction.reply({
                content: `🔑 **LOBBY CODE:**\n\`\`\`\n${code}\n\`\`\``,
                ephemeral: true,
                allowedMentions: {parse: []}
            });
            return true;
        }

        if (action === "manage") {
            const hostId = parts[2];
            const code = parts[3];

            if (!hostId || !code) {
                await interaction.reply({
                    content: "This LFG post is missing its ownership information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can manage this lobby.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "This lobby is already closed or expired.",
                    ephemeral: true
                });
                return true;
            }

            if (await rejectIfExpired(interaction, interaction.message, "edited")) {
                return true;
            }

            // No second management card: Manage opens Edit Lobby immediately.
            await interaction.showModal(buildEditModal(interaction.message, hostId, code));
            return true;
        }

        if (action === "reopen") {
            const hostId = parts[2];
            const code = parts[3];

            if (!hostId || !code) {
                await interaction.reply({
                    content: "This Team Ready post is missing its ownership information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: "Only the lobby host can reopen this lobby.",
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (
                !meta ||
                meta.status !== "CLOSED" ||
                meta.hostId !== hostId ||
                meta.code !== code ||
                !isTeamReadyMessage(interaction.message)
            ) {
                await interaction.reply({
                    content: "This lobby is not in a reopenable Team Ready state.",
                    ephemeral: true
                });
                return true;
            }

            const existingByHost = activeLobbyByHost.get(hostId);
            if (existingByHost && existingByHost.messageId !== interaction.message.id) {
                await interaction.reply({
                    content: "You already have another active LFG lobby. Close that lobby before reopening this one.",
                    ephemeral: true
                });
                return true;
            }

            const existingByCode = activeLobbyByCode.get(code);
            if (existingByCode && existingByCode.messageId !== interaction.message.id) {
                await interaction.reply({
                    content: `Lobby code \`${code}\` is already being advertised by another active LFG post.`,
                    ephemeral: true
                });
                return true;
            }

            const currentDetails = extractDetails(interaction.message);
            const details: LfgDetails = {
                ...currentDetails,
                // The most common reason to undo Team Full is that one player left. The
                // host can immediately change this through Manage if more slots reopened.
                playersNeeded: "1 player"
            };
            const discussionUrl = getDiscussionUrl(interaction.message);
            const refreshTime = new Date();

            await interaction.update({
                embeds: [buildUpdatedOpenEmbed(interaction.message, hostId, code, details, refreshTime)],
                components: buildOpenComponents(hostId, code, details, discussionUrl)
            });

            unregisterClosedLobbyCleanup(interaction.message.id);
            registerActiveLobby(interaction.message, {
                status: "OPEN",
                hostId,
                code
            });

            await reopenDiscussionThread(interaction.message, code, `LFG lobby ${code} reopened after Team Ready`);

            if (statsPanelInitialized) {
                await refreshLfgStatsPanel(interaction.client);
            }

            console.log(`[LFG] Reopened Team Ready lobby ${code} by ${interaction.user.tag}`);
            return true;
        }

        if (action === "edit" || action === "refresh" || action === "full" || action === "close") {
            const hostId = parts[2];
            const code = parts[3];

            if (!hostId || !code) {
                await interaction.reply({
                    content: "This LFG post is missing its ownership information.",
                    ephemeral: true
                });
                return true;
            }

            if (interaction.user.id !== hostId) {
                await interaction.reply({
                    content: `Only the lobby host can ${action} this lobby.`,
                    ephemeral: true
                });
                return true;
            }

            const meta = parseLfgMeta(interaction.message);
            if (!meta || meta.status !== "OPEN" || meta.hostId !== hostId || meta.code !== code) {
                await interaction.reply({
                    content: "This lobby is already closed, expired, or its ownership information changed.",
                    ephemeral: true
                });
                return true;
            }

            if (
                await rejectIfExpired(
                    interaction,
                    interaction.message,
                    action === "refresh"
                        ? "refreshed"
                        : action === "edit"
                          ? "edited"
                          : action === "full"
                            ? "marked full"
                            : "closed"
                )
            ) {
                return true;
            }

            if (action === "edit") {
                await interaction.showModal(buildEditModal(interaction.message, hostId, code));
                return true;
            }

            if (action === "refresh") {
                const details = extractDetails(interaction.message);
                const discussionUrl = getDiscussionUrl(interaction.message);
                const refreshTime = new Date();
                const refreshedEmbed = buildUpdatedOpenEmbed(interaction.message, hostId, code, details, refreshTime);

                await interaction.update({
                    embeds: [refreshedEmbed],
                    components: buildOpenComponents(hostId, code, details, discussionUrl)
                });

                registerActiveLobby(interaction.message, meta);

                const nextExpiryUnix = Math.floor((refreshTime.getTime() + LFG_EXPIRY_MS) / 1_000);
                await interaction.followUp({
                    content: `🔄 Lobby \`${code}\` refreshed. It will expire <t:${nextExpiryUnix}:R> unless refreshed again.`,
                    ephemeral: true
                });

                console.log(`[LFG] Refreshed lobby ${code} by ${interaction.user.tag}`);
                return true;
            }

            const discussionUrl = getDiscussionUrl(interaction.message);

            if (action === "full") {
                const fullPost = await interaction.message.edit({
                    embeds: [buildTeamFullEmbed(interaction.message, hostId, code)],
                    components: [buildTeamFullButtons(hostId, code, discussionUrl)]
                });

                unregisterActiveLobby(meta);
                registerClosedLobbyCleanup(fullPost, {
                    status: "CLOSED",
                    hostId,
                    code
                });

                await archiveDiscussionThread(fullPost, code, `LFG lobby ${code} team ready`);

                await interaction.reply({
                    content: `✅ Lobby \`${code}\` marked **Team Full**.`,
                    ephemeral: true
                });

                await recordTeamReady(interaction.client).catch((error) => {
                    console.error("[LFG] Failed to record Team Ready event in stats:", error);
                });

                console.log(`[LFG] Marked lobby ${code} team full by ${interaction.user.tag}`);
                return true;
            }

            const closedEmbed = buildClosedEmbed(interaction.message, hostId, code);

            await interaction.update({
                embeds: [closedEmbed],
                components: [buildInactiveButtons("CLOSED", hostId, code, discussionUrl)]
            });

            unregisterActiveLobby(meta);
            scheduleClosedLobbyCleanup(interaction.message, hostId, code);

            await archiveDiscussionThread(interaction.message, code, `LFG lobby ${code} closed`);

            if (statsPanelInitialized) {
                await refreshLfgStatsPanel(interaction.client);
            }

            console.log(
                `[LFG] Closed lobby ${code} by ${interaction.user.tag}; ` +
                    `card cleanup scheduled in ${LFG_CLOSED_CLEANUP_SECONDS} ` +
                    `second${LFG_CLOSED_CLEANUP_SECONDS === 1 ? "" : "s"}`
            );
            return true;
        }

        return false;
    }

    let creationQueue: Promise<void> = Promise.resolve();
    async function createLobbyPost(...args: Parameters<typeof createLobbyPostUnsafe>): Promise<CreateLobbyResult> {
        const previous = creationQueue;
        let release!: () => void;
        creationQueue = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            return await createLobbyPostUnsafe(...args);
        } finally {
            release();
        }
    }
    return {
        start: startLfgMaintenance,
        handle: handleLfgInteraction,
        stop() {
            stopped = true;
            if (maintenanceTimer) clearInterval(maintenanceTimer);
            for (const timer of cleanupTimers) clearTimeout(timer);
            cleanupTimers.clear();
        }
    };
}
