# Run and customize your own copy

This copy runs under **your Discord application and token**. You control its name, avatar, code, hosting and server data. No account with the original developer is needed. Keep the included MIT copyright and license notice when redistributing code.

## 1. Create your Discord application

Open the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application** with your own bot name.

- On **Bot**, copy or reset the bot token. Save it privately. Leave **Requires OAuth2 Code Grant** off and all **Privileged Gateway Intents** off.
- **Public Bot** may stay off if only you will invite the bot. Enable it if other server managers should be able to invite your application.
- Under **Installation**, enable **Guild Install**. User Install is optional; leave it off for the simplest setup. A personal installation alone cannot run the shared lobby board.
- For Guild Install, choose **bot** and **applications.commands**. Permissions: View Channels, Send Messages, Embed Links, Read Message History, Manage Channels, Create Public Threads, Send Messages in Threads and Manage Threads. The permission number is `326417599504`; Administrator is unnecessary.
- Leave **Interactions Endpoint URL** empty. This program connects to Discord using the Gateway.

See [Discord's application setup guide](https://docs.discord.com/developers/quick-start/getting-started) for the portal screens.

## 2. Extract and configure

Install **[Node.js](https://nodejs.org) 24.17 or newer** with npm. Extract the entire ZIP to a writable folder, or fork/clone the source repository. Run commands inside that folder.

Copy `.env.example` to a file named exactly `.env`. Fill in:

```dotenv
DISCORD_TOKEN=replace_with_your_bot_token
DATA_DIR=./data
USER_INSTALL_ENABLED=false
```

Replace the token placeholder with **your own application's token**. Never send your filled-in `.env` to anyone or commit it. No channel IDs, server IDs or application ID need to be entered in the code.

On Windows, copying can be done in PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```sh
cp .env.example .env
```

If `.env` already exists, edit it instead of copying over it. Windows setup also creates it when missing and tells you to fill it in.

## 3. Install and start

**Windows:** double-click **setup.cmd**. After setup finishes successfully, double-click **start.cmd**.

**Any operating system:**

```sh
npm run setup
npm start
```

Setup checks Node, validates your token and application settings with Discord, prints **your bot's invite URL**, installs the locked dependencies and builds the TypeScript source. It does not change your Developer Portal settings, invite the bot, or start the bot automatically. Re-running setup preserves `.env` and `data/` but reinstalls dependencies and rebuilds `dist/`.

To show your invite again without starting the bot:

```sh
npm run invite
```

Open that URL, choose your server and authorize it. You need Manage Server permission. Once `npm start` reports the bot online, run:

```text
/lfg-setup game:Your Game team-size:4 modes:Casual,Ranked,Co-op
```

This creates a category and three channels. Open **#lfg-start-here** to create or browse a lobby. Use `/lfg-setup` again to adjust settings; the existing channels are reused. Players do not need Node, tokens or this ZIP.

## Keep it online

**The program must remain running and connected to the internet.** On a PC, keep the start window open and prevent sleep. Ctrl+C stops it. For continuous availability, run it on an always-on computer, server or container host of your choice. Fly.io is not required. Making the Discord application public or inviting it does not host the program.

Run one process per application/data directory. Do not run a second local instance while the same bot is running on another host.

Docker is also supported. With `.env` configured, run:

```sh
docker compose up -d --build
```

Compose uses a persistent volume for server settings. For another container host, mount writable storage at `/app/data`. The Node app runs as UID 1000; ensure your host's volume permissions permit access. No inbound web port is required. Back up `data/guilds.json` (or the volume) before upgrades.

## Make it your own

| Change | Where |
| --- | --- |
| Discord bot name, avatar, description | Your application in the Discord Developer Portal |
| Game, team size, modes, expiry, code length | `/lfg-setup` in each server; no code changes needed |
| Default game settings for new servers | `src/config.ts` |
| Channels and their creation permissions | `src/setup.ts` |
| Lobby cards, buttons and behavior | `src/functions/lfg.ts` |
| Text and translations | `src/functions/lfgTranslations.ts` |
| Slash command definitions | `src/commands.ts` |
| Command handlers and help text | `src/index.ts` |
| Per-server persistence and lifecycle | `src/store.ts` and `src/registry.ts` |

The source still calls the project Lobby-Finder. To rebrand the interface, search `src/` for `Lobby-Finder` and update the user-facing copy, including translations and command descriptions. Changing the bot's name in Discord does not rewrite those strings. Keep the existing MIT license notice; add your own copyright notice for your contributions if desired.

After edits, stop the running bot with Ctrl+C, then:

```sh
npm test
npm start
```

`npm test` builds the source and runs offline tests. Edit `src/`, because `dist/` is regenerated. Try changes in a test server before using them in an active community. Command definitions are updated on startup. If you rename commands in code, separately remove obsolete command names from your application; startup only updates the included names.

If you want personal `/lfg-help`, enable **User Install** in the portal with the **applications.commands** scope, set `USER_INSTALL_ENABLED=true` and restart. Setup and shared lobby boards still require Guild Install.

## Troubleshooting

- **Token rejected:** confirm you copied a bot token from the Bot page, not the application ID or public key. Save `.env` and rerun setup.
- **Node version error:** install Node 24.17+ and reopen your terminal; run `node --version`.
- **Bot appears offline:** keep `npm start` running. Setup only installs/checks the program.
- **No setup command:** ensure Guild Install is enabled, the bot is in the server and startup succeeded. Reopen Discord if the command list has not refreshed.
- **Missing permissions:** check the bot role and category/channel overrides against the permission list above.
- **Personal help error:** leave `USER_INSTALL_ENABLED=false` unless User Install is enabled in the portal.

## What is included

Full editable source, lockfile, offline tests, Docker files, setup helpers and MIT license. Credentials, installed dependencies, compiled output and server data are excluded. Lobby state is restored from the bot's Discord cards; statistics depend on its statistics-panel message, and deleted history cannot be fully reconstructed. See [data handling](DATA-HANDLING.md) and [verification](../VERIFICATION.md).
