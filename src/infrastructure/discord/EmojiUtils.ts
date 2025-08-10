import { ReactionEmoji, GuildEmoji, ApplicationEmoji } from 'discord.js';

/**
 * 絵文字の設定形式
 */
export interface EmojiConfig {
    /** 設定で指定された絵文字文字列 */
    raw: string;
    /** Unicode絵文字（例: 🙋） */
    unicode?: string;
    /** カスタム絵文字の名前（例: person_raising_hand） */
    name?: string;
    /** カスタム絵文字のID */
    id?: string;
}

/**
 * 絵文字処理のユーティリティクラス
 */
export class EmojiUtils {
    /**
     * 設定文字列から絵文字設定を解析
     * 
     * サポートする形式:
     * - Unicode絵文字: 🙋
     * - デフォルト絵文字名: :person_raising_hand:
     * - カスタム絵文字: <:emoji_name:123456789>
     * - アニメーション絵文字: <a:emoji_name:123456789>
     */
    static parseEmojiConfig(emojiStr: string): EmojiConfig {
        const raw = emojiStr.trim();

        // カスタム絵文字形式をチェック: <:name:id> または <a:name:id>
        const customEmojiMatch = raw.match(/^<a?:([^:]+):(\d+)>$/);
        if (customEmojiMatch) {
            return {
                raw,
                name: customEmojiMatch[1],
                id: customEmojiMatch[2],
            };
        }

        // デフォルト絵文字名形式をチェック: :name:
        const defaultEmojiMatch = raw.match(/^:([^:]+):$/);
        if (defaultEmojiMatch) {
            return {
                raw,
                name: defaultEmojiMatch[1],
            };
        }

        // Unicode絵文字として扱う
        return {
            raw,
            unicode: raw,
        };
    }

    /**
     * Discord.jsの絵文字と設定された絵文字が一致するかチェック
     */
    static matchesReaction(config: EmojiConfig, emoji: ReactionEmoji | GuildEmoji | ApplicationEmoji): boolean {
        // カスタム絵文字の場合
        if (config.id && emoji.id) {
            return config.id === emoji.id;
        }

        // 名前での比較（デフォルト絵文字またはカスタム絵文字の名前）
        if (config.name && emoji.name) {
            return config.name === emoji.name;
        }

        // Unicode絵文字の場合
        if (config.unicode && emoji.name) {
            return config.unicode === emoji.name;
        }

        return false;
    }

    /**
     * 設定された絵文字の表示用文字列を取得
     */
    static getDisplayString(config: EmojiConfig): string {
        if (config.unicode) {
            return config.unicode;
        }
        if (config.name) {
            return `:${config.name}:`;
        }
        return config.raw;
    }

    /**
     * 絵文字の識別子を取得（ログ出力用）
     */
    static getIdentifier(config: EmojiConfig): string {
        if (config.id) {
            return `${config.name}:${config.id}`;
        }
        if (config.name) {
            return config.name;
        }
        return config.unicode || config.raw;
    }

    /**
     * リアクション追加用の絵文字識別子を取得
     * message.react()で使用する形式に変換
     */
    static getReactionIdentifier(config: EmojiConfig): string {
        // カスタム絵文字の場合はIDを使用
        if (config.id) {
            return config.id;
        }
        // Unicode絵文字またはデフォルト絵文字の名前を使用
        if (config.unicode) {
            return config.unicode;
        }
        if (config.name) {
            return config.name;
        }
        // フォールバックとして raw を使用
        return config.raw;
    }
}
