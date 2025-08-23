export interface IDiscordAttachment {
    id: string;
    name: string;
    url: string;
    proxyUrl: string;
    size: number;
    width?: number;
    height?: number;
    contentType?: string;
}

export interface IDiscordMessage {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorNickname: string;
    channelId: string;
    guildId: string;
    timestamp: Date;
    attachments: IDiscordAttachment[];
}

export class DiscordMessage implements IDiscordMessage {
    constructor(
        public readonly id: string,
        public readonly content: string,
        public readonly authorId: string,
        public readonly authorName: string,
        public readonly authorNickname: string,
        public readonly channelId: string,
        public readonly guildId: string,
        public readonly timestamp: Date,
        public readonly attachments: IDiscordAttachment[]
    ) { }

    public static fromDiscordJSMessage(message: any): DiscordMessage {
        // サーバーニックネームを取得（ニックネームがない場合はユーザー名）
        const serverNickname = message.member?.displayName || message.author.displayName || message.author.username;

        // 添付ファイルを変換
        const attachments: IDiscordAttachment[] = message.attachments.map((attachment: any) => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            proxyUrl: attachment.proxyURL,
            size: attachment.size,
            width: attachment.width,
            height: attachment.height,
            contentType: attachment.contentType,
        }));

        return new DiscordMessage(
            message.id,
            message.content,
            message.author.id,
            message.author.username,
            serverNickname,
            message.channelId,
            message.guildId,
            message.createdAt,
            attachments
        );
    }

    /**
     * メッセージのURLを生成
     */
    public getMessageUrl(): string {
        return `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.id}`;
    }

    public isQuestionMessage(questionPrefixes: string[]): boolean {
        const trimmedContent = this.content.trim();
        return questionPrefixes.some(prefix => trimmedContent.startsWith(prefix));
    }

    public getContentPreview(maxLength: number): string {
        if (this.content.length <= maxLength) {
            return this.content;
        }
        return this.content.substring(0, maxLength - 3) + '...';
    }

    /**
     * 画像添付ファイルがあるかチェック
     */
    public hasImageAttachments(): boolean {
        return this.attachments.some(attachment => {
            const contentType = attachment.contentType?.toLowerCase();
            return contentType && (
                contentType.startsWith('image/') ||
                attachment.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)
            );
        });
    }

    /**
     * 画像添付ファイルのみを取得
     */
    public getImageAttachments(): IDiscordAttachment[] {
        return this.attachments.filter(attachment => {
            const contentType = attachment.contentType?.toLowerCase();
            return contentType && (
                contentType.startsWith('image/') ||
                attachment.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)
            );
        });
    }

    /**
     * 添付ファイルがあるかチェック
     */
    public hasAttachments(): boolean {
        return this.attachments.length > 0;
    }

    /**
     * すべての添付ファイルを取得
     */
    public getAllAttachments(): IDiscordAttachment[] {
        return this.attachments;
    }
}
