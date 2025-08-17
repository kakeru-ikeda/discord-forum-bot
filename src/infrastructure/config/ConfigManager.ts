import * as fs from 'fs';
import * as path from 'path';
import { EmojiConfig, EmojiUtils } from '../discord/EmojiUtils';

export interface IDiscordConfig {
    token: string;
    guildId: string;
    monitorChannelIds: string[];
    forumChannelId: string;
    alertChannelId: string;
    triggerEmoji: EmojiConfig;
    questionPrefix: string;
}

export interface ILoggingConfig {
    level: string;
    enableFileLogging: boolean;
    enableDiscordAlerts: boolean;
    logFilePath: string;
}

export interface IBotConfig {
    maxTitleLength: number;
    maxContentPreview: number;
}

export interface IConnectionConfig {
    healthCheckInterval: number;
    reconnectionStrategy: 'exponential' | 'fixed';
    exponentialBackoff: {
        baseDelay: number;
        maxDelay: number;
        maxRetries: number;
        backoffMultiplier: number;
    };
    fixedInterval: {
        interval: number;
        maxRetries: number;
    };
}

export interface IAppConfig {
    discord: IDiscordConfig;
    logging: ILoggingConfig;
    bot: IBotConfig;
    connection: IConnectionConfig;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private readonly appConfig: IAppConfig;

    private constructor() {
        this.appConfig = this.loadConfig();
    }

    private loadConfig(): IAppConfig {
        const configPath = path.join(process.cwd(), 'config', 'default.json');

        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found at: ${configPath}`);
        }

        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);

            // 設定の検証
            this.validateConfig(config);

            // EmojiConfigの変換
            return {
                discord: {
                    ...config.discord,
                    triggerEmoji: EmojiUtils.parseEmojiConfig(config.discord.triggerEmoji)
                },
                logging: config.logging,
                bot: config.bot,
                connection: config.connection
            };
        } catch (error) {
            throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private validateConfig(config: any): void {
        const requiredPaths = [
            'discord.token',
            'discord.guildId',
            'discord.monitorChannelIds',
            'discord.forumChannelId',
            'discord.alertChannelId'
        ];

        for (const path of requiredPaths) {
            const value = this.getNestedValue(config, path);
            if (value === undefined || value === null || value === '') {
                throw new Error(`Required configuration property is missing or empty: ${path}`);
            }
        }

        // 配列の検証
        if (!Array.isArray(config.discord.monitorChannelIds) || config.discord.monitorChannelIds.length === 0) {
            throw new Error('discord.monitorChannelIds must be a non-empty array');
        }

        // 数値の検証
        const numericPaths = [
            'bot.maxTitleLength',
            'bot.maxContentPreview',
            'connection.healthCheckInterval',
            'connection.exponentialBackoff.baseDelay',
            'connection.exponentialBackoff.maxDelay',
            'connection.exponentialBackoff.maxRetries',
            'connection.exponentialBackoff.backoffMultiplier',
            'connection.fixedInterval.interval',
            'connection.fixedInterval.maxRetries'
        ];

        for (const path of numericPaths) {
            const value = this.getNestedValue(config, path);
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(`Configuration property must be a valid number: ${path}`);
            }
        }

        // 戦略の検証
        if (!['exponential', 'fixed'].includes(config.connection.reconnectionStrategy)) {
            throw new Error('connection.reconnectionStrategy must be either "exponential" or "fixed"');
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public getConfig(): IAppConfig {
        return this.appConfig;
    }

    public getDiscordConfig(): IDiscordConfig {
        return this.appConfig.discord;
    }

    public getLoggingConfig(): ILoggingConfig {
        return this.appConfig.logging;
    }

    public getBotConfig(): IBotConfig {
        return this.appConfig.bot;
    }

    public getConnectionConfig(): IConnectionConfig {
        return this.appConfig.connection;
    }
}
