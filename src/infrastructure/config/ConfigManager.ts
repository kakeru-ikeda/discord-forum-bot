import * as fs from 'fs';
import * as path from 'path';
import { EmojiConfig, EmojiUtils } from '../discord/EmojiUtils';

export interface IChannelMapping {
    monitorChannelId: string;
    forumChannelId: string;
}

export interface IDiscordConfig {
    token: string;
    guildId: string;
    channelMappings: IChannelMapping[];
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
            'discord.channelMappings',
            'discord.alertChannelId'
        ];

        for (const path of requiredPaths) {
            const value = this.getNestedValue(config, path);
            if (value === undefined || value === null || value === '') {
                throw new Error(`Required configuration property is missing or empty: ${path}`);
            }
        }

        // チャンネルマッピングの検証
        if (!Array.isArray(config.discord.channelMappings) || config.discord.channelMappings.length === 0) {
            throw new Error('discord.channelMappings must be a non-empty array');
        }

        // 各チャンネルマッピングの検証
        for (let i = 0; i < config.discord.channelMappings.length; i++) {
            const mapping = config.discord.channelMappings[i];
            if (!mapping.monitorChannelId || !mapping.forumChannelId) {
                throw new Error(`Invalid channel mapping at index ${i}: both monitorChannelId and forumChannelId are required`);
            }
            if (typeof mapping.monitorChannelId !== 'string' || typeof mapping.forumChannelId !== 'string') {
                throw new Error(`Invalid channel mapping at index ${i}: channel IDs must be strings`);
            }
        }

        // 重複チェック
        const monitorChannelIds = config.discord.channelMappings.map((m: any) => m.monitorChannelId);
        const uniqueMonitorChannelIds = new Set(monitorChannelIds);
        if (monitorChannelIds.length !== uniqueMonitorChannelIds.size) {
            throw new Error('Duplicate monitor channel IDs found in channel mappings');
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

    /**
     * 監視チャンネルIDから対応するフォーラムチャンネルIDを取得
     * @param monitorChannelId 監視チャンネルID
     * @returns フォーラムチャンネルID（見つからない場合はundefined）
     */
    public getForumChannelId(monitorChannelId: string): string | undefined {
        const mapping = this.appConfig.discord.channelMappings.find(
            mapping => mapping.monitorChannelId === monitorChannelId
        );
        return mapping?.forumChannelId;
    }

    /**
     * 監視チャンネルIDのリストを取得
     * @returns 監視チャンネルIDの配列
     */
    public getMonitorChannelIds(): string[] {
        return this.appConfig.discord.channelMappings.map(mapping => mapping.monitorChannelId);
    }

    /**
     * チャンネルマッピングの設定を取得
     * @returns チャンネルマッピング配列
     */
    public getChannelMappings(): IChannelMapping[] {
        return this.appConfig.discord.channelMappings;
    }
}
