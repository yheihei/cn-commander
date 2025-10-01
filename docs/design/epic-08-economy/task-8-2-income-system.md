# [task-8-2] 収入システム

## 概要
- エピック: #8
- タスク: #8-2
- 関連PR/要件: エピック8 経済システム - 定期収入処理、ゲーム内時間管理

## 設計方針

### Why（なぜこの設計にしたか）
1. **ゲームループベースの時間管理**: Phaser3のdelta時間を使うことで、ポーズ・メニュー表示時の自動停止を実現
2. **将来のゲームスピード調整に対応**: delta時間ベースなので、ゲームスピード変更（2倍速など）にも自然に対応
3. **精度の確保**: フレーム単位で時間を累積することで、正確な60秒間隔を実現

### What（何を実現するか）
- ゲーム内時間で60秒ごとの定期収入処理
- ポーズ・メニュー表示時の自動停止
- BaseManagerとの連携による拠点ベース収入計算

## High-level design

### ゲーム内時間の仕組み

```
GameScene.update(time, delta)
  ↓ delta時間を渡す
EconomyManager.update(delta)
  ↓ 時間累積
accumulatedTime += delta
  ↓ 60000ms（60秒）到達？
  Yes → 収入処理実行
    ├─ BaseManager.getBasesByOwner('player')
    ├─ calculateIncomePerMinute(bases)
    ├─ addIncome(income)
    └─ accumulatedTime -= 60000
```

### ポーズ対応

```
通常時:
GameScene.update() が呼ばれる
  ↓
EconomyManager.update(delta) が呼ばれる
  ↓
時間が進む

ポーズ時:
GameScene.update() が呼ばれない
  ↓
EconomyManager.update(delta) も呼ばれない
  ↓
時間が止まる（自動的に対応）
```

## インターフェース定義

### EconomyManager拡張

```typescript
class EconomyManager {
  private accumulatedTime: number = 0;
  private static readonly INCOME_INTERVAL_MS = 60000; // 60秒

  /**
   * ゲームループから呼ばれる更新処理
   * @param delta - 前フレームからの経過時間（ミリ秒）
   * @param baseManager - 拠点情報取得用
   */
  public update(delta: number, baseManager: BaseManager): void {
    this.accumulatedTime += delta;

    if (this.accumulatedTime >= EconomyManager.INCOME_INTERVAL_MS) {
      this.processIncome(baseManager);
      this.accumulatedTime -= EconomyManager.INCOME_INTERVAL_MS;
    }
  }

  /**
   * 収入処理を実行
   */
  private processIncome(baseManager: BaseManager): void {
    const playerBases = baseManager.getBasesByOwner('player');
    const income = this.calculateIncomePerMinute(playerBases);
    this.addIncome(income);
    console.log(`収入発生: ${income}両`);
  }
}
```

### GameScene統合

```typescript
class GameScene extends Phaser.Scene {
  private economyManager!: EconomyManager;
  private baseManager!: BaseManager;

  public update(time: number, delta: number): void {
    // 既存の更新処理...

    // 経済システム更新
    this.economyManager.update(delta, this.baseManager);

    // UIManager更新（SystemInfoBar表示更新）
    this.uiManager.update();
  }
}
```

## テスト方針

### 統合テスト観点

1. **時間累積の正確性**:
   - delta時間が正しく累積されるか
   - 60000ms到達時に収入処理が実行されるか
   - 余剰時間が次のサイクルに繰り越されるか

2. **収入処理の正確性**:
   - BaseManager.getBasesByOwner()が正しく呼ばれるか
   - 計算された収入が正しく加算されるか

3. **ポーズ対応**（将来実装時の確認）:
   - update()が呼ばれない間、時間が進まないか

### テストケース例

```typescript
describe('収入システム', () => {
  test('60秒経過で収入が加算される', () => {
    // 初期資金3000両
    // 拠点: 本拠地1つ（200両/分）

    // 59秒経過
    economyManager.update(59000, baseManager);
    expect(economyManager.getMoney()).toBe(3000);

    // さらに1秒経過（合計60秒）
    economyManager.update(1000, baseManager);
    expect(economyManager.getMoney()).toBe(3200);
  });

  test('複数回の収入処理', () => {
    // 120秒経過で2回の収入
    economyManager.update(120000, baseManager);
    expect(economyManager.getMoney()).toBe(3400);
  });
});
```

## 未解決事項
- [ ] 収入発生時のUI通知（メッセージ表示など）
- [ ] 収入発生時の効果音
