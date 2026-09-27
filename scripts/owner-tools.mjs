import fs from "node:fs";
import path from "node:path";
import {parseEnv} from "node:util";

export const invitePermissions = "326417599504";

export function requireNode(version = process.versions.node) {
    const [major, minor] = version.split(".").map(Number);
    if (major < 24 || (major === 24 && minor < 17))
        throw new Error("Install Node.js 24.17 or newer from https://nodejs.org, then try again.");
}

export function prepareEnv(root) {
    try {
        fs.copyFileSync(path.join(root, ".env.example"), path.join(root, ".env"), fs.constants.COPYFILE_EXCL);
        return true;
    } catch (error) {
        if (error.code === "EEXIST") return false;
        throw new Error("Could not create .env. Extract the ZIP into a writable folder and try again.");
    }
}

export function readSettings(root, environment = process.env) {
    const file = path.join(root, ".env");
    const local = fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
    return {...local, ...environment};
}

export function buildInvite(applicationId) {
    if (!/^\d{17,20}$/.test(applicationId)) throw new Error("Discord returned an invalid application ID.");
    return `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=bot%20applications.commands&permissions=${invitePermissions}&integration_type=0`;
}

export async function verifyApplication(settings, fetchImpl = fetch) {
    const token = settings.DISCORD_TOKEN?.trim();
    if (!token || token.startsWith("replace_with_"))
        throw new Error("Open .env, set DISCORD_TOKEN to your own bot token, save it, then run setup again.");
    const personalHelp = settings.USER_INSTALL_ENABLED ?? "false";
    if (!["true", "false"].includes(personalHelp))
        throw new Error("USER_INSTALL_ENABLED must be true or false in .env.");
    let response;
    try {
        response = await fetchImpl("https://discord.com/api/v10/applications/@me", {
            headers: {Authorization: `Bot ${token}`},
            signal: AbortSignal.timeout(20000)
        });
    } catch {
        throw new Error("Could not reach Discord. Check your internet connection and try again.");
    }
    // Never include Discord response bodies or request headers in errors.
    if (!response.ok) {
        if (response.status === 401) throw new Error("Discord rejected the bot token. Check DISCORD_TOKEN in .env.");
        throw new Error(`Discord application check failed (HTTP ${response.status}). Try again later.`);
    }
    let app;
    try {
        app = await response.json();
    } catch {
        throw new Error("Discord returned an unreadable application response. Try again later.");
    }
    const invite = buildInvite(app.id);
    if (!app.integration_types_config || !Object.hasOwn(app.integration_types_config, "0"))
        throw new Error("Enable Guild Install under Installation in your Discord Developer Portal.");
    if (personalHelp === "true" && !Object.hasOwn(app.integration_types_config, "1"))
        throw new Error("Enable User Install in the Developer Portal, or set USER_INSTALL_ENABLED=false in .env.");
    if (app.bot_require_code_grant)
        throw new Error("Turn off Requires OAuth2 Code Grant on the Developer Portal's Bot page.");
    if (app.interactions_endpoint_url)
        throw new Error("Clear Interactions Endpoint URL in the Developer Portal; this bot uses a Gateway connection.");
    return {id: app.id, name: app.name, publicBot: app.bot_public, invite};
}

export function printApplication(app) {
    console.log(`Verified application: ${JSON.stringify(app.name)} (${app.id}).`);
    console.log(`Invite YOUR bot to a server:\n${app.invite}`);
    if (!app.publicBot) console.log("This application is private: only its owner can invite it.");
}
