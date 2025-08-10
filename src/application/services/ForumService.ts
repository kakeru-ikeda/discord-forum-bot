import { CreateForumUseCase, CreateForumResult } from '../../domain/usecases/CreateForumUseCase';
import { MonitorMessageUseCase } from '../../domain/usecases/MonitorMessageUseCase';
import { DiscordMessage } from '../../domain/entities/DiscordMessage';
import { ILogger } from '../../infrastructure/logger/Logger';
import { IAlertNotifier } from '../../infrastructure/logger/AlertNotifier';
import { EmojiConfig, EmojiUtils } from '../../infrastructure/discord/EmojiUtils';
import { ReactionEmoji, GuildEmoji, ApplicationEmoji } from 'discord.js';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';

export interface IForumServiceConfig {
    forumChannelId: string;
    questionPrefix: string;
    triggerEmoji: EmojiConfig;
    maxTitleLength: number;
}

export class ForumService {
    constructor(
        private readonly createForumUseCase: CreateForumUseCase,
        private readonly monitorMessageUseCase: MonitorMessageUseCase,
        private readonly messageRepository: IMessageRepository,
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

            // 監視対象のチャンネルかチェック
            const isMonitored = await this.messageRepository.isMonitoredChannel(message.channelId);
            if (!isMonitored) {
                this.logger.debug('Message is not from monitored channel', {
                    messageId: message.id,
                    channelId: message.channelId,
                });
                return;
            }

            // 質問プレフィックスで始まるかチェック
            const isQuestionMessage = message.isQuestionMessage(this.config.questionPrefix);

            // トリガー絵文字のリアクションがあるかチェック
            const hasReaction = await this.messageRepository.hasReaction(
                message.id,
                message.channelId,
                this.config.triggerEmoji
            );

            const shouldCreate = isQuestionMessage || hasReaction;

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
                isQuestionMessage,
                hasReaction,
            });

            const result: CreateForumResult = await this.createForumUseCase.execute(
                message,
                this.config.forumChannelId,
                this.config.maxTitleLength
            );

            // 新しくフォーラムが作成された場合のみ処理を続行
            if (!result.isNewForum) {
                this.logger.debug('Forum already exists for this message', {
                    messageId: message.id,
                    existingForumPostId: result.forumPostId,
                });
                return;
            }

            // 質問プレフィックスによってフォーラムが作成された場合、トリガー絵文字を追加
            if (isQuestionMessage && !hasReaction) {
                const reactionAdded = await this.messageRepository.addReaction(
                    message.id,
                    message.channelId,
                    this.config.triggerEmoji
                );

                if (reactionAdded) {
                    this.logger.info('Trigger emoji added to question message', {
                        messageId: message.id,
                        emoji: EmojiUtils.getIdentifier(this.config.triggerEmoji),
                    });
                } else {
                    this.logger.warn('Failed to add trigger emoji to question message', {
                        messageId: message.id,
                        emoji: EmojiUtils.getIdentifier(this.config.triggerEmoji),
                    });
                }
            }

            this.logger.info('Forum created successfully', {
                messageId: message.id,
                forumPostId: result.forumPostId,
                forumUrl: result.forumUrl,
                authorId: message.authorId,
            });

            await this.alertNotifier.sendAlert(
                'info',
                'Forum Created',
                `New forum post created from message by ${message.authorNickname}\nForum URL: ${result.forumUrl}`,
            );

        } catch (error) {
            this.logger.error('Failed to handle message for forum creation', {
                messageId: message.id,
                error: error instanceof Error ? error.message : String(error),
            });

            await this.alertNotifier.sendAlert(
                'error',
                'Forum Creation Failed',
                `Failed to create forum from message ${message.id} by ${message.authorNickname}`,
                error instanceof Error ? error : new Error(String(error))
            );

            // エラーが発生してもアプリケーションは継続
            // ログとアラートで通知済み
        }
    }

    async handleReaction(messageId: string, channelId: string, emoji: ReactionEmoji | GuildEmoji | ApplicationEmoji, userId: string): Promise<void> {
        try {
            // トリガー絵文字でない場合は無視
            if (!EmojiUtils.matchesReaction(this.config.triggerEmoji, emoji)) {
                return;
            }

            this.logger.debug('Processing reaction for forum creation', {
                messageId,
                channelId,
                emoji: EmojiUtils.getIdentifier(this.config.triggerEmoji),
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
                    emojiName: emoji.name,
                    emojiId: emoji.id,
                });
                return;
            }

            this.logger.info('Creating forum for reaction', {
                messageId,
                channelId,
                emojiName: emoji.name,
                emojiId: emoji.id,
                userId,
            });

            const result: CreateForumResult = await this.createForumUseCase.execute(
                message,
                this.config.forumChannelId,
                this.config.maxTitleLength,
                userId // リアクションしたユーザーIDを渡す
            );

            // 新しくフォーラムが作成された場合のみログ出力とアラート送信
            if (result.isNewForum) {
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
                    `New forum post created from reaction by user ${userId} on message by ${message.authorNickname}\nForum URL: ${result.forumUrl}`,
                );
            } else {
                this.logger.debug('Forum already exists for this message, skipping duplicate creation', {
                    messageId,
                    existingForumPostId: result.forumPostId,
                    reactionUserId: userId,
                });
            }

        } catch (error) {
            this.logger.error('Failed to handle reaction for forum creation', {
                messageId,
                channelId,
                emojiName: emoji.name,
                emojiId: emoji.id,
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
