# Data handling

This technical description is for the operator to review when preparing public service information.

- **Server settings:** guild/channel IDs, game name, team size, modes, code-length setting and expiry are saved in `DATA_DIR/guilds.json`.
- **Discord content created by the bot:** lobby cards and discussion threads contain host identity, lobby codes and host-supplied details. Visibility follows the server's channel permissions.
- **Memory:** active lobby references, pending cleanup, counters and selected interface languages are cached while the process runs. Lobby state is recovered from existing bot messages after restart.
- **Logs:** operational actions and errors can contain lobby codes, Discord names or IDs. The hosting operator controls log access and retention; no retention period is configured by this package.
- **Deletion:** `/lfg-disable` removes saved settings and stops the board. Removing the bot also removes its configuration when that removal is received, or when the next startup reconciles its server list. Neither action deletes existing Discord channels, cards or threads. Server moderators manage those records. Host backups and logs have separate retention.
- **Access:** no privileged intents are requested. The bot does not monitor ordinary message content, online status or direct messages. It processes commands/components, reads its lobby-board history, and manages the channels/threads needed for the feature.
- **External services:** Discord provides the platform and API; the operator selects the hosting provider. This package sends no analytics to another service.

Public support contact, hosting/log retention, and policy URLs must be supplied by the operator. This file does not claim those arrangements are already in place.
