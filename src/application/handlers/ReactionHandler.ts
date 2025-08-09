import { MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { ForumService } from '../services/ForumService';
import { ILogger } from '../../infrastructure/logger/Logger';

export class ReactionHandler {
    constructor(
        private readonly forumService: ForumService,
        private readonly logger: ILogger
    ) { }

    async handleReaction(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
    ): Promise<void> {
        try {
            // パーシャルな場合はフェッチ
            if (reaction.partial) {
                reaction = await reaction.fetch();
            }

            if (user.partial) {
                user = await user.fetch();
            }

            // ボット自身のリアクションは無視
            if (user.bot) {
                return;
            }

            // メッセージが存在しない場合は無視
            if (!reaction.message) {
                return;
            }

            // DM は無視（ギルドメッセージのみ処理）
            if (!reaction.message.guildId) {
                return;
            }

            const emoji = reaction.emoji.name;
            if (!emoji) {
                this.logger.debug('Reaction has no emoji name', {
                    messageId: reaction.message.id,
                    userId: user.id,
                });
                return;
            }

            this.logger.debug('Received reaction', {
                messageId: reaction.message.id,
                channelId: reaction.message.channelId,
                guildId: reaction.message.guildId,
                emoji,
                userId: user.id,
                reactionCount: reaction.count,
            });

            // フォーラムサービスでリアクションを処理
            await this.forumService.handleReaction(
                reaction.message.id,
                reaction.message.channelId,
                emoji,
                user.id
            );

        } catch (error) {
            this.logger.error('Unhandled error in reaction handler', {
                messageId: reaction.message?.id,
                userId: user?.id,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            // エラーが発生してもハンドラーは継続
            // フォーラムサービス内でアラート通知済み
        }
    }
}
