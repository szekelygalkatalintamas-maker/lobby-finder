import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {ChannelType, Collection, PermissionFlagsBits, PermissionsBitField} from "discord.js";
import {defaults, readConfig, validateGuildSettings} from "../dist/config.js";
import {GuildStore} from "../dist/store.js";
import {checkChannels, boardPermissions} from "../dist/preflight.js";
import {buildCommands} from "../dist/commands.js";
import {configureServer} from "../dist/setup.js";
import {createLfgSystem} from "../dist/functions/lfg.js";
import {LFG_UI_COPY, getUiCopy} from "../dist/functions/lfgTranslations.js";

const settings = (n = 1, extra = {}) => ({
    ...defaults,
    modes: [...defaults.modes],
    guildId: `1000000000000000${n}1`,
    boardId: `1000000000000000${n}2`,
    startId: `1000000000000000${n}3`,
    rulesId: `1000000000000000${n}4`,
    categoryId: `1000000000000000${n}5`,
    ...extra
});

test("owner setup requires only a token and rejects placeholders without exposing secrets", () => {
    assert.throws(() => readConfig({}), /DISCORD_TOKEN/);
    assert.throws(() => readConfig({DISCORD_TOKEN: "replace_with_token"}), /DISCORD_TOKEN/);
    assert.equal(readConfig({DISCORD_TOKEN: "offline"}).userInstall, false);
    assert.throws(
        () => readConfig({DISCORD_TOKEN: "secret", USER_INSTALL_ENABLED: "yes"}),
        (error) => !error.message.includes("secret")
    );
});
test("server settings reject unsafe/unsupported option counts and duplicate channels", () => {
    validateGuildSettings(settings());
    for (const change of [
        {teamSize: 26},
        {modes: []},
        {modes: ["A", "A"]},
        {modes: ["Not specified"]},
        {codeLength: 33},
        {expiryMinutes: 0},
        {gameName: "@everyone"},
        {boardId: settings().startId}
    ])
        assert.throws(() => validateGuildSettings(settings(1, change)));
});
test("commands keep setup server-only and make personal help optional", () => {
    const [setup, help] = buildCommands(true);
    assert.deepEqual(setup.integration_types, [0]);
    assert.deepEqual(setup.contexts, [0]);
    assert.equal(setup.default_member_permissions, PermissionFlagsBits.ManageGuild.toString());
    assert.deepEqual(help.integration_types, [0, 1]);
    assert.deepEqual(buildCommands(false)[1].integration_types, [0]);
});
test("all translations render game, code length and expiry without unfilled placeholders", () => {
    for (const language of Object.keys(LFG_UI_COPY)) {
        const copy = getUiCopy(language, "Space Game", "8", 45);
        assert.match(copy.startTitle, /Space Game/);
        assert.ok(!JSON.stringify(copy).includes("{game}"));
        assert.ok(!JSON.stringify(copy).includes("{codeLength}"));
        assert.ok(!JSON.stringify(copy).includes("{expiry}"));
    }
});
test("persistent store isolates servers and survives concurrent saves and restarts", async (t) => {
    const dir = await mkdtemp(path.join(tmpdir(), "lobby-finder-test-"));
    t.after(() => rm(dir, {recursive: true, force: true}));
    const store = new GuildStore(dir);
    await store.load();
    await Promise.all([store.save(settings(1)), store.save(settings(2, {gameName: "Second game"}))]);
    const copy = store.get(settings().guildId);
    copy.modes.push("Changed elsewhere");
    assert.equal(store.get(settings().guildId).modes.length, 3);
    const restarted = new GuildStore(dir);
    await restarted.load();
    assert.equal(restarted.all().length, 2);
    await restarted.remove(settings().guildId);
    const final = new GuildStore(dir);
    await final.load();
    assert.equal(final.get(settings().guildId), undefined);
    assert.equal(final.get(settings(2).guildId).gameName, "Second game");
});
test("corrupt saved configuration is rejected without overwriting the file", async (t) => {
    const dir = await mkdtemp(path.join(tmpdir(), "lobby-finder-test-"));
    t.after(() => rm(dir, {recursive: true, force: true}));
    await writeFile(path.join(dir, "guilds.json"), "broken");
    await assert.rejects(new GuildStore(dir).load());
    assert.equal(await readFile(path.join(dir, "guilds.json"), "utf8"), "broken");
});

