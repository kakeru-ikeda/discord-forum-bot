import { ForumPost } from '../entities/ForumPost';
import { ForumCreationStatus } from '../entities/ForumCreationStatus';
import { IDiscordAttachment } from '../entities/DiscordMessage';
import { ForumTag } from '../entities/ForumTag';

export interface IForumRepository {
    /**
     * フォーラムチャンネルに新しい投稿を作成する
     * @param forumChannelId フォーラムチャンネルのID
     * @param forumPost 作成するフォーラム投稿
     * @returns 作成されたフォーラム投稿のID
     */
    createForumPost(forumChannelId: string, forumPost: ForumPost): Promise<string>;

    /**
     * フォーラムスレッドに添付ファイルを投稿する
     * @param threadId フォーラムスレッドのID
     * @param attachments 投稿する添付ファイル
     */
    postAttachments(threadId: string, attachments: IDiscordAttachment[]): Promise<void>;

    /**
     * フォーラムチャンネルが存在し、アクセス可能かどうかを確認する
     * @param forumChannelId フォーラムチャンネルのID
     * @returns アクセス可能な場合はtrue
     */
    isForumChannelAccessible(forumChannelId: string): Promise<boolean>;

    /**
     * フォーラム投稿のURLを取得する
     * @param guildId ギルドID
     * @param forumChannelId フォーラムチャンネルのID
     * @param forumPostId フォーラム投稿のID
     * @returns フォーラム投稿のURL
     */
    getForumPostUrl(guildId: string, forumChannelId: string, forumPostId: string): string;

    /**
     * 指定されたメッセージに対してフォーラムが既に作成されているかチェックする
     * @param messageId メッセージID
     * @param channelId チャンネルID
     * @returns フォーラムが既に作成されている場合はForumCreationStatus、そうでなければnull
     */
    getForumCreationStatus(messageId: string, channelId: string): Promise<ForumCreationStatus | null>;

    /**
     * メッセージに対するフォーラム作成状態を記録する
     * @param status フォーラム作成状態
     */
    saveForumCreationStatus(status: ForumCreationStatus): Promise<void>;

    /**
     * フォーラムチャンネルの利用可能なタグを取得する
     * @param forumChannelId フォーラムチャンネルのID
     * @returns フォーラムタグの配列
     */
    getForumTags(forumChannelId: string): Promise<ForumTag[]>;

    /**
     * フォーラム投稿にリアクションを追加する
     * @param forumPostId フォーラム投稿のID
     * @param emojiIdentifier 絵文字の識別子（カスタム絵文字の場合はID、標準絵文字の場合は名前）
     */
    addReactionToForumPost(forumPostId: string, emojiIdentifier: string): Promise<void>;

    /**
     * フォーラム投稿にタグを追加する
     * @param forumChannelId フォーラムチャンネルのID
     * @param forumPostId フォーラム投稿のID
     * @param tagIds 追加するタグのIDの配列
     */
    addTagsToForumPost(forumChannelId: string, forumPostId: string, tagIds: string[]): Promise<void>;

    /**
     * フォーラム投稿の現在のタグを取得する
     * @param forumPostId フォーラム投稿のID
     * @returns 現在適用されているタグのIDの配列
     */
    getCurrentForumPostTags(forumPostId: string): Promise<string[]>;
}
