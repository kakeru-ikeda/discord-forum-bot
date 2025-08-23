import { Client, ForumChannel, ChannelType } from 'discord.js';
import { IForumRepository } from '../../domain/repositories/IForumRepository';
import { ForumPost } from '../../domain/entities/ForumPost';
import { ForumCreationStatus } from '../../domain/entities/ForumCreationStatus';
import { IDiscordAttachment } from '../../domain/entities/DiscordMessage';
import { ILogger } from '../logger/Logger';
import { ForumCreationStatusStorage } from '../storage/ForumCreationStatusStorage';

export class ForumRepository implements IForumRepository {
    constructor(
        private readonly client: Client,
        private readonly logger: ILogger,
        private readonly statusStorage: ForumCreationStatusStorage
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

    async postAttachments(threadId: string, attachments: IDiscordAttachment[]): Promise<void> {
        try {
            const thread = await this.client.channels.fetch(threadId);

            if (!thread || !thread.isThread()) {
                throw new Error(`Channel ${threadId} is not a thread`);
            }

            if (attachments.length === 0) {
                return;
            }

            // 添付ファイルのURLを含むメッセージを投稿
            const attachmentMessages: string[] = [];

            for (const attachment of attachments) {
                const fileType = this.getFileTypeEmoji(attachment);
                attachmentMessages.push(`${fileType} **${attachment.name}** (${this.formatFileSize(attachment.size)})`);
                attachmentMessages.push(attachment.url);
                attachmentMessages.push(''); // 空行を追加
            }

            if (attachmentMessages.length > 0) {
                // 最後の空行を除去
                attachmentMessages.pop();

                const content = [
                    '**📎 添付ファイル:**',
                    '',
                    ...attachmentMessages
                ].join('\n');

                await thread.send({ content });

                this.logger.info('Attachments posted to forum thread', {
                    threadId,
                    attachmentCount: attachments.length,
                });
            }
        } catch (error) {
            this.logger.error('Failed to post attachments to forum thread', {
                threadId,
                attachmentCount: attachments.length,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    private getFileTypeEmoji(attachment: IDiscordAttachment): string {
        const contentType = attachment.contentType?.toLowerCase() || '';
        const fileName = attachment.name.toLowerCase();

        // 画像ファイル
        if (contentType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
            return '🖼️';
        }

        // 動画ファイル
        if (contentType.startsWith('video/') || fileName.match(/\.(mp4|webm|avi|mov|mkv|flv|wmv)$/)) {
            return '🎥';
        }

        // 音声ファイル
        if (contentType.startsWith('audio/') || fileName.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/)) {
            return '🎵';
        }

        // ドキュメントファイル
        if (fileName.match(/\.(pdf|doc|docx|txt|rtf)$/)) {
            return '📄';
        }

        // スプレッドシート
        if (fileName.match(/\.(xls|xlsx|csv)$/)) {
            return '📊';
        }

        // プレゼンテーション
        if (fileName.match(/\.(ppt|pptx)$/)) {
            return '📽️';
        }

        // アーカイブファイル
        if (fileName.match(/\.(zip|rar|7z|tar|gz)$/)) {
            return '📦';
        }

        // コードファイル
        if (fileName.match(/\.(js|ts|html|css|py|java|cpp|c|php|rb|go|rs)$/)) {
            return '💻';
        }

        // デフォルト
        return '📁';
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

    getForumPostUrl(guildId: string, forumChannelId: string, forumPostId: string): string {
        return `https://discord.com/channels/${guildId}/${forumPostId}`;
    }

    async getForumCreationStatus(messageId: string, channelId: string): Promise<ForumCreationStatus | null> {
        try {
            return await this.statusStorage.get(messageId, channelId);
        } catch (error) {
            this.logger.error('Failed to get forum creation status', {
                messageId,
                channelId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async saveForumCreationStatus(status: ForumCreationStatus): Promise<void> {
        try {
            await this.statusStorage.save(status);
            this.logger.debug('Forum creation status saved', {
                messageId: status.messageId,
                channelId: status.channelId,
                forumPostId: status.forumPostId,
                createdBy: status.createdBy,
            });
        } catch (error) {
            this.logger.error('Failed to save forum creation status', {
                messageId: status.messageId,
                channelId: status.channelId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
