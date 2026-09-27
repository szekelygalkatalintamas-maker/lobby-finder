import {readConfig} from "./config.js";

try {
    const config = readConfig();
    console.log(`Configuration format OK. User-install help: ${config.userInstall ? "enabled" : "disabled"}.`);
    console.log("No Discord connection was made. Token validity and channel permissions are checked at startup.");
} catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid configuration.");
    process.exitCode = 1;
}
