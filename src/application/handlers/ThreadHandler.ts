import { ThreadChannel, ChannelType } from 'discord.js';
import { ForumService } from '../services/ForumService';
import { ILogger } from '../../infrastructure/logger/Logger';

/**
 * Discordスレッド関連のイベントを処理するハンドラー
 */
export class ThreadHandler {
    constructor(
        private readonly forumService: ForumService,
        private readonly logger: ILogger
    ) { }

    async handleThreadUpdate(oldThread: ThreadChannel, newThread: ThreadChannel): Promise<void> {
        try {
            // フォーラムチャンネル以外は無視
            if (!oldThread.parent || oldThread.parent.type !== ChannelType.GuildForum) {
                return;
            }

            // アーカイブ状態の変更をチェック
            const wasArchived = oldThread.archived;
            const isArchived = newThread.archived;

            if (!wasArchived && isArchived) {
                this.logger.info('Forum thread archived, processing closure notification', {
                    threadId: newThread.id,
                    threadName: newThread.name,
                    parentId: newThread.parent?.id,
                });

                await this.forumService.handleForumArchived(newThread.id, newThread.parent!.id);
            }

        } catch (error) {
            this.logger.error('Failed to handle thread update', {
                threadId: newThread.id,
                error: error instanceof Error ? error.message : String(error),
            });
            // エラーが発生してもアプリケーションは継続
        }
    }
}
