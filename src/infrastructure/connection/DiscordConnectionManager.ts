import { Client } from 'discord.js';
import { IConnectionManager, IReconnectionStrategy } from '../../domain/repositories/IConnectionRepository';
import { ConnectionStatus, ConnectionEvent } from '../../domain/entities/ConnectionStatus';
import { ILogger } from '../logger/Logger';

export class DiscordConnectionManager implements IConnectionManager {
    private connectionStatus: ConnectionStatus;
    private eventCallbacks: Array<(event: ConnectionEvent) => void> = [];
    private monitoringInterval?: NodeJS.Timeout;
    private reconnectionTimeout?: NodeJS.Timeout;
    private isMonitoring: boolean = false;
    private isReconnecting: boolean = false;

    constructor(
        private readonly client: Client,
        private readonly reconnectionStrategy: IReconnectionStrategy,
        private readonly logger: ILogger,
        private readonly loginToken: string,
        private readonly healthCheckInterval: number = 30000 // 30秒間隔でヘルスチェック
    ) {
        this.connectionStatus = {
            isConnected: false,
            lastConnectedAt: null,
            reconnectAttempts: 0,
            lastError: null
        };

        this.setupDiscordEventHandlers();
    }

    private setupDiscordEventHandlers(): void {
        // 接続成功イベント
        this.client.once('ready', () => {
            this.handleConnectionEstablished();
        });

        // 接続エラーイベント
        this.client.on('error', (error) => {
            this.handleConnectionError(error);
        });

        // WebSocket接続クローズイベント
        this.client.on('shardDisconnect', (event, shardId) => {
            this.logger.warn(`Discord shard ${shardId} disconnected`, { 
                code: event.code, 
                reason: event.reason 
            });
            this.handleConnectionLost(new Error(`Shard disconnected: ${event.reason}`));
        });

        // レート制限イベント
        this.client.on('rateLimit', (rateLimitInfo) => {
            this.logger.warn('Discord rate limit hit', {
                timeout: rateLimitInfo.timeout,
                limit: rateLimitInfo.limit,
                method: rateLimitInfo.method,
                path: rateLimitInfo.path,
                route: rateLimitInfo.route
            });
        });

        // 再接続イベント
        this.client.on('shardReconnecting', (shardId) => {
            this.logger.info(`Discord shard ${shardId} is reconnecting`);
            this.emitConnectionEvent({
                type: 'reconnecting',
                timestamp: new Date(),
                attempt: this.connectionStatus.reconnectAttempts + 1
            });
        });

        // 再開イベント
        this.client.on('shardResume', (shardId, replayedEvents) => {
            this.logger.info(`Discord shard ${shardId} resumed`, { 
                replayedEvents 
            });
            this.handleConnectionEstablished();
        });
    }

    private handleConnectionEstablished(): void {
        this.connectionStatus = {
            isConnected: true,
            lastConnectedAt: new Date(),
            reconnectAttempts: 0,
            lastError: null
        };

        this.isReconnecting = false;
        this.reconnectionStrategy.reset();
        
        // 再接続タイマーをクリア
        if (this.reconnectionTimeout) {
            clearTimeout(this.reconnectionTimeout);
            this.reconnectionTimeout = undefined;
        }

        this.logger.info('Discord connection established successfully');
        this.emitConnectionEvent({
            type: 'connected',
            timestamp: new Date()
        });
    }

    private handleConnectionError(error: Error): void {
        this.connectionStatus.lastError = error;
        this.logger.error('Discord connection error', { 
            error: error.message, 
            stack: error.stack 
        });

        this.emitConnectionEvent({
            type: 'error',
            timestamp: new Date(),
            error
        });
    }

    private handleConnectionLost(error?: Error): void {
        if (!this.connectionStatus.isConnected) {
            return; // 既に切断状態の場合は何もしない
        }

        this.connectionStatus.isConnected = false;
        if (error) {
            this.connectionStatus.lastError = error;
        }

        this.logger.warn('Discord connection lost', { 
            error: error?.message 
        });

        this.emitConnectionEvent({
            type: 'disconnected',
            timestamp: new Date(),
            error
        });

        // 自動再接続を開始
        if (this.isMonitoring && !this.isReconnecting) {
            this.startReconnection();
        }
    }

