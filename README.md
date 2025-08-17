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

### 2. 設定ファイルの作成

`config/default.json.example`ファイルを`config/default.json`にコピーし、以下の値を設定してください：

```bash
cp config/default.json.example config/default.json
```

必須の設定項目：
- `discord.token`: Discord botのトークン
- `discord.guildId`: 対象サーバーのID
- `discord.channelMappings`: 監視チャンネルとフォーラムチャンネルのマッピング（配列形式）
  - `monitorChannelId`: 監視するチャンネルのID
  - `forumChannelId`: 対応するフォーラム投稿先のチャンネルID
- `discord.alertChannelId`: アラート通知先のチャンネルID

設定例：
```json
{
  "discord": {
    "channelMappings": [
      {
        "monitorChannelId": "123456789012345678",
        "forumChannelId": "987654321098765432"
      },
      {
        "monitorChannelId": "111111111111111111",
        "forumChannelId": "222222222222222222"
      }
    ]
  }
}
```

この設定により、各監視チャンネルで質問やトリガー絵文字が検知されたとき、対応するフォーラムチャンネルにフォーラムが作成されます。

オプションの設定項目：
- `discord.triggerEmoji`: フォーラム作成のトリガー絵文字（デフォルト: 🙋）
  - Unicode絵文字: `🙋`
  - デフォルト絵文字名: `:person_raising_hand:`
  - カスタム絵文字: `<:emoji_name:123456789>`
  - アニメーション絵文字: `<a:emoji_name:123456789>`
- `discord.questionPrefix`: 質問として認識するプレフィックスの配列（デフォルト: ["質問！", "質問", "Q:"]）
- `LOG_LEVEL`: ログレベル（デフォルト: info）

接続管理設定：
- `HEALTH_CHECK_INTERVAL`: ヘルスチェック間隔（ミリ秒）（デフォルト: 30000）
- `RECONNECTION_STRATEGY`: 再接続戦略（exponential | fixed）（デフォルト: exponential）

指数バックオフ戦略設定：
- `EXPONENTIAL_BASE_DELAY`: 初期遅延（ミリ秒）（デフォルト: 1000）
- `EXPONENTIAL_MAX_DELAY`: 最大遅延（ミリ秒）（デフォルト: 60000）
- `EXPONENTIAL_MAX_RETRIES`: 最大再試行回数（デフォルト: 10）
- `EXPONENTIAL_BACKOFF_MULTIPLIER`: バックオフ倍率（デフォルト: 2）

固定間隔戦略設定：
- `FIXED_INTERVAL`: 再接続間隔（ミリ秒）（デフォルト: 5000）
- `FIXED_MAX_RETRIES`: 最大再試行回数（デフォルト: 20）
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

## Docker での実行

### 前提条件

- Docker Engine 20.10以上
- Docker Compose v2 (推奨)

### セットアップ

1. 環境変数ファイルを準備：
```bash
cp .env.example .env
# .env ファイルを編集して実際の値を設定
```

2. Docker Compose を使用して起動：

```bash
# Docker Compose v2 を使用
docker compose up -d

# または npm script を使用
npm run docker:up
```

### Docker コマンド

#### ビルド
```bash
# 本番用イメージをビルド
npm run docker:build
```

#### 起動・停止
```bash
# 起動
npm run docker:up

# 停止
npm run docker:down
```

#### ログ確認
```bash
# リアルタイムログ表示
npm run docker:logs

# または直接 Docker Compose コマンドを使用
docker compose logs -f discord-bot
```

#### その他の Docker 操作
```bash
# コンテナの状態確認
docker compose ps

# コンテナに接続
docker compose exec discord-bot sh

# イメージの削除
docker compose down --rmi all

# ボリュームも含めて削除
docker compose down -v
```

### Docker 設定のカスタマイズ

必要に応じて以下のファイルを編集してください：

- `Dockerfile`: 本番用コンテナ設定
- `compose.yml`: 本番用 Docker Compose 設定
- `.dockerignore`: Docker ビルド時に除外するファイル

### 開発環境での実行

開発時は Docker を使わず、直接 npm で実行することを推奨します：

```bash
# 開発環境での起動
npm run dev
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
   - タイトル形式: `{投稿者名} - [{投稿本文}]`
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
