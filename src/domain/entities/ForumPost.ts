import { DiscordMessage, IDiscordAttachment } from './DiscordMessage';
import { ForumTag } from './ForumTag';
import { EmojiUtils } from '../../infrastructure/discord/EmojiUtils';

export interface IForumPost {
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorNickname: string;
    originalMessageId: string;
    originalChannelId: string;
    createdAt: Date;
    attachments: IDiscordAttachment[];
    availableTags?: ForumTag[];
}

export class ForumPost implements IForumPost {
    constructor(
        public readonly title: string,
        public readonly content: string,
        public readonly authorId: string,
        public readonly authorName: string,
        public readonly authorNickname: string,
        public readonly originalMessageId: string,
        public readonly originalChannelId: string,
        public readonly createdAt: Date,
        public readonly attachments: IDiscordAttachment[],
        public readonly availableTags?: ForumTag[]
    ) { }

    public static createFromMessage(message: DiscordMessage, maxTitleLength: number, availableTags?: ForumTag[]): ForumPost {
        const title = ForumPost.generateTitle(message, maxTitleLength);
        const content = ForumPost.generateContent(message, availableTags);

        return new ForumPost(
            title,
            content,
            message.authorId,
            message.authorName,
            message.authorNickname,
            message.id,
            message.channelId,
            new Date(),
            message.getAllAttachments(),
            availableTags
        );
    }

    private static generateTitle(message: DiscordMessage, maxTitleLength: number): string {
        const contentPreview = message.getContentPreview(50);
        // サーバーニックネームを使用
        const baseTitle = `${message.authorNickname} - [${contentPreview}]`;

        if (baseTitle.length <= maxTitleLength) {
            return baseTitle;
        }

        // タイトルが長すぎる場合は切り詰める
        const authorPart = `${message.authorNickname} - [`;
        const closeBracket = ']';
        const availableLength = maxTitleLength - authorPart.length - closeBracket.length - 3; // "..." の分

        if (availableLength <= 0) {
            // 作者名だけでも長すぎる場合
            return `${message.authorNickname.substring(0, maxTitleLength - 6)}... - []`;
        }

        const truncatedContent = contentPreview.substring(0, availableLength) + '...';
        return `${authorPart}${truncatedContent}${closeBracket}`;
    }

    private static generateContent(message: DiscordMessage, availableTags?: ForumTag[]): string {
        const lines = [
            '**元の投稿:**',
            message.content,
            '',
            `**投稿者:** <@${message.authorId}>`,
            `**元のメッセージ:** ${message.getMessageUrl()}`,
            `**投稿時刻:** ${message.timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
        ];

        // 画像添付ファイルがある場合は、その旨を追加
        if (message.hasAttachments()) {
            const attachmentCount = message.getAllAttachments().length;
            lines.push(`**添付ファイル:** ${attachmentCount}個`);
        }

        // 利用可能なタグとリアクションの対応関係を表示
        if (availableTags && availableTags.length > 0) {
            const tagsWithEmoji = availableTags.filter(tag => tag.hasEmoji());
            if (tagsWithEmoji.length > 0) {
                lines.push('');
                lines.push('**🏷️ 利用可能なタグ:**');
                lines.push('下のリアクションを押してタグを選択してください！');
                lines.push('');

                tagsWithEmoji.forEach(tag => {
                    const emojiDisplay = EmojiUtils.formatTagEmojiForDisplay(tag);
                    lines.push(`${emojiDisplay} ： **${tag.name}**`);
                });
            }
        }

        return lines.join('\n');
    }

    /**
     * 添付ファイルがあるかチェック
     */
    public hasAttachments(): boolean {
        return this.attachments.length > 0;
    }
}