function harness(config) {
    let serial = 0;
    const channels = new Map();
    const client = {
        user: {id: "200000000000000001"},
        channels: {fetch: async (id) => channels.get(id)},
        guilds: {fetch: async () => ({members: {fetchMe: async () => ({id: "bot"})}})}
    };
    const guild = {id: config.guildId, channels: {fetch: async (id) => channels.get(id)}};
    function rows(builders = []) {
        return builders.map((builder) => {
            const row = builder.toJSON ? builder.toJSON() : builder;
            return {
                ...row,
                components: row.components.map((button) => ({...button, customId: button.custom_id, url: button.url}))
            };
        });
    }
    for (const id of [config.boardId, config.startId, config.rulesId]) {
        const messages = new Collection();
        const channel = {
            id,
            type: ChannelType.GuildText,
            guildId: config.guildId,
            guild,
            client,
            name: id,
            permissionsFor: () => new PermissionsBitField(boardPermissions),
            messages: {
                cache: messages,
                fetch: async (options) => {
                    if (typeof options === "string") {
                        const message = messages.get(options);
                        if (!message) throw Object.assign(new Error("Unknown Message"), {code: 10008});
                        return message;
                    }
                    return new Collection([...messages].reverse());
                }
            },
            send: async (payload) => {
                const message = {
                    id: `30000000000000${String(++serial).padStart(4, "0")}`,
                    channelId: id,
                    guildId: config.guildId,
                    channel,
                    guild,
                    client,
                    author: client.user,
                    createdTimestamp: Date.now(),
                    editedTimestamp: null,
                    embeds: [],
                    components: [],
                    url: "https://discord.com/channels/1/2/3",
                    edit: async (change) => {
                        if (change.embeds) message.embeds = change.embeds.map((x) => (x.toJSON ? x.toJSON() : x));
                        if (change.components) message.components = rows(change.components);
                        message.editedTimestamp = Date.now();
                        return message;
                    },
                    delete: async () => {
                        messages.delete(message.id);
                    },
                    startThread: async () => {
                        const thread = {
                            id: message.id,
                            send: async () => undefined,
                            isThread: () => true,
                            setArchived: async () => undefined,
                            setLocked: async () => undefined
                        };
                        channels.set(message.id, thread);
                        return thread;
                    }
                };
                await message.edit(payload);
                messages.set(message.id, message);
                return message;
            },
            _messages: messages
        };
        channels.set(id, channel);
    }
    const base = {
        guildId: config.guildId,
        channelId: config.startId,
        client,
        locale: "en-US",
        user: {
            id: "400000000000000001",
            username: "Player",
            globalName: "Player",
            tag: "Player",
            displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png"
        },
        isModalSubmit: () => false,
        isStringSelectMenu: () => false,
        isButton: () => false,
        isMessageComponent: () => false
    };
    const create = async (engine, code) => {
        const replies = [];
        const interaction = {
            ...base,
            customId: "lfg:createmodal",
            isModalSubmit: () => true,
            fields: {getTextInputValue: () => code},
            deferReply: async () => undefined,
            reply: async (value) => replies.push(value),
            editReply: async (value) => replies.push(value)
        };
        await engine.handle(interaction);
        return replies;
    };
    return {client, channels, base, create};
}

