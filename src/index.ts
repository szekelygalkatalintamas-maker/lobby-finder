import {
    Client,
    Events,
    GatewayIntentBits,
    MessageFlags,
    PermissionFlagsBits,
    PermissionsBitField,
    type Interaction
} from "discord.js";
import {readConfig} from "./config.js";
import {buildCommands} from "./commands.js";
import {GuildStore} from "./store.js";
import {LfgRegistry} from "./registry.js";
import {configureServer} from "./setup.js";
import {installPermissions} from "./preflight.js";

const config = readConfig();
const store = new GuildStore(config.dataDir);
await store.load();
const client = new Client({intents: [GatewayIntentBits.Guilds], allowedMentions: {parse: [], repliedUser: false}});
let registry: LfgRegistry | undefined;
const changing = new Set<string>();
let started = false;

client.once(Events.ClientReady, async (readyClient) => {
    registry = new LfgRegistry(readyClient);
    try {
        // Upsert only this bot's commands, leaving unrelated application commands alone.
        for (const command of buildCommands(config.userInstall)) await readyClient.application.commands.create(command);
        for (const settings of store.all()) {
            if (!readyClient.guilds.cache.has(settings.guildId)) {
                await store.remove(settings.guildId);
                continue;
            }
            try {
                await registry.start(settings);
            } catch (error) {
                console.error(
                    `[${settings.guildId}] Board startup failed:`,
                    error instanceof Error ? error.message : "Unknown error"
                );
            }
        }
        started = true;
        console.log(`Lobby-Finder online as ${readyClient.user.tag}; ${store.all().length} configured servers.`);
    } catch (error) {
        console.error("Startup failed:", error instanceof Error ? error.message : "Unknown error");
        await registry.stopAll();
        await client.destroy();
        process.exitCode = 1;
    }
});

async function tell(interaction: Interaction, content: string) {
    if (!interaction.isRepliable()) return;
    if (interaction.deferred) await interaction.editReply({content});
    else if (!interaction.replied) await interaction.reply({content, flags: MessageFlags.Ephemeral});
}

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (!started || !registry) {
            await tell(interaction, "Lobby-Finder is starting. Try again shortly.");
            return;
        }
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === "lfg-help") {
                const permissions = new PermissionsBitField(installPermissions).bitfield.toString();
                const invite = `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&scope=bot%20applications.commands&permissions=${permissions}&integration_type=0`;
                const saved = interaction.guildId ? store.get(interaction.guildId) : undefined;
                await tell(
                    interaction,
                    `**Lobby-Finder**\n[Add to a server](${invite}), then a server manager runs **/lfg-setup**.\n${saved ? `Open <#${saved.startId}> to create or browse lobbies.` : "Choose your game, team size and modes during setup."}\n\nUser Install provides this help command. Shared lobby boards need the bot installed in the server.\nCodes are supplied by hosts; the bot cannot verify rooms inside a game.`
                );
                return;
            }
            if (!["lfg-setup", "lfg-disable"].includes(interaction.commandName)) return;
            if (!interaction.inCachedGuild() || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
                await tell(
                    interaction,
                    "You need Manage Server permission in a server where Lobby-Finder is installed."
                );
                return;
            }
            if (changing.has(interaction.guildId)) {
                await tell(interaction, "Setup is already running for this server. Please wait.");
                return;
            }
            changing.add(interaction.guildId);
            try {
                if (interaction.commandName === "lfg-setup") await configureServer(interaction, store, registry);
                else {
                    if (!interaction.options.getBoolean("confirm", true)) {
                        await tell(interaction, "Nothing changed. Set confirm to true to disable LFG.");
                        return;
                    }
                    await interaction.deferReply({flags: MessageFlags.Ephemeral});
                    await registry.stop(interaction.guildId);
                    await store.remove(interaction.guildId);
                    await tell(
                        interaction,
                        "LFG is disabled and this server's saved settings are removed. Existing Discord channels, cards and threads remain for your moderators to manage."
                    );
                }
            } finally {
                changing.delete(interaction.guildId);
            }
            return;
        }
        if (
            !(interaction.isMessageComponent() || interaction.isModalSubmit()) ||
            !interaction.customId.startsWith("lfg:")
        )
            return;
        if (interaction.guildId && changing.has(interaction.guildId)) {
            await tell(interaction, "This server's lobby board is being updated. Please try again shortly.");
            return;
        }
        if (!(await registry.handle(interaction)))
            await tell(interaction, "This lobby board is unavailable. Ask a server manager to run /lfg-setup.");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("LFG action failed:", message);
        await tell(interaction, `The action could not finish. ${message.slice(0, 1200)}`).catch(() => undefined);
    }
});

client.on(Events.GuildDelete, (guild) => {
    if (!guild.available) return;
    void (async () => {
        await registry?.stop(guild.id);
        await store.remove(guild.id);
    })().catch((error) => console.error("Server cleanup failed:", error.message));
});
client.on(Events.Error, (error) => console.error("Discord client error:", error.message));
for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
        void (async () => {
            await registry?.stopAll();
            await client.destroy();
        })();
    });
await client.login(config.token).catch(async (error: unknown) => {
    console.error("Discord login failed:", error instanceof Error ? error.message : "Unknown error");
    await client.destroy();
    process.exitCode = 1;
});
