import {mkdir, readFile, rename, writeFile} from "node:fs/promises";
import path from "node:path";
import {validateGuildSettings, type GuildSettings} from "./config.js";
export class GuildStore {
    private records = new Map<string, GuildSettings>();
    private queue: Promise<void> = Promise.resolve();
    constructor(private directory: string) {}
    async load(): Promise<void> {
        await mkdir(this.directory, {recursive: true});
        let raw: string;
        try {
            raw = await readFile(path.join(this.directory, "guilds.json"), "utf8");
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
            throw error;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed))
            throw new Error("Invalid guilds.json. Restore your backup; the file was not overwritten.");
        const next = new Map<string, GuildSettings>();
        for (const config of parsed) {
            validateGuildSettings(config);
            if (next.has(config.guildId)) throw new Error("Duplicate server in guilds.json.");
            next.set(config.guildId, structuredClone(config));
        }
        this.records = next;
    }
    get(id: string): GuildSettings | undefined {
        const entry = this.records.get(id);
        return entry ? structuredClone(entry) : undefined;
    }
    all(): GuildSettings[] {
        return [...this.records.values()].map((value) => structuredClone(value));
    }
    save(config: GuildSettings): Promise<void> {
        validateGuildSettings(config);
        return this.commit(config.guildId, structuredClone(config));
    }
    remove(id: string): Promise<void> {
        return this.commit(id);
    }
    private commit(id: string, config?: GuildSettings): Promise<void> {
        const job = this.queue.then(async () => {
            const next = new Map(this.records);
            if (config) next.set(id, config);
            else next.delete(id);
            const destination = path.join(this.directory, "guilds.json");
            await writeFile(`${destination}.tmp`, JSON.stringify([...next.values()], null, 2) + "\n", {mode: 0o600});
            await rename(`${destination}.tmp`, destination);
            this.records = next;
        });
        this.queue = job.catch(() => undefined);
        return job;
    }
}
