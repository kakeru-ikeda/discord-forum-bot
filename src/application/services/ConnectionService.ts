import { ConnectionMonitorUseCase } from '../../domain/usecases/ConnectionMonitorUseCase';
import { ConnectionEvent } from '../../domain/entities/ConnectionStatus';
import { ILogger } from '../../infrastructure/logger/Logger';
import { AlertNotifier } from '../../infrastructure/logger/AlertNotifier';

export class ConnectionService {
    private isStarted: boolean = false;

    constructor(
        private readonly connectionMonitorUseCase: ConnectionMonitorUseCase,
        private readonly logger: ILogger,
        private readonly alertNotifier: AlertNotifier
    ) {}

    /**
     * 接続監視サービスを開始
     */
    public async start(): Promise<void> {
        if (this.isStarted) {
            return;
        }

        this.isStarted = true;

        // 接続イベントのハンドリング
        await this.connectionMonitorUseCase.startMonitoring(
            (event: ConnectionEvent) => this.handleConnectionEvent(event)
        );

        this.logger.info('Connection service started');
    }

    /**
     * 接続監視サービスを停止
     */
    public stop(): void {
        if (!this.isStarted) {
            return;
        }

        this.isStarted = false;
        this.connectionMonitorUseCase.stopMonitoring();
        
        this.logger.info('Connection service stopped');
    }

    /**
     * 手動で再接続を実行
     */
    public async forceReconnect(): Promise<boolean> {
        this.logger.info('Manual reconnection requested via ConnectionService');
        return await this.connectionMonitorUseCase.forceReconnect();
    }

    /**
     * 現在の接続状態を取得
     */
    public getStatus() {
        return this.connectionMonitorUseCase.getConnectionStatus();
    }

    /**
     * 接続イベントのハンドリング
     */
    private async handleConnectionEvent(event: ConnectionEvent): Promise<void> {
        try {
            switch (event.type) {
                case 'connected':
                    this.logger.info('Discord connection established');
                    await this.alertNotifier.sendAlert(
                        'info',
                        'Connection Restored',
                        'Discord connection has been successfully established'
                    );
                    break;

                case 'disconnected':
                    this.logger.warn('Discord connection lost', { 
                        error: event.error?.message 
                    });
                    await this.alertNotifier.sendAlert(
                        'warn',
                        'Connection Lost',
                        'Discord connection has been lost. Attempting automatic reconnection...',
                        event.error
                    );
                    break;

                case 'reconnecting':
                    this.logger.info(`Attempting reconnection (attempt ${event.attempt})`);
                    if (event.attempt && event.attempt % 5 === 0) {
                        // 5回に1回アラートを送信（スパム防止）
                        await this.alertNotifier.sendAlert(
                            'info',
                            'Reconnection Attempt',
                            `Attempting to reconnect to Discord (attempt ${event.attempt})`
                        );
                    }
                    break;

                case 'error':
                    this.logger.error('Discord connection error', { 
                        error: event.error?.message,
                        stack: event.error?.stack
                    });
                    await this.alertNotifier.sendAlert(
                        'error',
                        'Connection Error',
                        'Discord connection error occurred',
                        event.error
                    );
                    break;
            }
        } catch (error) {
            this.logger.error('Error handling connection event', { 
                eventType: event.type,
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }
}
