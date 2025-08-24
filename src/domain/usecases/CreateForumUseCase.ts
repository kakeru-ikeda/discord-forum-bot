import { IForumRepository } from '../repositories/IForumRepository';
import { IMessageRepository } from '../repositories/IMessageRepository';
import { ForumPost } from '../entities/ForumPost';
import { DiscordMessage } from '../entities/DiscordMessage';
import { ForumCreationStatus } from '../entities/ForumCreationStatus';
import { ForumTag } from '../entities/ForumTag';
import { ForumTagUseCase } from './ForumTagUseCase';

export interface CreateForumResult {
    forumPostId: string;
    forumUrl: string;
    isNewForum: boolean; // 新しくフォーラムが作成されたかどうか
}

export class CreateForumUseCase {
    constructor(
        private readonly forumRepository: IForumRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly forumTagUseCase: ForumTagUseCase
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

        // フォーラムチャンネルのタグ情報を取得
        let availableTags: ForumTag[];
        try {
            availableTags = await this.forumTagUseCase.getTagsWithEmoji(forumChannelId);
        } catch (error) {
            // タグ取得に失敗してもフォーラム作成は続行
            console.error('Failed to get forum tags:', error);
            availableTags = [];
        }

        // フォーラム投稿を作成（タグ情報も含める）
        const forumPost = ForumPost.createFromMessage(message, maxTitleLength, availableTags);

        // フォーラムに投稿
        const forumPostId = await this.forumRepository.createForumPost(forumChannelId, forumPost);

        // 添付ファイルがある場合は、フォーラムスレッドに投稿
        if (forumPost.hasAttachments()) {
            try {
                await this.forumRepository.postAttachments(forumPostId, forumPost.attachments);
            } catch (error) {
                // 添付ファイル投稿に失敗してもフォーラム作成自体は成功とする
                console.error('Failed to post attachments:', error);
            }
        }

        // フォーラムのURLを生成
        const forumUrl = this.forumRepository.getForumPostUrl(message.guildId, forumChannelId, forumPostId);

        // フォーラム作成状態を記録
        const creationStatus = ForumCreationStatus.create(
            message.id,
            message.channelId,
            message.guildId,
            forumPostId,
            forumUrl,
            triggeredBy || message.authorId
        );
        await this.forumRepository.saveForumCreationStatus(creationStatus);

        // 元の投稿チャンネルに指定されたメッセージを送信
        const notificationMessage = `おぅりゃりゃー！　とぉりゃりゃー！\n${forumUrl}`;
        await this.messageRepository.sendMessage(message.channelId, notificationMessage);

        // フォーラムチャンネルのタグを取得し、絵文字を持つタグのリアクションを追加
        try {
            const tagsWithEmoji = await this.forumTagUseCase.getTagsWithEmoji(forumChannelId);
            if (tagsWithEmoji.length > 0) {
                await this.forumTagUseCase.addTagEmojiReactions(forumPostId, tagsWithEmoji);
            }
        } catch (error) {
            // タグ関連のエラーはログに記録するが、フォーラム作成自体は成功とする
            console.error('Failed to add tag emoji reactions:', error);
        }

        return {
            forumPostId,
            forumUrl,
            isNewForum: true
        };
    }
}
