import { DiscordClient } from '../../infrastructure/discord/DiscordClient';
import { ForumRepository } from '../../infrastructure/discord/ForumRepository';
import { MessageRepository } from '../../infrastructure/discord/MessageRepository';
import { Logger } from '../../infrastructure/logger/Logger';
import { AlertNotifier } from '../../infrastructure/logger/AlertNotifier';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { CreateForumUseCase } from '../../domain/usecases/CreateForumUseCase';
import { MonitorMessageUseCase } from '../../domain/usecases/MonitorMessageUseCase';
import { ConnectionMonitorUseCase } from '../../domain/usecases/ConnectionMonitorUseCase';
import { ForumService } from '../../application/services/ForumService';
import { ConnectionService } from '../../application/services/ConnectionService';
import { MessageHandler } from '../../application/handlers/MessageHandler';
import { ReactionHandler } from '../../application/handlers/ReactionHandler';
import { DiscordConnectionManager } from '../../infrastructure/connection/DiscordConnectionManager';
import { ExponentialBackoffStrategy, FixedIntervalStrategy } from '../../infrastructure/connection/ReconnectionStrategy';
import { ForumCreationStatusStorage } from '../../infrastructure/storage/ForumCreationStatusStorage';

export class BotManager {
    private discordClient: DiscordClient;
    private logger: Logger;
    private alertNotifier: AlertNotifier;
    private messageHandler: MessageHandler;
    private reactionHandler: ReactionHandler;
    private connectionService!: ConnectionService;
    private isShuttingDown: boolean = false;

    constructor() {
        const config = ConfigManager.getInstance();
        const appConfig = config.getConfig();

        // Logger の初期化
        this.logger = new Logger(appConfig.logging);

        // Discord Client の初期化
        this.discordClient = new DiscordClient(this.logger);

        // Alert Notifier の初期化
        this.alertNotifier = new AlertNotifier(
            this.discordClient.getClient(),
            appConfig.discord.alertChannelId,
            this.logger,
            appConfig.logging.enableDiscordAlerts
        );

        // Storage の初期化
        const forumCreationStatusStorage = new ForumCreationStatusStorage();

        // Repository の初期化
        const forumRepository = new ForumRepository(
            this.discordClient.getClient(),
            this.logger,
            forumCreationStatusStorage
        );

        const messageRepository = new MessageRepository(
            this.discordClient.getClient(),
            appConfig.discord.monitorChannelIds,
            this.logger
        );

        // UseCase の初期化
        const createForumUseCase = new CreateForumUseCase(forumRepository, messageRepository);
        const monitorMessageUseCase = new MonitorMessageUseCase(messageRepository);

        // Service の初期化
        const forumService = new ForumService(
            createForumUseCase,
            monitorMessageUseCase,
            messageRepository,
            {
                forumChannelId: appConfig.discord.forumChannelId,
                questionPrefix: appConfig.discord.questionPrefix,
                triggerEmoji: appConfig.discord.triggerEmoji,
                maxTitleLength: appConfig.bot.maxTitleLength,
            },
            this.logger,
            this.alertNotifier
        );

        // Handler の初期化
        this.messageHandler = new MessageHandler(forumService, this.logger);
        this.reactionHandler = new ReactionHandler(forumService, this.logger);

        // 接続管理機能の初期化
        this.setupConnectionManagement();

        // エラーハンドリングの設定
        this.setupErrorHandling();
    }

    private setupConnectionManagement(): void {
        const config = ConfigManager.getInstance();
        const connectionConfig = config.getConnectionConfig();
        const discordConfig = config.getDiscordConfig();

        // 再接続戦略の選択
        const reconnectionStrategy = connectionConfig.reconnectionStrategy === 'exponential'
            ? new ExponentialBackoffStrategy(
                connectionConfig.exponentialBackoff.baseDelay,
                connectionConfig.exponentialBackoff.maxDelay,
                connectionConfig.exponentialBackoff.maxRetries,
                connectionConfig.exponentialBackoff.backoffMultiplier
            )
            : new FixedIntervalStrategy(
                connectionConfig.fixedInterval.interval,
                connectionConfig.fixedInterval.maxRetries
            );

        // 接続管理インスタンスの作成
        const connectionManager = new DiscordConnectionManager(
            this.discordClient.getClient(),
            reconnectionStrategy,
            this.logger,
            discordConfig.token,
            connectionConfig.healthCheckInterval
        );

        // Use Caseの初期化
        const connectionMonitorUseCase = new ConnectionMonitorUseCase(connectionManager);

        // 接続サービスの初期化
        this.connectionService = new ConnectionService(
            connectionMonitorUseCase,
            this.logger,
            this.alertNotifier
        );
    }