test("preflight refuses the wrong server and missing thread permissions", async () => {
    const config = settings();
    const h = harness(config);
    await checkChannels(h.client, config);
    h.channels.get(config.boardId).guildId = settings(2).guildId;
    await assert.rejects(checkChannels(h.client, config), /another server/);
    h.channels.get(config.boardId).guildId = config.guildId;
    h.channels.get(config.boardId).permissionsFor = () => new PermissionsBitField();
    await assert.rejects(checkChannels(h.client, config), /Missing permissions/);
});
test("setup refuses non-managers before creating channels or saving data", async () => {
    let reply;
    await configureServer(
        {
            inCachedGuild: () => true,
            memberPermissions: new PermissionsBitField(),
            reply: async (value) => {
                reply = value;
            }
        },
        {},
        {}
    );
    assert.match(reply.content, /Manage Server/);
});
test("per-server modal code limits and case-sensitive creation are independent", async (t) => {
    const a = settings(1, {codeLength: 8});
    const b = settings(2);
    for (const config of [a, b]) {
        const h = harness(config);
        const engine = createLfgSystem(config);
        t.after(() => engine.stop());
        let modal;
        await engine.handle({
            ...h.base,
            isButton: () => true,
            customId: "lfg:interface:create",
            showModal: async (value) => {
                modal = value.toJSON();
            }
        });
        const input = modal.components[0].components[0];
        assert.equal(input.min_length, config.codeLength || 1);
        assert.equal(input.max_length, config.codeLength || 32);
    }
});
test("two servers can create the same code for the same host, preserving code case", async (t) => {
    for (const config of [settings(1), settings(2, {gameName: "Other game"})]) {
        const h = harness(config);
        const engine = createLfgSystem(config);
        t.after(() => engine.stop());
        await engine.start(h.client);
        const replies = await h.create(engine, "Ab_c-9");
        assert.match(replies.at(-1).content, /created successfully/);
        const cards = [...h.channels.get(config.boardId)._messages.values()].filter((message) =>
            message.components.some((row) =>
                row.components.some((button) => button.customId?.startsWith("lfg:manage:"))
            )
        );
        assert.equal(cards.length, 1);
        assert.ok(cards[0].components[0].components.some((button) => button.customId?.endsWith(":Ab_c-9")));
        const stats = [...h.channels.get(config.boardId)._messages.values()].find(
            (message) => message.embeds[0]?.title === "🔎 LFG"
        );
        assert.match(stats.embeds[0].fields.find((field) => field.name === "📊 LFGs created").value, /1/);
    }
});
test("concurrent creation by one host produces one card and a duplicate response", async (t) => {
    const config = settings();
    const h = harness(config);
    const engine = createLfgSystem(config);
    t.after(() => engine.stop());
    await engine.start(h.client);
    const result = (await Promise.all([h.create(engine, "room-one"), h.create(engine, "room-two")])).map(
        (replies) => replies.at(-1).content
    );
    assert.equal(result.filter((content) => content.includes("created successfully")).length, 1);
    assert.equal(result.filter((content) => content.includes("already have an active lobby")).length, 1);
});
test("cross-server interactions, other bots' components and stopped engines are ignored", async () => {
    const config = settings();
    const h = harness(config);
    const engine = createLfgSystem(config);
    assert.equal(await engine.handle({...h.base, guildId: settings(2).guildId}), false);
    assert.equal(
        await engine.handle({...h.base, isMessageComponent: () => true, message: {author: {id: "another-bot"}}}),
        false
    );
    engine.stop();
    assert.equal(await engine.handle(h.base), false);
});
test("invalid codes and edits by someone other than the host are rejected", async () => {
    const config = settings();
    const h = harness(config);
    const engine = createLfgSystem(config);
    for (const code of ["bad:code", "a".repeat(33), "https://example.com"])
        assert.match((await h.create(engine, code))[0].content, /Use 1–32/);
    let reply;
    await engine.handle({
        ...h.base,
        isModalSubmit: () => true,
        customId: "lfg:editmodal:message-id:other-host:abc",
        reply: async (value) => {
            reply = value;
        }
    });
    assert.match(reply.content, /Only the lobby host/);
    engine.stop();
});

