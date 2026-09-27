import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {PermissionsBitField} from "discord.js";
import {installPermissions} from "../dist/preflight.js";
import {prepareEnv, readSettings, verifyApplication, invitePermissions, requireNode} from "../scripts/owner-tools.mjs";

test("setup creates a template once and preserves an owner's token and environment overrides", async (t) => {
    const root = await mkdtemp(path.join(tmpdir(), "lobby-owner-"));
    t.after(() => rm(root, {recursive: true, force: true}));
    await writeFile(path.join(root, ".env.example"), "DISCORD_TOKEN=replace_with_token\nUSER_INSTALL_ENABLED=false\n");
    assert.equal(prepareEnv(root), true);
    const saved = "DISCORD_TOKEN=existing-test-value\nUSER_INSTALL_ENABLED=true\n";
    await writeFile(path.join(root, ".env"), saved);
    assert.equal(prepareEnv(root), false);
    assert.equal(await readFile(path.join(root, ".env"), "utf8"), saved);
    assert.equal(readSettings(root, {}).DISCORD_TOKEN, "existing-test-value");
    assert.equal(readSettings(root, {DISCORD_TOKEN: "host-secret"}).DISCORD_TOKEN, "host-secret");
});

const application = {id: "123456789012345678", name: "My own game bot", bot_public: false, integration_types_config: {0: {}}};
const response = (app = application) => async () => ({ok: true, json: async () => app});

test("invite uses the recipient's authenticated application and matches runtime permissions", async () => {
    const app = await verifyApplication({DISCORD_TOKEN: "test-only"}, response());
    const url = new URL(app.invite);
    assert.equal(url.searchParams.get("client_id"), application.id);
    assert.equal(url.searchParams.get("integration_type"), "0");
    assert.equal(url.searchParams.get("permissions"), new PermissionsBitField(installPermissions).bitfield.toString());
    assert.equal(invitePermissions, url.searchParams.get("permissions"));
    assert.equal(app.publicBot, false);
});

test("setup detects incompatible portal contexts and suppresses sensitive request failures", async () => {
    const settings = {DISCORD_TOKEN: "never-display-this-value"};
    await assert.rejects(verifyApplication({...settings, USER_INSTALL_ENABLED: "true"}, response()), /User Install/);
    await assert.rejects(verifyApplication(settings, response({...application, integration_types_config: {1: {}}})), /Guild Install/);
    await assert.rejects(verifyApplication(settings, response({...application, bot_require_code_grant: true})), /Code Grant/);
    await assert.rejects(verifyApplication(settings, response({...application, interactions_endpoint_url: "https://example.com"})), /Endpoint/);
    await assert.rejects(verifyApplication(settings, async () => { throw Error(settings.DISCORD_TOKEN); }), (error) => !error.message.includes(settings.DISCORD_TOKEN));
    await assert.rejects(verifyApplication(settings, async () => ({ok: false, status: 401, json: async () => { throw Error(settings.DISCORD_TOKEN); }})), /Discord rejected/);
    await assert.rejects(verifyApplication({DISCORD_TOKEN: "replace_with_token"}, () => { throw Error("must not fetch"); }), /Open .env/);
    assert.throws(() => requireNode("20.18.1"), /24.17/);
    assert.throws(() => requireNode("24.16.0"), /24.17/);
    requireNode("24.17.0");
});
