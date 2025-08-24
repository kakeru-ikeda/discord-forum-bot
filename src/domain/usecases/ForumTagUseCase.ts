import { IForumRepository } from '../repositories/IForumRepository';
import { ForumTag } from '../entities/ForumTag';

export class ForumTagUseCase {
    constructor(
        private readonly forumRepository: IForumRepository
    ) { }

    /**
     * フォーラムチャンネルのタグを取得し、絵文字を持つタグのみをフィルタリング
     */
    async getTagsWithEmoji(forumChannelId: string): Promise<ForumTag[]> {
        const allTags = await this.forumRepository.getForumTags(forumChannelId);
        return allTags.filter(tag => tag.hasEmoji());
    }

    /**
     * フォーラム投稿にタグの絵文字をリアクションとして追加
     */
    async addTagEmojiReactions(forumPostId: string, tags: ForumTag[]): Promise<void> {
        for (const tag of tags) {
            if (tag.hasEmoji()) {
                const emojiIdentifier = tag.getEmojiIdentifier();
                if (emojiIdentifier) {
                    try {
                        await this.forumRepository.addReactionToForumPost(forumPostId, emojiIdentifier);
                    } catch (error) {
                        // 個別の絵文字でエラーが発生しても続行
                        console.error(`Failed to add reaction for tag ${tag.name}:`, error);
                    }
                }
            }
        }
    }

    /**
     * リアクションから対応するタグを見つける
     */
    findTagByEmoji(tags: ForumTag[], emojiIdentifier: string): ForumTag | null {
        return tags.find(tag => {
            const tagEmoji = tag.getEmojiIdentifier();
            return tagEmoji === emojiIdentifier;
        }) || null;
    }

    /**
     * フォーラム投稿にタグを適用
     */
    async applyTagsToForumPost(forumChannelId: string, forumPostId: string, tagIds: string[]): Promise<void> {
        if (tagIds.length === 0) {
            // 空配列の場合はすべてのタグを削除
            await this.forumRepository.addTagsToForumPost(forumChannelId, forumPostId, []);
            return;
        }

        await this.forumRepository.addTagsToForumPost(forumChannelId, forumPostId, tagIds);
    }

    /**
     * フォーラム投稿の現在のタグを取得
     */
    async getCurrentForumPostTags(forumPostId: string): Promise<string[]> {
        return await this.forumRepository.getCurrentForumPostTags(forumPostId);
    }
}
