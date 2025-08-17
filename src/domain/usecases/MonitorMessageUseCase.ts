import { IMessageRepository } from '../repositories/IMessageRepository';
import { DiscordMessage } from '../entities/DiscordMessage';
import { EmojiConfig } from '../../infrastructure/discord/EmojiUtils';

export class MonitorMessageUseCase {
    constructor(
        private readonly messageRepository: IMessageRepository
    ) { }

    async shouldCreateForum(
        message: DiscordMessage,
        questionPrefixes: string[],
        triggerEmoji: EmojiConfig
    ): Promise<boolean> {
        // 監視対象のチャンネルかチェック
        const isMonitored = await this.messageRepository.isMonitoredChannel(message.channelId);
        if (!isMonitored) {
            return false;
        }

        // 質問プレフィックスで始まるかチェック
        if (message.isQuestionMessage(questionPrefixes)) {
            return true;
        }

        // トリガー絵文字のリアクションがあるかチェック
        const hasReaction = await this.messageRepository.hasReaction(
            message.id,
            message.channelId,
            triggerEmoji
        );

        return hasReaction;
    }

    async getMessage(messageId: string, channelId: string): Promise<DiscordMessage | null> {
        return await this.messageRepository.getMessage(messageId, channelId);
    }
}
