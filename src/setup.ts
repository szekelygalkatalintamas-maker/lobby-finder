import {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
    type GuildChannelCreateOptions,
    type GuildChannel
} from "discord.js";
import {defaults, validateGameSettings, type GuildSettings} from "./config.js";
import {installPermissions} from "./preflight.js";
import type {GuildStore} from "./store.js";
import type {LfgRegistry} from "./registry.js";

export async function configureServer(
    interaction: ChatInputCommandInteraction,
    store: GuildStore,
    registry: LfgRegistry
): Promise<void> {
    if (!interaction.inCachedGuild() || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: "You need Manage Server permission to set up Lobby-Finder.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    await interaction.deferReply({flags: MessageFlags.Ephemeral});
    const existing = store.get(interaction.guildId);
    const game = {
        gameName: interaction.options.getString("game")?.trim() ?? existing?.gameName ?? defaults.gameName,
        teamSize: interaction.options.getInteger("team-size") ?? existing?.teamSize ?? defaults.teamSize,
        modes:
            interaction.options
                .getString("modes")
                ?.split(",")
                .map((x) => x.trim()) ??
            existing?.modes ??
            defaults.modes,
        expiryMinutes: interaction.options.getInteger("expiry") ?? existing?.expiryMinutes ?? defaults.expiryMinutes,
        codeLength: interaction.options.getInteger("code-length") ?? existing?.codeLength ?? defaults.codeLength
    };
    validateGameSettings(game);
    let config: GuildSettings;
    if (existing) {
        config = {...existing, ...game};
        // Existing channels are reused; setup never deletes a community's channels.
        for (const id of [existing.boardId, existing.startId, existing.rulesId]) {
            const channel = await interaction.guild.channels.fetch(id);
            if (!channel || channel.type !== ChannelType.GuildText)
                throw new Error(
                    "An LFG channel was deleted. Use /lfg-disable confirm:true, then /lfg-setup to create a new board."
                );
        }
        await store.save(config);
    } else {
        const me = await interaction.guild.members.fetchMe();
        if (!me.permissions.has(installPermissions))
            throw new Error(
                "The bot needs Manage Channels plus channel and thread permissions. Reinvite it using the Add to Server link in /lfg-help."
            );
        const created: GuildChannel[] = [];
        try {
            const category = await interaction.guild.channels.create({
                name: "Lobby Finder",
                type: ChannelType.GuildCategory,
                reason: "Lobby-Finder setup requested by a server manager"
            });
            created.push(category);
            const createText = async (name: string) => {
                const options: GuildChannelCreateOptions = {
                    name,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guildId,
                            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads],
                            allow: [PermissionFlagsBits.SendMessagesInThreads]
                        },
                        {id: me.id, allow: installPermissions}
                    ],
                    reason: "Lobby-Finder setup requested by a server manager"
                };
                const channel = await interaction.guild.channels.create(options);
                created.push(channel);
                return channel.id;
            };
            const startId = await createText("lfg-start-here");
            const boardId = await createText("find-a-team");
            const rulesId = await createText("lfg-rules");
            config = {guildId: interaction.guildId, categoryId: category.id, startId, boardId, rulesId, ...game};
            await store.save(config);
        } catch (error) {
            for (const channel of created.reverse())
                await channel.delete("Rolling back incomplete Lobby-Finder setup").catch(() => undefined);
            throw error;
        }
    }
    try {
        await registry.start(config);
    } catch (error) {
        throw new Error(
            `Settings saved, but the lobby board could not start. Restore permissions and run /lfg-setup again. ${error instanceof Error ? error.message : ""}`
        );
    }
    await interaction.editReply({
        content: `✅ **${config.gameName}** is ready in <#${config.startId}>.\nTeams: **${config.teamSize}** · Modes: **${config.modes.join(", ")}** · Expiry: **${config.expiryMinutes} minutes**\nRun /lfg-setup again to change these settings.`
    });
}
