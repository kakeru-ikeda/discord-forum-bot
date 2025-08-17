<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Discord Forum Bot - Copilot Instructions

## プロジェクト概要
このプロジェクトは、Discord.js v14を使用したTypeScriptベースのDiscord botです。クリーンアーキテクチャに従い、フォーラムチャンネルの自動作成機能を提供します。

## アーキテクチャ指針
- **クリーンアーキテクチャ**: Domain、Application、Infrastructure、Presentationの4層構造
  - コードを追加する際は、各層の責任を明確に分離する。ユーザー要求が既存クラスの責務を超える場合は、新しいクラスを作成する。
- **SOLID原則**: 各クラスは単一責任を持ち、依存性注入を活用
- **エラーハンドリング**: 例外発生時もアプリケーションの継続を保証

## コーディング規約
- TypeScriptの厳密な型チェックを使用
- async/awaitパターンを優先
- エラーハンドリングはtry-catchブロックで行う
- ログ出力は必ずLoggerクラス経由で行う
- Discord APIの呼び出しは必ずリポジトリ層で実装
- 設定値アクセスは必ずConfigManager.getInstance().getConfig()経由で行う
- 新しい設定項目追加時はインターフェース定義と検証ロジックを同時に実装

## 主要機能
1. **メッセージ監視**: 「質問！」で始まる投稿の検知
2. **リアクション監視**: 特定の絵文字リアクションの検知
3. **フォーラム自動作成**: 条件に基づく自動フォーラム生成
4. **エラーアラート**: 例外発生時のDiscordチャンネル通知

## 依存関係
- discord.js v14 (Discord API操作)
- winston (ログ機能)
- reflect-metadata (デコレータサポート)

## 設定管理
- **JSONファイルベース**: `config/default.json`を使用した設定管理
- **型安全性**: TypeScriptインターfaces（IDiscordConfig、ILoggingConfig等）による設定値の検証
- **ConfigManagerクラス**: シングルトンパターンで設定値へのアクセスを一元管理
- **セキュリティ**: 本番設定ファイル（default.json）はgitignoreで除外
- **テンプレート**: `config/default.json.example`でサンプル設定を提供

## コード生成・修正時の注意点
- 設定値アクセスは必ずConfigManager経由で行う
- 新しい設定項目追加時はインターフェース定義も更新
- 設定ファイルの検証ロジックも適切に実装
- 環境変数は使用禁止（JSONファイル設定のみ使用）
