# 統合テストルール

## 基本方針

### 統合テストの目的
- ゲームシステムの各コンポーネントが正しく連携することを確認
- ビジネスロジックに焦点を当て、描画や音声などの副作用は除外
- 高速で安定したテスト実行環境を維持

### テストアプローチの選択
- **モックベース**を推奨（Phaser HEADLESSモードより安定）
- ゲームエンジンの内部実装に依存しない設計
- メモリリークを防ぐ軽量な実装

## テスト構造

### 1. テストファイルの配置
```
test/
├── integration/      # 統合テスト
├── fixtures/         # テストデータ
└── setup.ts         # テスト環境のセットアップ
```

### 2. テストケースの構成
統合テストは以下の観点で構成します：

1. **基本機能の統合確認**
   - システムの初期化と基本動作
   - コンポーネント間の連携
   - データの流れ

2. **境界値と異常系**
   - 境界値での動作確認
   - エラーハンドリング
   - 不正データの処理

3. **パフォーマンス確認**
   - 大規模データでの動作
   - 処理速度の確認
   - メモリ使用量の監視

4. **実使用シナリオ**（必須）
   - 実際のゲームプレイを想定した動作
   - 複数機能の組み合わせ
   - ユーザー操作の流れ

### 3. テストデータ
- 有効なデータは`test/fixtures/validXxx.json`に配置
- 無効なデータは`test/fixtures/invalidXxx.json`に配置
- テストデータは実際のゲームで使用される形式に準拠

## モック実装方針

### Phaserモックの例
```typescript
// test/setup.ts
jest.mock('phaser', () => ({
  GameObjects: {
    Sprite: class MockSprite {
      constructor(public scene: any, public x: number, public y: number, public texture: string, public frame?: string | number) {}
      setDisplaySize = jest.fn();
      setInteractive = jest.fn();
      on = jest.fn();
      destroy = jest.fn();
    }
  },
  // その他の必要なクラスをモック
}));
```

### モックシーンの作成
```typescript
export const createMockScene = () => {
  const mockScene = {
    add: {
      existing: jest.fn(),
      sprite: jest.fn((x, y, texture, frame) => ({
        x, y, texture, frame,
        setDisplaySize: jest.fn(),
        destroy: jest.fn()
      }))
    },
    cameras: {
      main: {
        width: 1280,
        height: 720,
        setBounds: jest.fn()
      }
    }
  };
  return mockScene;
};
```

### テストの書き方
```typescript
describe('システム Integration Tests', () => {
  let scene: any;
  let manager: Manager;

  beforeEach(() => {
    scene = createMockScene();
    manager = new Manager(scene);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('機能カテゴリ', () => {
    test('具体的なテストケース', () => {
      // Arrange: 準備
      // Act: 実行
      // Assert: 検証
    });
  });
});
```

## ベストプラクティス

### パフォーマンスの考慮
- 大規模データテストは適度なサイズに制限（例：512x512→100x100）
- メモリ使用量を考慮し、`NODE_OPTIONS="--max-old-space-size=4096"`を使用

### エラーハンドリング
- 不正データでもクラッシュしないことを確認
- エラーは適切にハンドリングされることを検証

### クリーンアップ
- 各テスト後に必ずリソースを解放
- グローバル状態をリセット

## 実行方法

### コマンド一覧
package.jsonに以下のスクリプトを定義：
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### jest.config.js の基本設定
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/index.ts'],
};
```

## 注意事項

### Phaser HEADLESSモードの問題点
- メモリリークが発生しやすい
- Canvas APIの互換性問題
- 初期化の複雑さ

これらの理由により、**モックベースのアプローチを推奨**します。

### チェックリスト

統合テスト作成時の確認事項：

- [ ] ビジネスロジックに焦点を当てているか
- [ ] 描画や音声などの副作用を除外しているか
- [ ] テストが高速に実行されるか（全体で3秒以内）
- [ ] リソースのクリーンアップが適切に行われているか
- [ ] モックが必要最小限に抑えられているか
- [ ] テストデータが実際の使用に即しているか
- [ ] エラーケースが網羅されているか