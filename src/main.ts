import 'reflect-metadata';
import { BotManager } from './presentation/bot/BotManager';

async function main(): Promise<void> {
    const botManager = new BotManager();

    try {
        await botManager.start();
    } catch (error) {
        console.error('Failed to start Discord Forum Bot:', error);
        process.exit(1);
    }
}

// アプリケーション開始
main().catch((error) => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
});