    private setupErrorHandling(): void {
        // 未処理の例外をキャッチ
        process.on('uncaughtException', async (error) => {
            this.logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
            await this.alertNotifier.sendAlert(
                'error',
                'Uncaught Exception',
                'Critical error: Uncaught exception occurred',
                error
            );

            // アプリケーションの継続を試みる
            if (!this.isShuttingDown) {
                this.logger.info('Attempting to continue after uncaught exception');
            }
        });

        // 未処理のPromise拒否をキャッチ
        process.on('unhandledRejection', async (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            this.logger.error('Unhandled Rejection', { error: error.message, stack: error.stack });
            await this.alertNotifier.sendAlert(
                'error',
                'Unhandled Promise Rejection',
                'Critical error: Unhandled promise rejection',
                error
            );

            // アプリケーションの継続を試みる
            if (!this.isShuttingDown) {
                this.logger.info('Attempting to continue after unhandled rejection');
            }
        });

        // Graceful shutdown
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    }

    public async start(): Promise<void> {
        try {
            const environment = process.env.NODE_ENV || 'development';
            const isProduction = environment === 'production';

            this.logger.info(`Starting Discord Forum Bot... (Environment: ${environment})`);

            const config = ConfigManager.getInstance();
            const discordConfig = config.getDiscordConfig();
            const appConfig = config.getConfig();

            // 設定情報をログに出力（機密情報は除く）
            this.logger.info('Bot Configuration:', {
                environment: `${environment}`,
                guildId: discordConfig.guildId,
                monitorChannels: discordConfig.monitorChannelIds.length,
                forumChannelId: discordConfig.forumChannelId,
                alertChannelId: discordConfig.alertChannelId,
                questionPrefix: discordConfig.questionPrefix,
                triggerEmoji: discordConfig.triggerEmoji,
                logLevel: appConfig.logging.level,
                fileLogging: appConfig.logging.enableFileLogging,
                discordAlerts: appConfig.logging.enableDiscordAlerts
            });

            // Discord イベントハンドラーの登録
            this.discordClient.addMessageHandler(async (message) => {
                await this.messageHandler.handleMessage(message);
            });

            this.discordClient.addReactionHandler(async (reaction, user) => {
                await this.reactionHandler.handleReaction(reaction, user);
            });

            // Discord にログイン
            await this.discordClient.login(discordConfig.token);

            // 接続監視を開始
            await this.connectionService.start();

            // 起動成功をアラート
            await this.alertNotifier.sendAlert(
                'info',
                'Bot Started',
                `Discord Forum Bot has started successfully (Environment: ${environment})`
            );

            this.logger.info(`Discord Forum Bot started successfully (Environment: ${environment})`);

        } catch (error) {
            this.logger.error('Failed to start bot', { error: error instanceof Error ? error.message : String(error) });
            await this.alertNotifier.sendAlert(
                'error',
                'Bot Startup Failed',
                'Failed to start Discord Forum Bot',
                error instanceof Error ? error : new Error(String(error))
            );
            throw error;
        }
    }

    private async gracefulShutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        this.logger.info(`Received ${signal}. Starting graceful shutdown...`);

        try {
            await this.alertNotifier.sendAlert(
                'info',
                'Bot Shutting Down',
                `Discord Forum Bot is shutting down (${signal})`
            );

            // 接続監視を停止
            this.connectionService.stop();

            await this.discordClient.shutdown();
            this.logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            this.logger.error('Error during graceful shutdown', { error: error instanceof Error ? error.message : String(error) });
            process.exit(1);
        }
    }

    /**
     * 手動で再接続を実行
     */
    public async forceReconnect(): Promise<boolean> {
        if (this.isShuttingDown) {
            this.logger.warn('Cannot reconnect during shutdown');
            return false;
        }

        this.logger.info('Manual reconnection requested via BotManager');
        return await this.connectionService.forceReconnect();
    }

    /**
     * 接続状態を取得
     */
    public getConnectionStatus() {
        return this.connectionService.getStatus();
    }
}
