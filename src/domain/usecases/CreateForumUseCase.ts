import { IForumRepository } from '../repositories/IForumRepository';
import { IMessageRepository } from '../repositories/IMessageRepository';
import { ForumPost } from '../entities/ForumPost';
import { DiscordMessage } from '../entities/DiscordMessage';

export interface CreateForumResult {
    forumPostId: string;
    forumUrl: string;
}

export class CreateForumUseCase {
    constructor(
        private readonly forumRepository: IForumRepository,
        private readonly messageRepository: IMessageRepository
    ) { }

    async execute(
        message: DiscordMessage,
        forumChannelId: string,
        maxTitleLength: number
    ): Promise<CreateForumResult> {
        // フォーラムチャンネルがアクセス可能かチェック
        const isAccessible = await this.forumRepository.isForumChannelAccessible(forumChannelId);
        if (!isAccessible) {
            throw new Error(`Forum channel ${forumChannelId} is not accessible`);
        }

        // フォーラム投稿を作成
        const forumPost = ForumPost.createFromMessage(message, maxTitleLength);

        // フォーラムに投稿
        const forumPostId = await this.forumRepository.createForumPost(forumChannelId, forumPost);

        // フォーラムのURLを生成
        const forumUrl = this.forumRepository.getForumPostUrl(message.guildId, forumChannelId, forumPostId);

        // 元の投稿チャンネルに指定されたメッセージを送信
        const notificationMessage = `おぅりゃりゃー！　とぉりゃりゃー！\n${forumUrl}`;
        await this.messageRepository.sendMessage(message.channelId, notificationMessage);

        return {
            forumPostId,
            forumUrl
        };
    }
}
