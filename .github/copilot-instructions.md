<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Discord Forum Bot - Copilot Instructions

## プロジェクト概要
このプロジェクトは、Discord.js v14を使用したTypeScriptベースのDiscord botです。クリーンアーキテクチャに従い、フォーラムチャンネルの自動作成機能を提供します。

## アーキテクチャ指針
- **クリーンアーキテクチャ**: Domain、Application、Infrastructure、Presentationの4層構造
- **SOLID原則**: 各クラスは単一責任を持ち、依存性注入を活用
- **エラーハンドリング**: 例外発生時もアプリケーションの継続を保証

## コーディング規約
- TypeScriptの厳密な型チェックを使用
- async/awaitパターンを優先
- エラーハンドリングはtry-catchブロックで行う
- ログ出力は必ずLoggerクラス経由で行う
- Discord APIの呼び出しは必ずリポジトリ層で実装

## 主要機能
1. **メッセージ監視**: 「質問！」で始まる投稿の検知
2. **リアクション監視**: 特定の絵文字リアクションの検知
3. **フォーラム自動作成**: 条件に基づく自動フォーラム生成
4. **エラーアラート**: 例外発生時のDiscordチャンネル通知

## 依存関係
- discord.js v14
- winston (ログ機能)
- config (設定管理)
- reflect-metadata (デコレータサポート)

## 設定
- 設定は config/default.json で管理
- 環境変数での上書きに対応
- BOTトークンやチャンネルIDは適切に設定が必要
