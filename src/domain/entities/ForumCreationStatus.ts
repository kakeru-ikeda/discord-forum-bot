/**
 * フォーラム作成状態を管理するエンティティ
 */
export class ForumCreationStatus {
    constructor(
        public readonly messageId: string,
        public readonly channelId: string,
        public readonly guildId: string,
        public readonly forumPostId: string,
        public readonly forumUrl: string,
        public readonly createdAt: Date,
        public readonly createdBy: string // 最初にフォーラムを作成したユーザーID
    ) { }

    /**
     * メッセージからフォーラム作成状態を生成
     */
    static create(
        messageId: string,
        channelId: string,
        guildId: string,
        forumPostId: string,
        forumUrl: string,
        createdBy: string
    ): ForumCreationStatus {
        return new ForumCreationStatus(
            messageId,
            channelId,
            guildId,
            forumPostId,
            forumUrl,
            new Date(),
            createdBy
        );
    }
}
