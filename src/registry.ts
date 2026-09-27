import type {Client, Interaction} from "discord.js";
import {createLfgSystem} from "./functions/lfg.js";
import type {GuildSettings} from "./config.js";
import {checkChannels} from "./preflight.js";

export class LfgRegistry {
    private engines = new Map<string, ReturnType<typeof createLfgSystem>>();
    private operations = new Map<string, Set<Promise<unknown>>>();
    private changing = new Set<string>();
    constructor(private client: Client<true>) {}
    async start(config: GuildSettings): Promise<void> {
        this.changing.add(config.guildId);
        try {
            await this.stop(config.guildId);
            await checkChannels(this.client, config);
            const engine = createLfgSystem(config);
            try {
                await engine.start(this.client);
                this.engines.set(config.guildId, engine);
            } catch (error) {
                engine.stop();
                throw error;
            }
        } finally {
            this.changing.delete(config.guildId);
        }
    }
    async stop(id: string): Promise<void> {
        const engine = this.engines.get(id);
        this.engines.delete(id);
        await Promise.allSettled([...(this.operations.get(id) ?? [])]);
        engine?.stop();
    }
    async handle(interaction: Interaction): Promise<boolean> {
        const id = interaction.guildId;
        if (!id || this.changing.has(id)) return false;
        const engine = this.engines.get(id);
        if (!engine) return false;
        const active = this.operations.get(id) ?? new Set();
        this.operations.set(id, active);
        const job = engine.handle(interaction);
        active.add(job);
        try {
            return await job;
        } finally {
            active.delete(job);
            if (!active.size) this.operations.delete(id);
        }
    }
    async stopAll(): Promise<void> {
        await Promise.all([...this.engines.keys()].map((id) => this.stop(id)));
    }
}
