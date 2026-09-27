# Lobby-Finder

**Find a team. Share a lobby. Start playing.**

A Discord bot for community lobby boards, with separate settings for every server. Built with TypeScript and discord.js. MIT licensed.

## Add it to your community

1. **[Add Lobby-Finder to your server](https://discord.com/oauth2/authorize?client_id=1553733949329776730&scope=bot%20applications.commands&permissions=326417599504&integration_type=0).** You need Manage Server permission.
2. Run **`/lfg-setup`**. It creates a Lobby Finder category, a start page, a lobby board and a rules channel.
3. Open **#lfg-start-here** and press **Create Lobby** or **Browse Lobbies**.

No code, downloads, tokens or channel IDs are needed by server admins. The bot's owner runs the hosted service. **This source release must be deployed before the hosted invite provides a working bot.**

Choose your game during setup, for example:

```text
/lfg-setup game:My Game team-size:4 modes:Casual,Ranked,Co-op
```

Run the command again to change settings; the existing channels are reused.

| Setting | Default | Options |
| --- | --- | --- |
| Game name | Any game | Up to 60 characters |
| Team size, including host | 4 | 2–25 |
| Modes | Casual, Competitive, Co-op | 1–24 comma-separated names |
| Inactivity expiry | 30 minutes | 5–1440 minutes |
| Code length | Flexible | 1–32 characters, or set an exact length |

Lobby codes accept letters, numbers, hyphens and underscores, preserving case. Put platform, cross-play requirements and other joining details in Notes. Games with invite links or another joining mechanism need those instructions in the discussion thread; the code field does not accept URLs.

## For players

- **Create Lobby:** enter your room code, then use **Manage** to set players needed, language, mode and notes.
- **Browse Lobbies:** filter open rooms by lobby language.
- **Reveal Code** and **Discussion:** get the host's code and coordinate in a thread.
- **Team Full:** hide a full room from browsing, with the option to reopen it.
- **Close:** finish the lobby. Inactive cards expire automatically.

Each host can have one active lobby **per server**. The same code can be used independently in different servers. Only the host can manage their card. There are 25 lobby-language choices and 24 translated sets of help/form copy; some controls and errors remain English, and Tamil uses English UI copy.

Codes are supplied by hosts. Lobby-Finder does not create rooms inside a game or verify that a game room is still available. Codes also appear in the discussion thread and should not be treated as private credentials.

## Commands

| Command | Who can use it | What it does |
| --- | --- | --- |
| `/lfg-setup` | Manage Server | Creates the board or updates game settings |
| `/lfg-help` | Everyone | Shows instructions and the Add to Server link |
| `/lfg-disable confirm:true` | Manage Server | Stops LFG and removes saved server settings; existing Discord messages/channels remain |

**Guild Install** runs the shared board. **User Install** makes `/lfg-help` available in personal contexts; it does not install the server bot or grant channel permissions. See [Discord's installation contexts](https://docs.discord.com/developers/resources/application#installation-context).

The bot uses buttons, forms and slash commands. It requests no privileged intents and does not read or delete ordinary chat messages. Board channels are created with member posting disabled so discussion stays in the threads. Review role overrides if your server already grants Send Messages to custom roles.

## Own your own copy

You can run an independent bot under **your own Discord application**, customize the source and keep your own server data. Download the independent-copy ZIP from [Releases](https://github.com/szekelygalkatalintamas-maker/lobby-finder/releases), or fork this repository. Follow the [own-copy guide](docs/OWN-COPY.md).

The copy includes Windows setup/start shortcuts. `npm run setup` installs dependencies, builds the bot and checks your application's settings; `npm run invite` generates **your application's** invite link from your token. Never use the hosted bot's invite when setting up an independent copy.

## For the owner: run your own instance

Use Node.js 24.17+ and npm. [discord.js installation guidance](https://discord.js.org/docs/packages/discord.js/14.27.0).

For a guided setup, copy `.env.example` to `.env`, fill in your own token, then run `npm run setup` followed by `npm start`. Windows users can double-click `setup.cmd` and `start.cmd`. [Create your own Discord application first](docs/OWN-COPY.md).

Or install manually:

```sh
npm ci
```

Copy `.env.example` to `.env` and set your own application's `DISCORD_TOKEN`. Never commit this file. Then:

```sh
npm run build
npm run check-config
npm test
npm start
```

Windows: `Copy-Item .env.example .env`. macOS/Linux: `cp .env.example .env`.

The owner configures one token. Server settings are created through `/lfg-setup`, saved separately in `data/guilds.json`, and loaded after restart. The entry point registers the three slash commands automatically after connecting. Use a dedicated application: startup upserts those command names.

For Docker, fill in `.env` and run:

```sh
docker compose up -d --build
```

The named volume keeps server settings across restarts. For another host, mount persistent storage at `DATA_DIR` and run **one always-on process**. This version supports multiple servers in one process, not multiple replicas sharing one data directory. No public web port is needed.

See **[Developer Portal setup](docs/OWNER-SETUP.md)** for the exact installation settings and **[data handling](docs/DATA-HANDLING.md)** for storage details.

## State and limits

- One game/board configuration per server in this version.
- Game settings survive restarts in the data directory. Back up that directory.
- Lobby state is reconstructed from existing bot cards, scanning up to 5,000 messages. Keep the same bot and channels.
- Statistics totals are restored from the statistics-panel message. Deleting that message loses history that cannot be recovered from remaining cards. Team Ready counts are events; daily analytics are not included.
- Expired and manually closed cards have a 15-second cleanup grace period. Maintenance runs every minute, so timing is approximate. Team Full cards remain available to reopen for the configured expiry interval.
- Language preferences reset on restart. Server settings are removed when the bot receives a server-removal event, when absent servers are reconciled on startup, or via `/lfg-disable`.

## Development

```sh
npm test
npm run typecheck
```

Tests run offline with mocked Discord objects. Before public launch, test setup, editing, threads, expiry, restart recovery and permissions in two real test servers. No production credentials or community data are included in this repository.

## License

[MIT](LICENSE).
