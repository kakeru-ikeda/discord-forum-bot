import { DiscordClient } from '../../infrastructure/discord/DiscordClient';
import { ForumRepository } from '../../infrastructure/discord/ForumRepository';
import { MessageRepository } from '../../infrastructure/discord/MessageRepository';
import { Logger } from '../../infrastructure/logger/Logger';
import { AlertNotifier } from '../../infrastructure/logger/AlertNotifier';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { CreateForumUseCase } from '../../domain/usecases/CreateForumUseCase';
import { MonitorMessageUseCase } from '../../domain/usecases/MonitorMessageUseCase';
import { ForumService } from '../../application/services/ForumService';
import { MessageHandler } from '../../application/handlers/MessageHandler';
import { ReactionHandler } from '../../application/handlers/ReactionHandler';

export class BotManager {
    private discordClient: DiscordClient;
    private logger: Logger;
    private alertNotifier: AlertNotifier;
    private messageHandler: MessageHandler;
    private reactionHandler: ReactionHandler;
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

        // Repository の初期化
        const forumRepository = new ForumRepository(
            this.discordClient.getClient(),
            this.logger
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

        // エラーハンドリングの設定
        this.setupErrorHandling();
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
            this.logger.info('Starting Discord Forum Bot...');

            const config = ConfigManager.getInstance();
            const discordConfig = config.getDiscordConfig();

            // Discord イベントハンドラーの登録
            this.discordClient.addMessageHandler(async (message) => {
                await this.messageHandler.handleMessage(message);
            });

            this.discordClient.addReactionHandler(async (reaction, user) => {
                await this.reactionHandler.handleReaction(reaction, user);
            });

            // Discord にログイン
            await this.discordClient.login(discordConfig.token);

            // 起動成功をアラート
            await this.alertNotifier.sendAlert(
                'info',
                'Bot Started',
                'Discord Forum Bot has started successfully'
            );

            this.logger.info('Discord Forum Bot started successfully');

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

            await this.discordClient.shutdown();
            this.logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            this.logger.error('Error during graceful shutdown', { error: error instanceof Error ? error.message : String(error) });
            process.exit(1);
        }
    }
}
