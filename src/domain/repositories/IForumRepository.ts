import { ForumPost } from '../entities/ForumPost';

export interface IForumRepository {
    /**
     * フォーラムチャンネルに新しい投稿を作成する
     * @param forumChannelId フォーラムチャンネルのID
     * @param forumPost 作成するフォーラム投稿
     * @returns 作成されたフォーラム投稿のID
     */
    createForumPost(forumChannelId: string, forumPost: ForumPost): Promise<string>;

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
}
