import {ApplicationIntegrationType, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder} from "discord.js";
export function buildCommands(userInstall: boolean) {
    const setup = new SlashCommandBuilder()
        .setName("lfg-setup")
        .setDescription("Create or update this server's lobby board")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .setContexts(InteractionContextType.Guild)
        .addStringOption((o) => o.setName("game").setDescription("Game or community name").setMaxLength(60))
        .addIntegerOption((o) =>
            o
                .setName("team-size")
                .setDescription("Total players including the host (default 4)")
                .setMinValue(2)
                .setMaxValue(25)
        )
        .addStringOption((o) =>
            o.setName("modes").setDescription("Comma-separated modes, such as Casual, Ranked, Co-op").setMaxLength(980)
        )
        .addIntegerOption((o) =>
            o
                .setName("expiry")
                .setDescription("Minutes before an inactive lobby expires (default 30)")
                .setMinValue(5)
                .setMaxValue(1440)
        )
        .addIntegerOption((o) =>
            o
                .setName("code-length")
                .setDescription("Exact code length, or 0 for flexible 1–32 characters")
                .setMinValue(0)
                .setMaxValue(32)
        );
    const help = new SlashCommandBuilder()
        .setName("lfg-help")
        .setDescription("How to use Lobby-Finder and add it to a server")
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall,
            ...(userInstall ? [ApplicationIntegrationType.UserInstall] : [])
        )
        .setContexts(
            InteractionContextType.Guild,
            ...(userInstall ? [InteractionContextType.BotDM, InteractionContextType.PrivateChannel] : [])
        );
    const remove = new SlashCommandBuilder()
        .setName("lfg-disable")
        .setDescription("Stop this server's lobby board and remove its saved settings")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .setContexts(InteractionContextType.Guild)
        .addBooleanOption((o) =>
            o
                .setName("confirm")
                .setDescription("Confirm disabling LFG; existing Discord messages/channels remain")
                .setRequired(true)
        );
    return [setup.toJSON(), help.toJSON(), remove.toJSON()];
}
