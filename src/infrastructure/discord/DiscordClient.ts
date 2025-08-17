import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { ILogger } from '../logger/Logger';

export class DiscordClient {
    private client: Client;
    private isReady: boolean = false;

    constructor(private readonly logger: ILogger) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent,
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
            ],
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.once('ready', () => {
            this.isReady = true;
            this.logger.info(`Bot is ready! Logged in as ${this.client.user?.tag}`);
        });

        this.client.on('error', (error) => {
            this.logger.error('Discord client error', { error: error.message, stack: error.stack });
        });

        this.client.on('warn', (warning) => {
            this.logger.warn('Discord client warning', { warning });
        });
    }

    public async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
            this.logger.info('Successfully logged in to Discord');
        } catch (error) {
            this.logger.error('Failed to login to Discord', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    public getLoginToken(): string | null {
        return this.client.token;
    }

    public async shutdown(): Promise<void> {
        try {
            if (this.client) {
                await this.client.destroy();
                this.isReady = false;
                this.logger.info('Discord client shutdown completed');
            }
        } catch (error) {
            this.logger.error('Error during Discord client shutdown', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    public getClient(): Client {
        return this.client;
    }

    public isClientReady(): boolean {
        return this.isReady && this.client.isReady();
    }

    public addMessageHandler(handler: (message: any) => Promise<void>): void {
        this.client.on('messageCreate', async (message) => {
            try {
                await handler(message);
            } catch (error) {
                this.logger.error('Error in message handler', { error: error instanceof Error ? error.message : String(error) });
            }
        });
    }

    public addReactionHandler(handler: (reaction: any, user: any) => Promise<void>): void {
        this.client.on('messageReactionAdd', async (reaction, user) => {
            try {
                await handler(reaction, user);
            } catch (error) {
                this.logger.error('Error in reaction handler', { error: error instanceof Error ? error.message : String(error) });
            }
        });
    }

    public addThreadHandler(handler: (oldThread: any, newThread: any) => Promise<void>): void {
        this.client.on('threadUpdate', async (oldThread, newThread) => {
            try {
                await handler(oldThread, newThread);
            } catch (error) {
                this.logger.error('Error in thread handler', { error: error instanceof Error ? error.message : String(error) });
            }
        });
    }
}
