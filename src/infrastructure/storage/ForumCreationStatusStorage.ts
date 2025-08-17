import { ForumCreationStatus } from '../../domain/entities/ForumCreationStatus';

/**
 * フォーラム作成状態を管理するインメモリストレージ
 * 本格的な実装では永続化ストレージ（データベースやファイル）を使用することを推奨
 */
export class ForumCreationStatusStorage {
    private readonly storage = new Map<string, ForumCreationStatus>();

    /**
     * メッセージIDとチャンネルIDからキーを生成
     */
    private generateKey(messageId: string, channelId: string): string {
        return `${channelId}:${messageId}`;
    }

    /**
     * フォーラム作成状態を取得
     */
    async get(messageId: string, channelId: string): Promise<ForumCreationStatus | null> {
        const key = this.generateKey(messageId, channelId);
        return this.storage.get(key) || null;
    }

    /**
     * フォーラム作成状態を保存
     */
    async save(status: ForumCreationStatus): Promise<void> {
        const key = this.generateKey(status.messageId, status.channelId);
        this.storage.set(key, status);
    }

    /**
     * フォーラム作成状態を削除
     */
    async delete(messageId: string, channelId: string): Promise<void> {
        const key = this.generateKey(messageId, channelId);
        this.storage.delete(key);
    }

    /**
     * すべてのフォーラム作成状態を取得（デバッグ用）
     */
    async getAll(): Promise<ForumCreationStatus[]> {
        return Array.from(this.storage.values());
    }

    /**
     * フォーラム投稿IDで検索
     */
    async getByForumPostId(forumPostId: string): Promise<ForumCreationStatus | null> {
        for (const status of this.storage.values()) {
            if (status.forumPostId === forumPostId) {
                return status;
            }
        }
        return null;
    }

    /**
     * ストレージをクリア
     */
    async clear(): Promise<void> {
        this.storage.clear();
    }

    /**
     * 現在のストレージサイズを取得
     */
    size(): number {
        return this.storage.size;
    }
}
