import {ChannelType, PermissionFlagsBits, type Client} from "discord.js";
import type {GuildSettings} from "./config.js";
export const boardPermissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.CreatePublicThreads,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.ManageThreads
];
export const installPermissions = [...boardPermissions, PermissionFlagsBits.ManageChannels];
export async function checkChannels(client: Client<true>, config: GuildSettings): Promise<void> {
    const guild = await client.guilds.fetch(config.guildId);
    const me = await guild.members.fetchMe();
    for (const id of [config.boardId, config.startId, config.rulesId]) {
        const channel = await client.channels.fetch(id);
        if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== config.guildId)
            throw new Error("An LFG channel is missing, has the wrong type, or belongs to another server.");
        const required = id === config.boardId ? boardPermissions : boardPermissions.slice(0, 4);
        if (!channel.permissionsFor(me)?.has(required))
            throw new Error(
                `Missing permissions in #${channel.name}. Restore the bot's View Channel, Send Messages, Embed Links, Read Message History and thread permissions.`
            );
    }
}
