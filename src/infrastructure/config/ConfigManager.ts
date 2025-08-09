import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

export interface IDiscordConfig {
    token: string;
    guildId: string;
    monitorChannelIds: string[];
    forumChannelId: string;
    alertChannelId: string;
    triggerEmoji: string;
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

export interface IAppConfig {
    discord: IDiscordConfig;
    logging: ILoggingConfig;
    bot: IBotConfig;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private readonly appConfig: IAppConfig;

    private constructor() {
        this.validateRequiredEnvVars();

        this.appConfig = {
            discord: {
                token: this.getEnvVar('DISCORD_TOKEN'),
                guildId: this.getEnvVar('GUILD_ID'),
                monitorChannelIds: this.getEnvVar('MONITOR_CHANNEL_IDS').split(',').map(id => id.trim()),
                forumChannelId: this.getEnvVar('FORUM_CHANNEL_ID'),
                alertChannelId: this.getEnvVar('ALERT_CHANNEL_ID'),
                triggerEmoji: this.getEnvVar('TRIGGER_EMOJI', '🙋'),
                questionPrefix: this.getEnvVar('QUESTION_PREFIX', '質問！'),
            },
            logging: {
                level: this.getEnvVar('LOG_LEVEL', 'info'),
                enableFileLogging: this.getBooleanEnvVar('ENABLE_FILE_LOGGING', true),
                enableDiscordAlerts: this.getBooleanEnvVar('ENABLE_DISCORD_ALERTS', true),
                logFilePath: this.getEnvVar('LOG_FILE_PATH', './logs/bot.log'),
            },
            bot: {
                maxTitleLength: this.getNumberEnvVar('MAX_TITLE_LENGTH', 100),
                maxContentPreview: this.getNumberEnvVar('MAX_CONTENT_PREVIEW', 200),
            },
        };
    }

    private validateRequiredEnvVars(): void {
        const required = [
            'DISCORD_TOKEN',
            'GUILD_ID',
            'MONITOR_CHANNEL_IDS',
            'FORUM_CHANNEL_ID',
            'ALERT_CHANNEL_ID'
        ];

        const missing = required.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    private getEnvVar(key: string, defaultValue?: string): string {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${key} is required but not set`);
        }
        return value;
    }

    private getBooleanEnvVar(key: string, defaultValue: boolean): boolean {
        const value = process.env[key];
        if (value === undefined) {
            return defaultValue;
        }
        return value.toLowerCase() === 'true' || value === '1';
    }

    private getNumberEnvVar(key: string, defaultValue: number): number {
        const value = process.env[key];
        if (value === undefined) {
            return defaultValue;
        }
        const num = parseInt(value, 10);
        if (isNaN(num)) {
            throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
        }
        return num;
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
}
