import { CreateForumUseCase, CreateForumResult } from '../../domain/usecases/CreateForumUseCase';
import { MonitorMessageUseCase } from '../../domain/usecases/MonitorMessageUseCase';
import { DiscordMessage } from '../../domain/entities/DiscordMessage';
import { ILogger } from '../../infrastructure/logger/Logger';
import { IAlertNotifier } from '../../infrastructure/logger/AlertNotifier';

export interface IForumServiceConfig {
    forumChannelId: string;
    questionPrefix: string;
    triggerEmoji: string;
    maxTitleLength: number;
}

export class ForumService {
    constructor(
        private readonly createForumUseCase: CreateForumUseCase,
        private readonly monitorMessageUseCase: MonitorMessageUseCase,
        private readonly config: IForumServiceConfig,
        private readonly logger: ILogger,
        private readonly alertNotifier: IAlertNotifier
    ) { }

    async handleMessage(message: DiscordMessage): Promise<void> {
        try {
            this.logger.debug('Processing message for forum creation', {
                messageId: message.id,
                authorId: message.authorId,
                channelId: message.channelId,
                content: message.getContentPreview(100),
            });

            const shouldCreate = await this.monitorMessageUseCase.shouldCreateForum(
                message,
                this.config.questionPrefix,
                this.config.triggerEmoji
            );

            if (!shouldCreate) {
                this.logger.debug('Message does not meet forum creation criteria', {
                    messageId: message.id,
                });
                return;
            }

            this.logger.info('Creating forum for message', {
                messageId: message.id,
                authorId: message.authorId,
                channelId: message.channelId,
            });

            const result: CreateForumResult = await this.createForumUseCase.execute(
                message,
                this.config.forumChannelId,
                this.config.maxTitleLength
            );

            this.logger.info('Forum created successfully', {
                messageId: message.id,
                forumPostId: result.forumPostId,
                forumUrl: result.forumUrl,
                authorId: message.authorId,
            });

            await this.alertNotifier.sendAlert(
                'info',
                'Forum Created',
                `New forum post created from message by ${message.authorName}\nForum URL: ${result.forumUrl}`,
            );

        } catch (error) {
            this.logger.error('Failed to handle message for forum creation', {
                messageId: message.id,
                error: error instanceof Error ? error.message : String(error),
            });

            await this.alertNotifier.sendAlert(
                'error',
                'Forum Creation Failed',
                `Failed to create forum from message ${message.id} by ${message.authorName}`,
                error instanceof Error ? error : new Error(String(error))
            );

            // エラーが発生してもアプリケーションは継続
            // ログとアラートで通知済み
        }
    }

    async handleReaction(messageId: string, channelId: string, emoji: string, userId: string): Promise<void> {
        try {
            // トリガー絵文字でない場合は無視
            if (emoji !== this.config.triggerEmoji) {
                return;
            }

            this.logger.debug('Processing reaction for forum creation', {
                messageId,
                channelId,
                emoji,
                userId,
            });

            // メッセージを取得
            const message = await this.monitorMessageUseCase.getMessage(messageId, channelId);
            if (!message) {
                this.logger.warn('Message not found for reaction handling', {
                    messageId,
                    channelId,
                });
                return;
            }

            // フォーラム作成の条件をチェック
            const shouldCreate = await this.monitorMessageUseCase.shouldCreateForum(
                message,
                this.config.questionPrefix,
                this.config.triggerEmoji
            );

            if (!shouldCreate) {
                this.logger.debug('Reaction does not meet forum creation criteria', {
                    messageId,
                    emoji,
                });
                return;
            }

            this.logger.info('Creating forum for reaction', {
                messageId,
                channelId,
                emoji,
                userId,
            });

            const result: CreateForumResult = await this.createForumUseCase.execute(
                message,
                this.config.forumChannelId,
                this.config.maxTitleLength
            );

            this.logger.info('Forum created successfully from reaction', {
                messageId,
                forumPostId: result.forumPostId,
                forumUrl: result.forumUrl,
                reactionUserId: userId,
                originalAuthor: message.authorId,
            });

            await this.alertNotifier.sendAlert(
                'info',
                'Forum Created from Reaction',
                `New forum post created from reaction by user ${userId} on message by ${message.authorName}\nForum URL: ${result.forumUrl}`,
            );

        } catch (error) {
            this.logger.error('Failed to handle reaction for forum creation', {
                messageId,
                channelId,
                emoji,
                userId,
                error: error instanceof Error ? error.message : String(error),
            });

            await this.alertNotifier.sendAlert(
                'error',
                'Forum Creation from Reaction Failed',
                `Failed to create forum from reaction on message ${messageId}`,
                error instanceof Error ? error : new Error(String(error))
            );

            // エラーが発生してもアプリケーションは継続
        }
    }
}
