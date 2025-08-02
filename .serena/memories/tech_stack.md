# 技術スタック

## コア技術
- **ゲームエンジン**: Phaser 3.70.0
- **言語**: TypeScript 5.3.2
- **ランタイム**: ブラウザ（JavaScript ES6）

## ビルドツール
- **バンドラー**: Webpack 5.89.0
- **開発サーバー**: webpack-dev-server 4.15.1
- **TypeScriptローダー**: ts-loader 9.5.1
- **静的ファイルコピー**: copy-webpack-plugin 11.0.0
- **HTMLテンプレート**: html-webpack-plugin 5.5.3

## テスト環境
- **テストフレームワーク**: Jest 30.0.4
- **TypeScript統合**: ts-jest 29.4.0
- **DOM環境**: jest-environment-jsdom 30.0.4
- **Canvasモック**: jest-canvas-mock 2.5.2
- **タイムアウト**: 10秒/テスト

## コード品質管理
- **リンター**: ESLint 9.31.0（フラットコンフィグ形式）
- **フォーマッター**: Prettier 3.6.2
- **TypeScript解析**: @typescript-eslint/parser 8.36.0

## TypeScript設定
- **ターゲット**: ES6
- **モジュール**: ES6
- **厳格モード**: strict: true（全strict設定有効）
- **未使用変数検出**: 有効
- **ソースマップ**: 有効
- **モジュールエイリアス**: `@/` → `src/`

## 開発ポート
- 開発サーバー: 8081
- 本番サーバー: 8080