# Discord Forum Bot

TypeScript + Discord.js v14を使用したDiscord botで、フォーラムチャンネルの自動作成機能を提供します。

## 機能

- **メッセージ監視**: 「質問！」で始まる投稿の検知
- **リアクション監視**: 特定の絵文字リアクションの検知
- **フォーラム自動作成**: 条件に基づく自動フォーラム生成
- **エラーアラート**: 例外発生時のDiscordチャンネル通知

## アーキテクチャ

このプロジェクトはクリーンアーキテクチャに従って設計されています：

- **Domain層**: エンティティ、リポジトリインターフェース、ユースケース
- **Application層**: アプリケーションサービス、イベントハンドラー
- **Infrastructure層**: Discord API、ログ機能、設定管理
- **Presentation層**: Bot起動・制御

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`ファイルを`.env`にコピーし、以下の値を設定してください：

```bash
cp .env.example .env
```

必須の環境変数：
- `DISCORD_TOKEN`: Discord botのトークン
- `GUILD_ID`: 対象サーバーのID
- `MONITOR_CHANNEL_IDS`: 監視するチャンネルのIDリスト（カンマ区切り）
- `FORUM_CHANNEL_ID`: フォーラム投稿先のチャンネルID
- `ALERT_CHANNEL_ID`: アラート通知先のチャンネルID

オプションの環境変数：
- `TRIGGER_EMOJI`: フォーラム作成のトリガー絵文字（デフォルト: 🙋）
  - Unicode絵文字: `🙋`
  - デフォルト絵文字名: `:person_raising_hand:`
  - カスタム絵文字: `<:emoji_name:123456789>`
  - アニメーション絵文字: `<a:emoji_name:123456789>`
- `QUESTION_PREFIX`: 質問として認識するプレフィックス（デフォルト: 質問！）
- `LOG_LEVEL`: ログレベル（デフォルト: info）
- その他のログとBot設定

### 3. Discord Bot の設定

1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーションを作成
2. Botを作成し、トークンを取得
3. 必要な権限を設定：
   - `Send Messages`
   - `Create Public Threads`
   - `Read Message History`
   - `Add Reactions`
   - `Use Slash Commands`

### 4. 実行

#### 開発環境
```bash
npm run dev
```

#### 本番環境
```bash
npm run build
npm start
```

## 設定項目

### 必須環境変数
- `DISCORD_TOKEN`: Botトークン
- `GUILD_ID`: サーバーID
- `MONITOR_CHANNEL_IDS`: 監視対象チャンネルIDのリスト（カンマ区切り）
- `FORUM_CHANNEL_ID`: フォーラム投稿先チャンネルID
- `ALERT_CHANNEL_ID`: アラート通知先チャンネルID

### オプション環境変数
- `TRIGGER_EMOJI`: フォーラム作成のトリガーとなる絵文字（デフォルト: 🙋）
  - サポート形式: Unicode絵文字(`🙋`)、絵文字名(`:person_raising_hand:`)、カスタム絵文字(`<:name:id>`)、アニメーション絵文字(`<a:name:id>`)
- `QUESTION_PREFIX`: 質問として認識するプレフィックス（デフォルト: 質問！）
- `LOG_LEVEL`: ログレベル（debug, info, warn, error）（デフォルト: info）
- `ENABLE_FILE_LOGGING`: ファイルログの有効化（デフォルト: true）
- `ENABLE_DISCORD_ALERTS`: Discordアラートの有効化（デフォルト: true）
- `LOG_FILE_PATH`: ログファイルのパス（デフォルト: ./logs/bot.log）
- `MAX_TITLE_LENGTH`: フォーラムタイトルの最大長（デフォルト: 100）
- `MAX_CONTENT_PREVIEW`: コンテンツプレビューの最大長（デフォルト: 200）

## 動作仕様

1. **メッセージ監視**
   - 監視対象チャンネルで「質問！」で始まる投稿を検知
   - 自動的にフォーラムチャンネルに投稿を作成

2. **リアクション監視**
   - 監視対象チャンネルで指定された絵文字のリアクションを検知
   - リアクションがついた投稿からフォーラムを作成

3. **フォーラム作成**
   - タイトル形式: `[{投稿者名}] - [{投稿本文}]`
   - 長いタイトルは自動的に切り詰め

4. **エラーハンドリング**
   - 未処理例外をキャッチしてアプリケーションの継続を保証
   - エラー発生時にDiscordチャンネルに通知

## 開発

### プロジェクト構造

```
src/
├── domain/           # ドメイン層
│   ├── entities/     # エンティティ
│   ├── repositories/ # リポジトリインターフェース
│   └── usecases/     # ユースケース
├── infrastructure/   # インフラ層
│   ├── discord/      # Discord API関連
│   ├── logger/       # ログ機能
│   └── config/       # 設定管理
├── application/      # アプリケーション層
│   ├── services/     # アプリケーションサービス
│   └── handlers/     # イベントハンドラー
├── presentation/     # プレゼンテーション層
│   └── bot/          # Bot起動・制御
└── main.ts          # エントリーポイント
```

### 利用技術

- **TypeScript 5.x**: 型安全な開発
- **Discord.js v14**: Discord API ライブラリ
- **Winston**: ログ機能
- **Config**: 設定管理
- **Reflect-metadata**: デコレータサポート

## ライセンス

ISC License
