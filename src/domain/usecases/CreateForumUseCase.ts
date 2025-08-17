import { IForumRepository } from '../repositories/IForumRepository';
import { IMessageRepository } from '../repositories/IMessageRepository';
import { ForumPost } from '../entities/ForumPost';
import { DiscordMessage } from '../entities/DiscordMessage';
import { ForumCreationStatus } from '../entities/ForumCreationStatus';

export interface CreateForumResult {
    forumPostId: string;
    forumUrl: string;
    isNewForum: boolean; // 新しくフォーラムが作成されたかどうか
}

export class CreateForumUseCase {
    constructor(
        private readonly forumRepository: IForumRepository,
        private readonly messageRepository: IMessageRepository
    ) { }

    async execute(
        message: DiscordMessage,
        forumChannelId: string,
        maxTitleLength: number,
        triggeredBy?: string // フォーラム作成をトリガーしたユーザーID（リアクション時など）
    ): Promise<CreateForumResult> {
        // 既存のフォーラム作成状態をチェック
        const existingStatus = await this.forumRepository.getForumCreationStatus(
            message.id,
            message.channelId
        );

        if (existingStatus) {
            // 既にフォーラムが作成されている場合は既存の情報を返す
            return {
                forumPostId: existingStatus.forumPostId,
                forumUrl: existingStatus.forumUrl,
                isNewForum: false
            };
        }

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
        const notificationMessageId = await this.messageRepository.sendMessage(message.channelId, notificationMessage);

        // フォーラム作成状態を記録（通知メッセージIDも含める）
        const creationStatus = ForumCreationStatus.create(
            message.id,
            message.channelId,
            message.guildId,
            forumPostId,
            forumUrl,
            triggeredBy || message.authorId,
            notificationMessageId
        );
        await this.forumRepository.saveForumCreationStatus(creationStatus);

        return {
            forumPostId,
            forumUrl,
            isNewForum: true
        };
    }
}
