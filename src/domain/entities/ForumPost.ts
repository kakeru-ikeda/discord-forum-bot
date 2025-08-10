import { DiscordMessage } from './DiscordMessage';

export interface IForumPost {
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorNickname: string;
    originalMessageId: string;
    originalChannelId: string;
    createdAt: Date;
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
        public readonly createdAt: Date
    ) { }

    public static createFromMessage(message: DiscordMessage, maxTitleLength: number): ForumPost {
        const title = ForumPost.generateTitle(message, maxTitleLength);
        const content = ForumPost.generateContent(message);

        return new ForumPost(
            title,
            content,
            message.authorId,
            message.authorName,
            message.authorNickname,
            message.id,
            message.channelId,
            new Date()
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

    private static generateContent(message: DiscordMessage): string {
        const lines = [
            '**元の投稿:**',
            message.content,
            '',
            `**投稿者:** ${message.authorNickname}`,
            `**元のメッセージ:** ${message.getMessageUrl()}`,
            `**投稿時刻:** ${message.timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
        ];

        return lines.join('\n');
    }
}
