/**
 * フォーラムタグを表すエンティティ
 */
export interface IForumTag {
    id: string;
    name: string;
    emojiId?: string | null;
    emojiName?: string | null;
    moderated: boolean;
}

export class ForumTag implements IForumTag {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly emojiId?: string | null,
        public readonly emojiName?: string | null,
        public readonly moderated: boolean = false
    ) { }

    /**
     * タグに絵文字が設定されているかどうか
     */
    public hasEmoji(): boolean {
        return !!(this.emojiId || this.emojiName);
    }

    /**
     * 絵文字の識別子を取得（カスタム絵文字の場合はID、標準絵文字の場合は名前）
     */
    public getEmojiIdentifier(): string | null {
        if (this.emojiId) {
            return this.emojiId;
        }
        if (this.emojiName) {
            return this.emojiName;
        }
        return null;
    }

    /**
     * Discord APIから取得したタグデータからForumTagインスタンスを作成
     */
    public static fromDiscordTag(tag: any): ForumTag {
        return new ForumTag(
            tag.id,
            tag.name,
            tag.emoji?.id || null,
            tag.emoji?.name || null,
            tag.moderated || false
        );
    }
}
