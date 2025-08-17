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
        public readonly createdBy: string, // 最初にフォーラムを作成したユーザーID
        public readonly notificationMessageId?: string // Botが投稿した通知メッセージのID
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
        createdBy: string,
        notificationMessageId?: string
    ): ForumCreationStatus {
        return new ForumCreationStatus(
            messageId,
            channelId,
            guildId,
            forumPostId,
            forumUrl,
            new Date(),
            createdBy,
            notificationMessageId
        );
    }

    /**
     * 通知メッセージIDを追加した新しいインスタンスを作成
     */
    withNotificationMessageId(notificationMessageId: string): ForumCreationStatus {
        return new ForumCreationStatus(
            this.messageId,
            this.channelId,
            this.guildId,
            this.forumPostId,
            this.forumUrl,
            this.createdAt,
            this.createdBy,
            notificationMessageId
        );
    }
}
