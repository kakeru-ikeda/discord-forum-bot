import { DiscordMessage } from '../entities/DiscordMessage';
import { EmojiConfig } from '../../infrastructure/discord/EmojiUtils';

export interface IMessageRepository {
    /**
     * メッセージを取得する
     * @param messageId メッセージID
     * @param channelId チャンネルID
     * @returns メッセージ
     */
    getMessage(messageId: string, channelId: string): Promise<DiscordMessage | null>;

    /**
     * メッセージが監視対象のチャンネルからのものかどうかを確認する
     * @param channelId チャンネルID
     * @returns 監視対象の場合はtrue
     */
    isMonitoredChannel(channelId: string): Promise<boolean>;

    /**
     * メッセージにリアクションが付いているかどうかを確認する
     * @param messageId メッセージID
     * @param channelId チャンネルID
     * @param emojiConfig 絵文字設定
     * @returns リアクションが付いている場合はtrue
     */
    hasReaction(messageId: string, channelId: string, emojiConfig: EmojiConfig): Promise<boolean>;

    /**
     * 指定されたチャンネルにメッセージを送信する
     * @param channelId チャンネルID
     * @param content メッセージ内容
     * @returns 送信されたメッセージID
     */
    sendMessage(channelId: string, content: string): Promise<string>;

    /**
     * メッセージにリアクションを追加する
     * @param messageId メッセージID
     * @param channelId チャンネルID
     * @param emojiConfig 絵文字設定
     * @returns 成功した場合はtrue
     */
    addReaction(messageId: string, channelId: string, emojiConfig: EmojiConfig): Promise<boolean>;
}
