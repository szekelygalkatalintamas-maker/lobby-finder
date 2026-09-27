# Verification — Lobby-Finder 0.2.1

- TypeScript build passed with Node.js 24.19.0, TypeScript 5.9.3 and discord.js 14.27.0.
- All **20 offline tests** passed: configuration validation, command installation contexts, translated templates, concurrent persistent saves, corrupt-file handling, permissions, manager-only setup, per-server code limits, independent server state, simultaneous duplicate creation, bot-message ownership, invalid codes, host-only edits, maximum dropdown sizes, restart recovery, idempotent setup, rollback after partial setup failure, preserving owner credentials, application-specific invite links and safe handling of setup failures.
- `npm run setup` completed a clean dependency installation and TypeScript build, and validated the dedicated application's token and portal settings through Discord's read-only API. The setup helper did not start the bot.
- The application requests the Guilds intent only. Neither Message Content, Guild Members nor Guild Presences is requested.
- Release files are checked for removed branding, credential-like strings and unwanted server data before archiving/publication.

Tests use mocked Discord objects; they do not substitute for real Discord acceptance testing. The hosted service, real installation flow, Docker image, threads, timers and server permission overrides still need live verification with the dedicated application before announcing general availability.
