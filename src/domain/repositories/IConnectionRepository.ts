export interface IReconnectionStrategy {
    /**
     * 再接続を実行する
     * @param attempt 現在の試行回数
     * @returns 次の試行までの待機時間（ミリ秒）、null の場合は再接続を停止
     */
    getRetryDelay(attempt: number): number | null;

    /**
     * 最大再接続試行回数を取得
     */
    getMaxRetries(): number;

    /**
     * 再接続戦略をリセット
     */
    reset(): void;
}

export interface IConnectionManager {
    /**
     * 接続状態を監視開始
     */
    startMonitoring(): Promise<void>;

    /**
     * 接続状態を監視停止
     */
    stopMonitoring(): void;

    /**
     * 手動で再接続を実行
     */
    reconnect(): Promise<boolean>;

    /**
     * 現在の接続状態を取得
     */
    getConnectionStatus(): ConnectionStatus;

    /**
     * 接続イベントの監視を開始
     * @param callback 接続状態変更時のコールバック
     */
    onConnectionEvent(callback: (event: ConnectionEvent) => void): void;
}

import { ConnectionStatus, ConnectionEvent } from '../entities/ConnectionStatus';
