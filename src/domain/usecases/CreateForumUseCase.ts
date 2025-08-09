import { IForumRepository } from '../repositories/IForumRepository';
import { ForumPost } from '../entities/ForumPost';
import { DiscordMessage } from '../entities/DiscordMessage';

export class CreateForumUseCase {
    constructor(
        private readonly forumRepository: IForumRepository
    ) { }

    async execute(
        message: DiscordMessage,
        forumChannelId: string,
        maxTitleLength: number
    ): Promise<string> {
        // フォーラムチャンネルがアクセス可能かチェック
        const isAccessible = await this.forumRepository.isForumChannelAccessible(forumChannelId);
        if (!isAccessible) {
            throw new Error(`Forum channel ${forumChannelId} is not accessible`);
        }

        // フォーラム投稿を作成
        const forumPost = ForumPost.createFromMessage(message, maxTitleLength);

        // フォーラムに投稿
        const forumPostId = await this.forumRepository.createForumPost(forumChannelId, forumPost);

        return forumPostId;
    }
}
