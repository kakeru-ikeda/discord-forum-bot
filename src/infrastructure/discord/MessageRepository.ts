import { Client, TextChannel, ChannelType } from 'discord.js';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { DiscordMessage } from '../../domain/entities/DiscordMessage';
import { ILogger } from '../logger/Logger';

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

    async hasReaction(messageId: string, channelId: string, emoji: string): Promise<boolean> {
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
            const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
            const hasReaction = reaction && reaction.count > 0;

            this.logger.debug('Reaction check result', {
                messageId,
                channelId,
                emoji,
                hasReaction,
                reactionCount: reaction?.count || 0,
            });

            return Boolean(hasReaction);
        } catch (error) {
            this.logger.error('Failed to check reaction', {
                messageId,
                channelId,
                emoji,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}
