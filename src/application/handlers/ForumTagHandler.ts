import { ForumTagUseCase } from '../../domain/usecases/ForumTagUseCase';
import { IForumRepository } from '../../domain/repositories/IForumRepository';
import { ILogger } from '../../infrastructure/logger/Logger';
import { IAlertNotifier } from '../../infrastructure/logger/AlertNotifier';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { ReactionEmoji, GuildEmoji, ApplicationEmoji, Client, ChannelType } from 'discord.js';

export class ForumTagHandler {
    constructor(
        private readonly forumTagUseCase: ForumTagUseCase,
        private readonly forumRepository: IForumRepository,
        private readonly client: Client,
        private readonly logger: ILogger,
        private readonly alertNotifier: IAlertNotifier
    ) { }

    /**
     * フォーラム投稿へのリアクション追加を処理してタグを適用する
     */
    async handleForumPostReactionAdd(
        messageId: string,
        channelId: string,
        emoji: ReactionEmoji | GuildEmoji | ApplicationEmoji,
        userId: string
    ): Promise<void> {
        await this.handleForumPostReactionChange(messageId, channelId, emoji, userId, 'add');
    }

    /**
     * フォーラム投稿へのリアクション削除を処理してタグを除去する
     */
    async handleForumPostReactionRemove(
        messageId: string,
        channelId: string,
        emoji: ReactionEmoji | GuildEmoji | ApplicationEmoji,
        userId: string
    ): Promise<void> {
        await this.handleForumPostReactionChange(messageId, channelId, emoji, userId, 'remove');
    }

