import { IReconnectionStrategy } from '../../domain/repositories/IConnectionRepository';

/**
 * 指数バックオフ戦略による再接続実装
 */
export class ExponentialBackoffStrategy implements IReconnectionStrategy {
    private readonly baseDelay: number;
    private readonly maxDelay: number;
    private readonly maxRetries: number;
    private readonly backoffMultiplier: number;

    constructor(
        baseDelay: number = 1000,        // 初期遅延（1秒）
        maxDelay: number = 60000,        // 最大遅延（60秒）
        maxRetries: number = 10,         // 最大再試行回数
        backoffMultiplier: number = 2    // バックオフ倍率
    ) {
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.maxRetries = maxRetries;
        this.backoffMultiplier = backoffMultiplier;
    }

    public getRetryDelay(attempt: number): number | null {
        if (attempt > this.maxRetries) {
            return null; // 最大試行回数を超えたら停止
        }

        // 指数バックオフ計算: baseDelay * (backoffMultiplier ^ (attempt - 1))
        const delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
        
        // 最大遅延時間でキャップ
        return Math.min(delay, this.maxDelay);
    }

    public getMaxRetries(): number {
        return this.maxRetries;
    }

    public reset(): void {
        // 指数バックオフ戦略では特別なリセット処理は不要
    }
}

/**
 * 固定間隔戦略による再接続実装
 */
export class FixedIntervalStrategy implements IReconnectionStrategy {
    private readonly interval: number;
    private readonly maxRetries: number;

    constructor(
        interval: number = 5000,    // 固定間隔（5秒）
        maxRetries: number = 20     // 最大再試行回数
    ) {
        this.interval = interval;
        this.maxRetries = maxRetries;
    }

    public getRetryDelay(attempt: number): number | null {
        if (attempt > this.maxRetries) {
            return null; // 最大試行回数を超えたら停止
        }

        return this.interval;
    }

    public getMaxRetries(): number {
        return this.maxRetries;
    }

    public reset(): void {
        // 固定間隔戦略では特別なリセット処理は不要
    }
}
