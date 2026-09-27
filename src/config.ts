import path from "node:path";
export type BotConfig = {token: string; dataDir: string; userInstall: boolean};
export type GuildSettings = {
    guildId: string;
    boardId: string;
    startId: string;
    rulesId: string;
    categoryId: string;
    gameName: string;
    teamSize: number;
    modes: string[];
    expiryMinutes: number;
    codeLength: number;
};
export const defaults = {
    gameName: "Any game",
    teamSize: 4,
    modes: ["Casual", "Competitive", "Co-op"],
    expiryMinutes: 30,
    codeLength: 0
};
export function readConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
    const token = env["DISCORD_TOKEN"]?.trim();
    if (!token || token.startsWith("replace_with_"))
        throw new Error("Set DISCORD_TOKEN in .env or your host's secret settings.");
    const userInstall = env["USER_INSTALL_ENABLED"] ?? "false";
    if (!["true", "false"].includes(userInstall)) throw new Error("USER_INSTALL_ENABLED must be true or false.");
    return {token, dataDir: path.resolve(env["DATA_DIR"] || "data"), userInstall: userInstall === "true"};
}
export function validateGameSettings(
    input: Pick<GuildSettings, "gameName" | "teamSize" | "modes" | "expiryMinutes" | "codeLength">
): void {
    if (
        typeof input.gameName !== "string" ||
        !input.gameName.trim() ||
        input.gameName.length > 60 ||
        /[\n\r<>@]/.test(input.gameName)
    )
        throw new Error("Game name must be 1–60 characters without mentions or line breaks.");
    if (!Number.isInteger(input.teamSize) || input.teamSize < 2 || input.teamSize > 25)
        throw new Error("Team size must be between 2 and 25.");
    if (
        !Array.isArray(input.modes) ||
        input.modes.length < 1 ||
        input.modes.length > 24 ||
        input.modes.some(
            (mode) =>
                typeof mode !== "string" ||
                !mode.trim() ||
                mode.length > 40 ||
                /[\n\r<>@]/.test(mode) ||
                mode === "Not specified"
        ) ||
        new Set(input.modes).size !== input.modes.length
    )
        throw new Error("Provide 1–24 different modes, each 1–40 characters; 'Not specified' is reserved.");
    if (!Number.isInteger(input.expiryMinutes) || input.expiryMinutes < 5 || input.expiryMinutes > 1440)
        throw new Error("Expiry must be 5–1440 minutes.");
    if (!Number.isInteger(input.codeLength) || input.codeLength < 0 || input.codeLength > 32)
        throw new Error("Code length must be 0 (flexible) or 1–32.");
}
export function validateGuildSettings(input: GuildSettings): void {
    validateGameSettings(input);
    for (const key of ["guildId", "boardId", "startId", "rulesId", "categoryId"] as const) {
        if (typeof input[key] !== "string" || !/^\d{17,20}$/.test(input[key])) throw new Error(`Invalid saved ${key}.`);
    }
    if (new Set([input.boardId, input.startId, input.rulesId]).size !== 3)
        throw new Error("Use three different channels for the lobby board, start page and rules.");
}