    private async startReconnection(): Promise<void> {
        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;
        this.connectionStatus.reconnectAttempts++;

        const delay = this.reconnectionStrategy.getRetryDelay(this.connectionStatus.reconnectAttempts);
        
        if (delay === null) {
            this.logger.error('Max reconnection attempts reached, stopping automatic reconnection');
            this.isReconnecting = false;
            return;
        }

        this.logger.info(`Attempting reconnection in ${delay}ms (attempt ${this.connectionStatus.reconnectAttempts})`);

        this.emitConnectionEvent({
            type: 'reconnecting',
            timestamp: new Date(),
            attempt: this.connectionStatus.reconnectAttempts
        });

        this.reconnectionTimeout = setTimeout(async () => {
            try {
                const success = await this.attemptReconnection();
                if (!success) {
                    // 再接続失敗、次の試行をスケジュール
                    this.isReconnecting = false;
                    this.startReconnection();
                }
            } catch (error) {
                this.logger.error('Reconnection attempt failed', { 
                    error: error instanceof Error ? error.message : String(error) 
                });
                this.isReconnecting = false;
                this.startReconnection();
            }
        }, delay);
    }

    private async attemptReconnection(): Promise<boolean> {
        try {
            this.logger.info('Attempting to reconnect to Discord...');
            
            // 既存の接続を破棄
            if (this.client.isReady()) {
                await this.client.destroy();
            }

            // 新しい接続を試行
            await this.client.login(this.loginToken);
            
            return true;
        } catch (error) {
            this.handleConnectionError(error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    private startHealthCheck(): void {
        if (this.monitoringInterval) {
            return;
        }

        this.monitoringInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);

        this.logger.info(`Connection health check started (interval: ${this.healthCheckInterval}ms)`);
    }

    private stopHealthCheck(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
            this.logger.info('Connection health check stopped');
        }
    }

    private performHealthCheck(): void {
        const isActuallyConnected = this.client.isReady();
        
        if (this.connectionStatus.isConnected && !isActuallyConnected) {
            // 接続状態の不整合を検出
            this.logger.warn('Health check detected connection inconsistency');
            this.handleConnectionLost(new Error('Health check failed - connection lost'));
        } else if (!this.connectionStatus.isConnected && isActuallyConnected) {
            // 接続が復旧している
            this.logger.info('Health check detected connection recovery');
            this.handleConnectionEstablished();
        }
    }

    private emitConnectionEvent(event: ConnectionEvent): void {
        this.eventCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                this.logger.error('Error in connection event callback', { 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        });
    }

    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.startHealthCheck();
        
        this.logger.info('Connection monitoring started');
    }

    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        this.isReconnecting = false;
        
        this.stopHealthCheck();
        
        if (this.reconnectionTimeout) {
            clearTimeout(this.reconnectionTimeout);
            this.reconnectionTimeout = undefined;
        }

        this.logger.info('Connection monitoring stopped');
    }

    public async reconnect(): Promise<boolean> {
        this.logger.info('Manual reconnection requested');
        
        // 自動再接続を一時停止
        const wasReconnecting = this.isReconnecting;
        this.isReconnecting = false;
        
        if (this.reconnectionTimeout) {
            clearTimeout(this.reconnectionTimeout);
            this.reconnectionTimeout = undefined;
        }

        try {
            const success = await this.attemptReconnection();
            
            if (!success && wasReconnecting) {
                // 手動再接続が失敗し、元々自動再接続中だった場合は自動再接続を再開
                this.startReconnection();
            }
            
            return success;
        } catch (error) {
            if (wasReconnecting) {
                this.startReconnection();
            }
            throw error;
        }
    }

    public getConnectionStatus(): ConnectionStatus {
        return { ...this.connectionStatus };
    }

    public onConnectionEvent(callback: (event: ConnectionEvent) => void): void {
        this.eventCallbacks.push(callback);
    }
}
