import { Client, ForumChannel, ChannelType } from 'discord.js';
import { IForumRepository } from '../../domain/repositories/IForumRepository';
import { ForumPost } from '../../domain/entities/ForumPost';
import { ILogger } from '../logger/Logger';

export class ForumRepository implements IForumRepository {
    constructor(
        private readonly client: Client,
        private readonly logger: ILogger
    ) { }

    async createForumPost(forumChannelId: string, forumPost: ForumPost): Promise<string> {
        try {
            const channel = await this.client.channels.fetch(forumChannelId);

            if (!channel || channel.type !== ChannelType.GuildForum) {
                throw new Error(`Channel ${forumChannelId} is not a forum channel`);
            }

            const forumChannel = channel as ForumChannel;

            // フォーラム投稿を作成
            const thread = await forumChannel.threads.create({
                name: forumPost.title,
                message: {
                    content: forumPost.content,
                },
            });

            this.logger.info('Forum post created successfully', {
                forumPostId: thread.id,
                title: forumPost.title,
                authorId: forumPost.authorId,
                originalMessageId: forumPost.originalMessageId,
            });

            return thread.id;
        } catch (error) {
            this.logger.error('Failed to create forum post', {
                forumChannelId,
                title: forumPost.title,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    async isForumChannelAccessible(forumChannelId: string): Promise<boolean> {
        try {
            const channel = await this.client.channels.fetch(forumChannelId);

            if (!channel) {
                this.logger.warn('Forum channel not found', { forumChannelId });
                return false;
            }

            if (channel.type !== ChannelType.GuildForum) {
                this.logger.warn('Channel is not a forum channel', {
                    forumChannelId,
                    actualType: channel.type
                });
                return false;
            }

            // 権限チェック（投稿権限があるか）
            const forumChannel = channel as ForumChannel;
            const botMember = forumChannel.guild.members.cache.get(this.client.user?.id || '');

            if (!botMember) {
                this.logger.warn('Bot member not found in guild', { forumChannelId });
                return false;
            }

            const permissions = forumChannel.permissionsFor(botMember);
            const canCreateThreads = permissions?.has('CreatePublicThreads') || permissions?.has('SendMessages');

            if (!canCreateThreads) {
                this.logger.warn('Bot does not have permission to create threads in forum channel', {
                    forumChannelId
                });
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Error checking forum channel accessibility', {
                forumChannelId,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}
