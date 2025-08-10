export interface ConnectionStatus {
    isConnected: boolean;
    lastConnectedAt: Date | null;
    reconnectAttempts: number;
    lastError: Error | null;
}

export interface ConnectionEvent {
    type: 'connected' | 'disconnected' | 'reconnecting' | 'error';
    timestamp: Date;
    error?: Error;
    attempt?: number;
}
