export interface IDiscordMessage {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorNickname: string;
    channelId: string;
    guildId: string;
    timestamp: Date;
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
        public readonly timestamp: Date
    ) { }

    public static fromDiscordJSMessage(message: any): DiscordMessage {
        // サーバーニックネームを取得（ニックネームがない場合はユーザー名）
        const serverNickname = message.member?.displayName || message.author.displayName || message.author.username;

        return new DiscordMessage(
            message.id,
            message.content,
            message.author.id,
            message.author.username,
            serverNickname,
            message.channelId,
            message.guildId,
            message.createdAt
        );
    }

    /**
     * メッセージのURLを生成
     */
    public getMessageUrl(): string {
        return `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.id}`;
    }

    public isQuestionMessage(questionPrefix: string): boolean {
        return this.content.trim().startsWith(questionPrefix);
    }

    public getContentPreview(maxLength: number): string {
        if (this.content.length <= maxLength) {
            return this.content;
        }
        return this.content.substring(0, maxLength - 3) + '...';
    }
}
