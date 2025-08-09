import { Message } from 'discord.js';
import { ForumService } from '../services/ForumService';
import { DiscordMessage } from '../../domain/entities/DiscordMessage';
import { ILogger } from '../../infrastructure/logger/Logger';

export class MessageHandler {
    constructor(
        private readonly forumService: ForumService,
        private readonly logger: ILogger
    ) { }

    async handleMessage(discordMessage: Message): Promise<void> {
        try {
            // ボット自身のメッセージは無視
            if (discordMessage.author.bot) {
                return;
            }

            // システムメッセージは無視
            if (discordMessage.system) {
                return;
            }

            // DM は無視（ギルドメッセージのみ処理）
            if (!discordMessage.guildId) {
                return;
            }

            this.logger.debug('Received message', {
                messageId: discordMessage.id,
                authorId: discordMessage.author.id,
                channelId: discordMessage.channelId,
                guildId: discordMessage.guildId,
                contentLength: discordMessage.content.length,
            });

            // Discord.js メッセージをドメインエンティティに変換
            const message = DiscordMessage.fromDiscordJSMessage(discordMessage);

            // フォーラムサービスでメッセージを処理
            await this.forumService.handleMessage(message);

        } catch (error) {
            this.logger.error('Unhandled error in message handler', {
                messageId: discordMessage.id,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            // エラーが発生してもハンドラーは継続
            // フォーラムサービス内でアラート通知済み
        }
    }
}
