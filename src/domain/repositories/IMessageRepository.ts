import { DiscordMessage } from '../entities/DiscordMessage';

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
     * @param emoji 絵文字
     * @returns リアクションが付いている場合はtrue
     */
    hasReaction(messageId: string, channelId: string, emoji: string): Promise<boolean>;

    /**
     * 指定されたチャンネルにメッセージを送信する
     * @param channelId チャンネルID
     * @param content メッセージ内容
     * @returns 送信されたメッセージID
     */
    sendMessage(channelId: string, content: string): Promise<string>;
}
