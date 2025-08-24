import { MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { ForumService } from '../services/ForumService';
import { ForumTagHandler } from './ForumTagHandler';
import { ILogger } from '../../infrastructure/logger/Logger';

export class ReactionHandler {
    constructor(
        private readonly forumService: ForumService,
        private readonly forumTagHandler: ForumTagHandler,
        private readonly logger: ILogger
    ) { }

    async handleReactionAdd(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
    ): Promise<void> {
        await this.handleReactionChange(reaction, user, 'add');
    }

    async handleReactionRemove(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
    ): Promise<void> {
        await this.handleReactionChange(reaction, user, 'remove');
    }

    private async handleReactionChange(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser,
        action: 'add' | 'remove'
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

            const emojiName = reaction.emoji.name;
            if (!emojiName) {
                this.logger.debug('Reaction has no emoji name', {
                    messageId: reaction.message.id,
                    userId: user.id,
                });
                return;
            }

            this.logger.debug(`Received reaction ${action}`, {
                messageId: reaction.message.id,
                channelId: reaction.message.channelId,
                guildId: reaction.message.guildId,
                emoji: emojiName,
                emojiId: reaction.emoji.id,
                userId: user.id,
                reactionCount: reaction.count,
                action,
            });

            // フォーラムサービスでリアクションを処理（フォーラム作成トリガーのみ、リアクション追加時のみ）
            if (action === 'add') {
                await this.forumService.handleReaction(
                    reaction.message.id,
                    reaction.message.channelId,
                    reaction.emoji,
                    user.id
                );
            }

            // フォーラム投稿でのタグ選択リアクションを処理
            // （フォーラムチャンネル内のスレッドでのリアクションかどうかを判定）
            if (reaction.message.channel?.isThread()) {
                if (action === 'add') {
                    await this.forumTagHandler.handleForumPostReactionAdd(
                        reaction.message.id,
                        reaction.message.channelId,
                        reaction.emoji,
                        user.id
                    );
                } else {
                    await this.forumTagHandler.handleForumPostReactionRemove(
                        reaction.message.id,
                        reaction.message.channelId,
                        reaction.emoji,
                        user.id
                    );
                }
            }

        } catch (error) {
            this.logger.error(`Unhandled error in reaction ${action} handler`, {
                messageId: reaction.message?.id,
                userId: user?.id,
                action,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            // エラーが発生してもハンドラーは継続
            // フォーラムサービス内でアラート通知済み
        }
    }
}
