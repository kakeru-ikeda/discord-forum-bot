# Node.js 20のLTS版を使用
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# TypeScriptをグローバルにインストール
RUN npm install -g typescript

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# ログディレクトリを作成
RUN mkdir -p logs

# 非rootユーザーを作成して切り替え
RUN addgroup -g 1001 -S nodejs
RUN adduser -S discordbot -u 1001
USER discordbot

# ポート3000を公開（必要に応じて）
EXPOSE 3000

# アプリケーションを起動
CMD ["npm", "start"]
