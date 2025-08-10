import { IConnectionManager } from '../repositories/IConnectionRepository';
import { ConnectionEvent } from '../entities/ConnectionStatus';

export class ConnectionMonitorUseCase {
    constructor(
        private readonly connectionManager: IConnectionManager
    ) {}

    /**
     * 接続監視を開始
     * @param onConnectionEvent 接続状態変更時のコールバック
     */
    public async startMonitoring(
        onConnectionEvent?: (event: ConnectionEvent) => void
    ): Promise<void> {
        if (onConnectionEvent) {
            this.connectionManager.onConnectionEvent(onConnectionEvent);
        }

        await this.connectionManager.startMonitoring();
    }

    /**
     * 接続監視を停止
     */
    public stopMonitoring(): void {
        this.connectionManager.stopMonitoring();
    }

    /**
     * 手動再接続
     */
    public async forceReconnect(): Promise<boolean> {
        return await this.connectionManager.reconnect();
    }

    /**
     * 接続状態を取得
     */
    public getConnectionStatus() {
        return this.connectionManager.getConnectionStatus();
    }
}
