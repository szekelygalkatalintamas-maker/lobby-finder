import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {requireNode, prepareEnv, readSettings, verifyApplication, printApplication} from "./owner-tools.mjs";

try {
    requireNode();
    const root = fileURLToPath(new URL("../", import.meta.url));
    if (prepareEnv(root)) console.log("Created .env from the template. Existing settings are never overwritten.");
    console.log("Checking your application's settings with Discord...");
    const app = await verifyApplication(readSettings(root));
    printApplication(app);
    for (const args of [["ci", "--ignore-scripts"], ["run", "build"]]) {
        console.log(`\nnpm ${args.join(" ")}`);
        const cli = process.env.npm_execpath;
        const command = cli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
        const result = spawnSync(command, cli ? [cli, ...args] : args, {
            cwd: root,
            stdio: "inherit",
            shell: !cli && process.platform === "win32",
            windowsHide: true
        });
        if (result.error || result.status !== 0) throw new Error(`npm ${args[0]} failed. Fix the error above and rerun setup.`);
    }
    console.log("\nSetup complete. Run npm start (Windows: double-click start.cmd). Keep it running, invite your bot, then use /lfg-setup in Discord.");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
