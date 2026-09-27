import {fileURLToPath} from "node:url";
import {requireNode, readSettings, verifyApplication, printApplication} from "./owner-tools.mjs";

try {
    requireNode();
    const root = fileURLToPath(new URL("../", import.meta.url));
    printApplication(await verifyApplication(readSettings(root)));
    console.log("Checking the token and generating an invite does not start the bot. Run npm start to connect it.");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
