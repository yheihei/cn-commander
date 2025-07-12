# [task-1-1] Phaser3プロジェクト初期セットアップ

## 概要
- エピック: #1（基盤システム）
- タスク: #1-1
- 関連PR/要件: 1280x720解像度、30FPS設定でのPhaser3エンジン初期化

## 設計方針

### 技術選定
- **Phaser 3.70.0**: 最新の安定版を採用し、長期的なサポートと豊富な機能を確保
- **TypeScript 5.3.2**: 型安全性とIDEサポートによる開発効率向上
- **Webpack 5.89.0**: モジュールバンドリングと開発サーバーによる快適な開発環境

### アーキテクチャの選択理由
- **シーン管理型アーキテクチャ**: Phaser3のシーンシステムを活用し、画面遷移を明確に管理
- **設定の外部化**: ゲーム設定を独立したファイルに分離し、保守性を向上
- **型定義の整備**: TypeScriptの型定義により、開発時のエラーを未然に防止

### 既存システムとの整合性
- 新規プロジェクトのため、ベストプラクティスに従った構成を採用
- 将来的な拡張を考慮したモジュラー設計

## 実装詳細

### クラス構成

#### 1. エントリーポイント（src/index.ts）
```typescript
- Phaser.Gameインスタンスの生成
- シーンの登録（BootScene, PreloadScene, GameScene）
- デバッグ用のグローバル公開
```

#### 2. ゲーム設定（src/config/gameConfig.ts）
```typescript
const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,           // WebGLとCanvasの自動選択
  width: 1280,                  // 画面幅
  height: 720,                  // 画面高さ
  fps: {
    target: 30,                 // 目標FPS
    forceSetTimeOut: false      // 高精度タイマー使用
  },
  scale: {
    mode: Phaser.Scale.FIT,     // 画面サイズに合わせてフィット
    autoCenter: Phaser.Scale.CENTER_BOTH,  // 中央配置
    parent: 'game-container',   // HTML要素ID
    min: { width: 640, height: 360 },      // 最小サイズ
    max: { width: 1920, height: 1080 }     // 最大サイズ
  },
  physics: {
    default: 'arcade',          // Arcade物理エンジン
    arcade: {
      gravity: { x: 0, y: 0 },  // 重力なし（トップダウンビュー）
      debug: false              // デバッグ表示オフ
    }
  },
  backgroundColor: '#2d2d2d',   // 背景色
  pixelArt: true,               // ピクセルアート最適化
  antialias: false,             // アンチエイリアス無効
  roundPixels: true,            // ピクセル位置を整数に丸める
  scene: []                     // シーンは動的に追加
};
```

#### 3. BootScene（src/scenes/BootScene.ts）
```typescript
class BootScene extends Phaser.Scene {
  - プログレスバー表示機能
  - タイトル画面表示
  - FPS・解像度情報表示（デバッグ用）
  - クリックでPreloadSceneへ遷移
}
```

### データ構造
- **シーン管理**: Phaser.Sceneを継承したクラスベースのシーン
- **設定管理**: Phaser.Types.Core.GameConfig型に準拠した設定オブジェクト

### アルゴリズムの説明
- **FPS更新**: updateメソッド内でgame.loop.actualFpsを参照し、リアルタイムFPSを表示
- **プログレスバー**: load.on('progress')イベントでアセット読み込み進捗を監視

### ビルド設定

#### Webpack設定（webpack.config.js）
```javascript
- エントリーポイント: src/index.ts
- 出力: dist/bundle.js
- 開発サーバー: ポート8080、ホットリロード有効
- プラグイン:
  - HtmlWebpackPlugin: public/index.htmlをテンプレートに使用
  - CopyWebpackPlugin: assetsフォルダを自動コピー
```

#### TypeScript設定（tsconfig.json）
```typescript
- ターゲット: ES6
- 厳格モード: 全strict設定有効
- ソースマップ: 有効
- 未使用変数チェック: 有効
- モジュール解決: Node方式
```

## インターフェース定義

### 公開API
なし（エントリーポイントのみ）

### 他システムとの連携方法
- **HTML連携**: 'game-container'要素にゲームを描画
- **シーン間連携**: scene.start()メソッドによるシーン遷移
- **グローバルアクセス**: window.gameでデバッグアクセス可能

### イベント/コールバック
- **load.on('progress')**: アセット読み込み進捗
- **load.on('complete')**: アセット読み込み完了
- **pointerover/out/down**: ボタンインタラクション

## テスト方針

### 統合テストの観点
- ゲームインスタンスの正常な初期化
- 設定値（解像度、FPS）の適用確認
- シーン遷移の動作確認
- プログレスバーの表示・非表示

### テスト環境
- **Jest + ts-jest**: TypeScriptサポート付きテスティングフレームワーク
- **jsdom**: ブラウザ環境のシミュレーション
- **jest-canvas-mock**: Canvas APIのモック
- **カスタムPhaser Mock**: test/setup.tsでPhaser全体をモック化

### モック戦略
- Phaser.Gameクラスを完全にモック化し、副作用を排除
- Canvas、WebGL、AudioContextなどのブラウザAPIをモック
- createMockScene()ヘルパー関数でテスト用シーンを生成

## 未解決事項
- [ ] 本格的なアセット管理システムの実装
- [ ] エラーハンドリングの強化（ゲーム初期化失敗時の処理）
- [ ] パフォーマンス最適化の検討（メモリ使用量の監視）
- [ ] ゲーム設定の外部化（ユーザー設定の保存・読み込み）

## 実装状況
- [x] Phaser3プロジェクトの初期化
- [x] 1280x720解像度、30FPS設定の適用
- [x] TypeScript + Webpack開発環境の構築
- [x] 基本的なシーン構造（BootScene → PreloadScene → GameScene）
- [x] テスト環境の整備（Jest + Phaserモック）

## プロジェクト構造
```
cn-commander/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── config/
│   │   ├── gameConfig.ts     # ゲーム設定
│   │   └── mapConfig.ts      # マップ設定
│   ├── scenes/
│   │   ├── BootScene.ts      # 初期読み込みシーン
│   │   ├── PreloadScene.ts   # アセット読み込みシーン
│   │   └── GameScene.ts      # ゲームメインシーン
│   ├── map/                  # マップ関連（他タスクで実装）
│   └── types/
│       └── global.d.ts       # TypeScript型定義
├── public/
│   └── index.html            # HTMLテンプレート
├── test/
│   ├── setup.ts              # テスト環境設定
│   └── integration/          # 統合テスト
├── assets/                   # ゲームアセット
├── dist/                     # ビルド出力
├── package.json              # npm設定
├── tsconfig.json             # TypeScript設定
├── webpack.config.js         # Webpack設定
└── jest.config.js            # Jest設定
```

## 関連ファイル
- `/src/index.ts` - エントリーポイント
- `/src/config/gameConfig.ts` - ゲーム設定
- `/src/scenes/BootScene.ts` - 起動シーン
- `/public/index.html` - HTMLテンプレート
- `/test/setup.ts` - テスト環境のモック設定