    /**
     * フォーラム投稿へのリアクションを処理してタグを適用/除去する
     */
    private async handleForumPostReactionChange(
        messageId: string,
        channelId: string,
        emoji: ReactionEmoji | GuildEmoji | ApplicationEmoji,
        userId: string,
        action: 'add' | 'remove'
    ): Promise<void> {
        try {
            this.logger.debug(`Processing forum post reaction ${action}`, {
                messageId,
                channelId,
                emojiName: emoji.name,
                emojiId: emoji.id,
                userId,
                action,
            });

            // 対応するフォーラムチャンネルIDを取得
            // channelIdはフォーラムのスレッドID（フォーラム投稿ID）なので、親チャンネルを取得
            const thread = await this.client.channels.fetch(channelId);
            if (!thread || !thread.isThread()) {
                this.logger.debug('Channel is not a thread, ignoring reaction', {
                    messageId,
                    channelId,
                });
                return;
            }

            const forumChannelId = thread.parentId;
            if (!forumChannelId) {
                this.logger.debug('Thread has no parent channel, ignoring reaction', {
                    messageId,
                    channelId,
                });
                return;
            }

            // 親チャンネルがフォーラムチャンネルかどうか確認
            const parentChannel = await this.client.channels.fetch(forumChannelId);
            if (!parentChannel || parentChannel.type !== ChannelType.GuildForum) {
                this.logger.debug('Parent channel is not a forum channel, ignoring reaction', {
                    messageId,
                    channelId,
                    parentChannelId: forumChannelId,
                });
                return;
            }

            // フォーラムチャンネルのタグを取得
            const availableTags = await this.forumTagUseCase.getTagsWithEmoji(forumChannelId);

            // リアクションした絵文字に対応するタグを検索
            const emojiIdentifier = emoji.id || emoji.name || '';
            const matchingTag = this.forumTagUseCase.findTagByEmoji(availableTags, emojiIdentifier);

            if (!matchingTag) {
                this.logger.debug('No matching tag found for emoji reaction', {
                    messageId,
                    channelId,
                    emojiIdentifier,
                    action,
                });
                return;
            }

            this.logger.info(`${action === 'add' ? 'Applying' : 'Removing'} tag ${action === 'add' ? 'to' : 'from'} forum post based on reaction`, {
                messageId,
                channelId,
                forumChannelId,
                tagId: matchingTag.id,
                tagName: matchingTag.name,
                userId,
                action,
            });

            // 現在のタグを取得
            const currentTags = await this.forumTagUseCase.getCurrentForumPostTags(channelId);
            let newTagIds: string[];

            if (action === 'add') {
                // タグを追加（既に存在しない場合のみ）
                if (!currentTags.includes(matchingTag.id)) {
                    newTagIds = [...currentTags, matchingTag.id];
                } else {
                    this.logger.debug('Tag already exists on forum post', {
                        messageId,
                        channelId,
                        tagId: matchingTag.id,
                        tagName: matchingTag.name,
                    });
                    return;
                }
            } else {
                // リアクション削除時: 該当する絵文字のリアクション数をチェック
                const reactionCount = await this.checkReactionCount(messageId, channelId, emojiIdentifier);

                if (reactionCount > 0) {
                    // まだ他の人がリアクションしている場合はタグを残す
                    this.logger.debug('Other users still have reactions, keeping tag', {
                        messageId,
                        channelId,
                        tagId: matchingTag.id,
                        tagName: matchingTag.name,
                        remainingReactions: reactionCount,
                    });
                    return;
                }

                // 誰もリアクションしていない場合のみタグを削除
                newTagIds = currentTags.filter((tagId: string) => tagId !== matchingTag.id);
                if (currentTags.length === newTagIds.length) {
                    this.logger.debug('Tag was not present on forum post', {
                        messageId,
                        channelId,
                        tagId: matchingTag.id,
                        tagName: matchingTag.name,
                    });
                    return;
                }
            }

            // フォーラム投稿にタグセットを適用（完全な上書き）
            await this.forumTagUseCase.applyTagsToForumPost(
                forumChannelId,
                channelId, // channelIdがフォーラム投稿（スレッド）のID
                newTagIds
            );

            this.logger.info(`Tag ${action === 'add' ? 'applied to' : 'removed from'} forum post successfully`, {
                messageId,
                channelId: channelId,
                tagId: matchingTag.id,
                tagName: matchingTag.name,
                appliedBy: userId,
                action,
                totalTags: newTagIds.length,
                tagList: newTagIds,
            });

        } catch (error) {
            this.logger.error('Failed to handle forum post reaction for tagging', {
                messageId,
                channelId,
                emojiName: emoji.name,
                emojiId: emoji.id,
                userId,
                error: error instanceof Error ? error.message : String(error),
            });

            await this.alertNotifier.sendAlert(
                'error',
                'Forum Tag Application Failed',
                `Failed to apply tag based on reaction in forum post ${channelId}`,
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * 特定の絵文字のリアクション数をチェック（ボットを除く）
     */
    private async checkReactionCount(messageId: string, channelId: string, emojiIdentifier: string): Promise<number> {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isThread()) {
                return 0;
            }

            const message = await channel.messages.fetch(messageId);
            if (!message) {
                return 0;
            }

            // 該当する絵文字のリアクションを検索
            const targetReaction = message.reactions.cache.find(reaction => {
                if (reaction.emoji.id) {
                    // カスタム絵文字の場合
                    return reaction.emoji.id === emojiIdentifier;
                } else {
                    // Unicode絵文字の場合
                    return reaction.emoji.name === emojiIdentifier;
                }
            });

            if (!targetReaction) {
                return 0;
            }

            // ボットのリアクションを除外したカウントを取得
            const users = await targetReaction.users.fetch();
            const nonBotUsers = users.filter(user => !user.bot);

            this.logger.debug('Reaction count check', {
                messageId,
                channelId,
                emojiIdentifier,
                totalCount: targetReaction.count,
                nonBotCount: nonBotUsers.size,
            });

            return nonBotUsers.size;
        } catch (error) {
            this.logger.error('Failed to check reaction count', {
                messageId,
                channelId,
                emojiIdentifier,
                error: error instanceof Error ? error.message : String(error),
            });
            return 0;
        }
    }
}