test("largest supported team and mode lists serialize within Discord's 25-option limit", async (t) => {
    const config = settings(1, {teamSize: 25, modes: Array.from({length: 24}, (_, i) => `Mode ${i + 1}`)});
    const h = harness(config);
    const engine = createLfgSystem(config);
    t.after(() => engine.stop());
    await engine.start(h.client);
    await h.create(engine, "a".repeat(32));
    const card = [...h.channels.get(config.boardId)._messages.values()].find((message) =>
        message.components.some((row) => row.components.some((button) => button.customId?.startsWith("lfg:manage:")))
    );
    let modal;
    await engine.handle({
        ...h.base,
        channelId: config.boardId,
        isButton: () => true,
        isMessageComponent: () => true,
        customId: `lfg:manage:${h.base.user.id}:${"a".repeat(32)}`,
        message: card,
        showModal: async (value) => {
            modal = value.toJSON();
        }
    });
    assert.ok(modal.custom_id.length <= 100);
    for (const label of modal.components) if (label.component?.options) assert.ok(label.component.options.length <= 25);
    assert.equal(modal.components[0].component.options.length, 25);
    assert.equal(modal.components[2].component.options.length, 25);
});

test("restarting a server engine restores active lobbies and statistics", async () => {
    const config = settings();
    const h = harness(config);
    const original = createLfgSystem(config);
    await original.start(h.client);
    await h.create(original, "room");
    original.stop();
    const restored = createLfgSystem(config);
    try {
        await restored.start(h.client);
        assert.match((await h.create(restored, "different-room")).at(-1).content, /already have an active lobby/);
        assert.equal(h.channels.get(config.startId)._messages.size, 1);
        const stats = [...h.channels.get(config.boardId)._messages.values()].filter(
            (message) => message.embeds[0]?.title === "🔎 LFG"
        );
        assert.equal(stats.length, 1);
        assert.match(stats[0].embeds[0].fields.find((field) => field.name === "📊 LFGs created").value, /1/);
    } finally {
        restored.stop();
    }
});

function setupHarness(failAt = -1) {
    const created = [],
        deleted = [];
    let saved;
    const permissions = new PermissionsBitField(Object.values(PermissionFlagsBits));
    const interaction = {
        guildId: settings().guildId,
        inCachedGuild: () => true,
        memberPermissions: permissions,
        options: {getString: () => null, getInteger: () => null},
        deferReply: async () => undefined,
        editReply: async () => undefined,
        guild: {
            members: {fetchMe: async () => ({id: "200000000000000001", permissions})},
            channels: {
                create: async (options) => {
                    if (created.length === failAt) throw Error("Simulated create failure");
                    const channel = {
                        id: `50000000000000000${created.length + 1}`,
                        type: options.type,
                        delete: async () => deleted.push(channel.id)
                    };
                    created.push(channel);
                    return channel;
                },
                fetch: async (id) => created.find((channel) => channel.id === id)
            }
        }
    };
    const store = {
        get: () => saved,
        save: async (value) => {
            saved = structuredClone(value);
        }
    };
    const started = [];
    return {interaction, store, registry: {start: async (value) => started.push(value)}, created, deleted, started};
}
test("setup creates channels once and reuses them on an update", async () => {
    const h = setupHarness();
    await configureServer(h.interaction, h.store, h.registry);
    assert.equal(h.created.length, 4);
    assert.equal(h.started.length, 1);
    validateGuildSettings(h.started[0]);
    h.interaction.options.getString = (key) => (key === "game" ? "A different game" : null);
    await configureServer(h.interaction, h.store, h.registry);
    assert.equal(h.created.length, 4);
    assert.equal(h.started[1].gameName, "A different game");
    assert.equal(h.deleted.length, 0);
});
test("partial setup failure removes only channels created by that attempt", async () => {
    const h = setupHarness(2);
    await assert.rejects(configureServer(h.interaction, h.store, h.registry), /Simulated/);
    assert.deepEqual(
        h.deleted,
        [...h.created].reverse().map((channel) => channel.id)
    );
    assert.equal(h.store.get(), undefined);
    assert.equal(h.started.length, 0);
});
