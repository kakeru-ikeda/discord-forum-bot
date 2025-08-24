import { Client, TextChannel, ChannelType } from 'discord.js';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { DiscordMessage } from '../../domain/entities/DiscordMessage';
import { Logger } from '../logger/Logger';
import { EmojiConfig, EmojiUtils } from './EmojiUtils';
import { ConfigManager } from '../config/ConfigManager';

export class MessageRepository implements IMessageRepository {
    constructor(
        private readonly client: Client
    ) { }

    async getMessage(messageId: string, channelId: string): Promise<DiscordMessage | null> {
        try {
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                Logger.warn('Channel not found or not text-based', { channelId });
                return null;
            }

            const message = await (channel as TextChannel).messages.fetch(messageId);

            if (!message) {
                Logger.warn('Message not found', { messageId, channelId });
                return null;
            }

            return DiscordMessage.fromDiscordJSMessage(message);
        } catch (error) {
            Logger.error('Failed to fetch message', {
                messageId,
                channelId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async isMonitoredChannel(channelId: string): Promise<boolean> {
        const configManager = ConfigManager.getInstance();
        const monitorChannelIds = configManager.getMonitorChannelIds();
        const isMonitored = monitorChannelIds.includes(channelId);

        Logger.debug('Channel monitoring check', {
            channelId,
            isMonitored,
            monitorChannelIds,
        });

        return isMonitored;
    }

    async hasReaction(messageId: string, channelId: string, emojiConfig: EmojiConfig): Promise<boolean> {
        try {
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                Logger.warn('Channel not found or not text-based for reaction check', { channelId });
                return false;
            }

            const message = await (channel as TextChannel).messages.fetch(messageId);

            if (!message) {
                Logger.warn('Message not found for reaction check', { messageId, channelId });
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

            Logger.debug('Reaction check result', {
                messageId,
                channelId,
                emojiIdentifier: EmojiUtils.getIdentifier(emojiConfig),
                hasReaction,
                reactionCount,
            });

            return hasReaction && reactionCount > 0;
        } catch (error) {
            Logger.error('Failed to check reaction', {
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

            Logger.info('Message sent successfully', {
                channelId,
                messageId: sentMessage.id,
                contentLength: content.length,
            });

            return sentMessage.id;
        } catch (error) {
            Logger.error('Failed to send message', {
                channelId,
                contentLength: content.length,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    async addReaction(messageId: string, channelId: string, emojiConfig: EmojiConfig): Promise<boolean> {
        try {
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !channel.isTextBased()) {
                Logger.warn('Channel not found or not text-based for adding reaction', { channelId });
                return false;
            }

            const message = await (channel as TextChannel).messages.fetch(messageId);

            if (!message) {
                Logger.warn('Message not found for adding reaction', { messageId, channelId });
                return false;
            }

            // 絵文字をリアクションとして追加
            const emojiIdentifier = EmojiUtils.getReactionIdentifier(emojiConfig);
            await message.react(emojiIdentifier);

            Logger.info('Reaction added successfully', {
                messageId,
                channelId,
                emojiIdentifier: EmojiUtils.getIdentifier(emojiConfig),
            });

            return true;
        } catch (error) {
            Logger.error('Failed to add reaction', {
                messageId,
                channelId,
                emojiIdentifier: EmojiUtils.getIdentifier(emojiConfig),
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}
