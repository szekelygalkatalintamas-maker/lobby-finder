# Owner setup

Application: **Lobby-Finder** · ID: `1553733949329776730`

## Discord Developer Portal

Open [this application's settings](https://discord.com/developers/applications/1553733949329776730).

1. **Bot:** enable **Public Bot**. Leave **Requires OAuth2 Code Grant** off. Use this application's token in the host's `DISCORD_TOKEN` secret.
2. **Installation:** enable **Guild Install**. Optionally enable **User Install** as well; `.env.example` assumes both are enabled.
3. For Guild Install, select **bot** and **applications.commands** scopes. Grant View Channels, Send Messages, Embed Links, Read Message History, Manage Channels, Create Public Threads, Send Messages in Threads and Manage Threads. The invite permission integer is `326417599504`.
4. For User Install, select **applications.commands** only. `/lfg-help` supports personal contexts; setup and shared boards are server-only. Set `USER_INSTALL_ENABLED=false` if you leave User Install disabled.
5. Select a Discord Provided Link, or use the explicit server-invite link in the README when advertising the board.
6. Leave **Interactions Endpoint URL** empty; the hosted process receives Gateway interactions. Keep all privileged intents off.

Discord distinguishes [server and user installations](https://docs.discord.com/developers/resources/application#installation-context); enabling User Install alone does not grant the server permissions the lobby board needs. Command contexts must also match the application settings. [Command context documentation](https://docs.discord.com/developers/interactions/application-commands#contexts).

## Hosting

Use a separate service and token for Lobby-Finder. Build this folder's Dockerfile or run `npm ci`, `npm run build`, then `npm start`. Supply `DISCORD_TOKEN`, `USER_INSTALL_ENABLED` and persistent `DATA_DIR`. Run a single process continuously; autosleep prevents interactions and cleanup from running.

Do not put the bot token in GitHub, screenshots or chat. Add it through the hosting dashboard's secret settings, or your local ignored `.env` file. The example contains no token.

The Docker Compose configuration creates a persistent volume. With another provider, ensure the application user can write to the mounted data directory. Back up `guilds.json` before upgrades.

## GitHub publication

Publish this folder as a separate public repository named `lobby-finder`. Include the MIT license, source, tests, Docker files and lockfile. Exclude `.env`, `data`, `node_modules`, `dist`, local logs and any parent project's files. The included workflow builds and tests pull requests and pushes.

The selected destination is `szekelygalkatalintamas-maker/lobby-finder`. The repository and hosted service must be published separately; making the Discord application public does not run the code.

## Acceptance before announcing availability

1. Invite the new bot into two test servers and run `/lfg-setup` with different games, team sizes and modes.
2. Verify three channels and one category are created in each server. Rerun setup and confirm no duplicate channels.
3. Create lobbies with the same user and code in both servers; verify they remain independent. Try simultaneous duplicate creation in one server.
4. Edit details, browse, reveal codes, use threads, mark Team Full, reopen and close.
5. Confirm a different member cannot manage another host's lobby and ordinary members cannot run setup or disable.
6. Restart the service. Check both configurations, live cards and statistics.
7. Check expiry after the configured interval, and test missing permissions with a non-admin member.
8. If User Install is enabled, confirm `/lfg-help` works from a personal installation while `/lfg-setup` remains server-only.
9. Set your public support contact and publish operator-reviewed data/privacy and terms information before announcing the service. `DATA-HANDLING.md` describes the code's behavior and is not a completed legal policy.
