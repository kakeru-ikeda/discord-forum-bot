import { Client, TextChannel, ChannelType } from 'discord.js';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { DiscordMessage } from '../../domain/entities/DiscordMessage';
import { ILogger } from '../logger/Logger';
import { EmojiConfig, EmojiUtils } from './EmojiUtils';

export class MessageRepository implements IMessageRepository {
    constructor(
        private readonly client: Client,
        private readonly monitorChannelIds: string[],
        private readonly logger: ILogger
    ) { }

    async getMessage(messageId: string, channelId: string): Promise<DiscordMessage | null> {
        try {
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                this.logger.warn('Channel not found or not text-based', { channelId });
                return null;
            }

            const message = await (channel as TextChannel).messages.fetch(messageId);

            if (!message) {
                this.logger.warn('Message not found', { messageId, channelId });
                return null;
            }

            return DiscordMessage.fromDiscordJSMessage(message);
        } catch (error) {
            this.logger.error('Failed to fetch message', {
                messageId,
                channelId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async isMonitoredChannel(channelId: string): Promise<boolean> {
        const isMonitored = this.monitorChannelIds.includes(channelId);

        this.logger.debug('Channel monitoring check', {
            channelId,
            isMonitored,
            monitorChannelIds: this.monitorChannelIds,
        });

        return isMonitored;
    }

    async hasReaction(messageId: string, channelId: string, emojiConfig: EmojiConfig): Promise<boolean> {
        try {
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                this.logger.warn('Channel not found or not text-based for reaction check', { channelId });
                return false;
            }

            const message = await (channel as TextChannel).messages.fetch(messageId);

            if (!message) {
                this.logger.warn('Message not found for reaction check', { messageId, channelId });
                return false;
            }

            // 指定された絵文字のリアクションをチェック
            let hasReaction = false;
            let reactionCount = 0;

            for (const reaction of message.reactions.cache.values()) {
                if (EmojiUtils.matchesReaction(emojiConfig, reaction.emoji)) {
                    hasReaction = true;
                    reactionCount = reaction.count;
                    break;
                }
            }

            this.logger.debug('Reaction check result', {
                messageId,
                channelId,
                emojiIdentifier: EmojiUtils.getIdentifier(emojiConfig),
                hasReaction,
                reactionCount,
            });

            return hasReaction && reactionCount > 0;
        } catch (error) {
            this.logger.error('Failed to check reaction', {
                messageId,
                channelId,
                emojiIdentifier: EmojiUtils.getIdentifier(emojiConfig),
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    async sendMessage(channelId: string, content: string): Promise<string> {
        try {
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                throw new Error(`Channel ${channelId} is not found or not text-based`);
            }

            const sentMessage = await (channel as TextChannel).send(content);

            this.logger.info('Message sent successfully', {
                channelId,
                messageId: sentMessage.id,
                contentLength: content.length,
            });

            return sentMessage.id;
        } catch (error) {
            this.logger.error('Failed to send message', {
                channelId,
                contentLength: content.length,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
