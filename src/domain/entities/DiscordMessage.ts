export interface IDiscordMessage {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
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
        public readonly channelId: string,
        public readonly guildId: string,
        public readonly timestamp: Date
    ) { }

    public static fromDiscordJSMessage(message: any): DiscordMessage {
        return new DiscordMessage(
            message.id,
            message.content,
            message.author.id,
            message.author.displayName || message.author.username,
            message.channelId,
            message.guildId,
            message.createdAt
        );
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
