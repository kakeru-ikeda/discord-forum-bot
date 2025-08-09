import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { ILogger } from './Logger';

export interface IAlertNotifier {
    sendAlert(level: 'error' | 'warn' | 'info', title: string, message: string, error?: Error): Promise<void>;
}

export class AlertNotifier implements IAlertNotifier {
    constructor(
        private readonly client: Client,
        private readonly alertChannelId: string,
        private readonly logger: ILogger,
        private readonly enableDiscordAlerts: boolean
    ) { }

    async sendAlert(level: 'error' | 'warn' | 'info', title: string, message: string, error?: Error): Promise<void> {
        // ローカルログに記録
        this.logLocally(level, title, message, error);

        // Discord通知が無効な場合は終了
        if (!this.enableDiscordAlerts) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(this.alertChannelId);
            if (!channel || !channel.isTextBased()) {
                this.logger.error('Alert channel not found or not text-based', { channelId: this.alertChannelId });
                return;
            }

            const embed = this.createAlertEmbed(level, title, message, error);
            await (channel as TextChannel).send({ embeds: [embed] });
        } catch (alertError) {
            this.logger.error('Failed to send Discord alert', {
                originalError: error?.message,
                alertError: alertError instanceof Error ? alertError.message : String(alertError)
            });
        }
    }

    private logLocally(level: 'error' | 'warn' | 'info', title: string, message: string, error?: Error): void {
        const logMessage = `${title}: ${message}`;
        const meta = error ? { error: error.message, stack: error.stack } : undefined;

        switch (level) {
            case 'error':
                this.logger.error(logMessage, meta);
                break;
            case 'warn':
                this.logger.warn(logMessage, meta);
                break;
            case 'info':
                this.logger.info(logMessage, meta);
                break;
        }
    }

    private createAlertEmbed(level: 'error' | 'warn' | 'info', title: string, message: string, error?: Error): EmbedBuilder {
        const colors = {
            error: 0xFF0000, // 赤
            warn: 0xFFA500,  // オレンジ
            info: 0x0099FF   // 青
        };

        const embed = new EmbedBuilder()
            .setTitle(`🚨 ${title}`)
            .setDescription(message)
            .setColor(colors[level])
            .setTimestamp();

        if (error) {
            embed.addFields(
                { name: 'Error Message', value: error.message, inline: false },
                { name: 'Stack Trace', value: `\`\`\`\n${error.stack?.substring(0, 1000) || 'No stack trace available'}\n\`\`\``, inline: false }
            );
        }

        return embed;
    }
}
