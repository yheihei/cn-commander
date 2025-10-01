# [task-8-1] 資金管理システム

## 概要
- エピック: #8
- タスク: #8-1
- 関連PR/要件: エピック8 経済システム - 資金管理、収入計算、UI表示

## 設計方針

### Why（なぜこの設計にしたか）
1. **拠点ベースの収入計算**: 各拠点が個別の収入値を持つことで、拠点ごとの価値を明確化
2. **集約的な計算**: EconomyManagerが全拠点の収入を集計することで、収入計算ロジックを一箇所に集約
3. **BaseManagerとの疎結合**: BaseManagerから拠点リストを取得するだけで、収入計算はEconomyManagerが担当

### What（何を実現するか）
- 拠点タイプに応じた収入計算（本拠地200両/分、占領拠点100両/分）
- 現在の総収入/分の計算機能
- システム情報バー（右上UI）での所持金・収入表示

## High-level design

### コンポーネント構成

```
EconomyManager
├─ calculateIncomePerMinute(bases: Base[]): number
│  └─ 各拠点のgetIncome()を合計
├─ getMoney(): number
├─ spend(cost: number): boolean
└─ addIncome(amount: number): void

SystemInfoBar (新規作成)
├─ 表示位置: 画面右上（worldView基準）
├─ 表示内容: 所持金、収入/分
└─ updateDisplay(money: number, income: number): void

UIManager
└─ SystemInfoBarの管理とupdate()での位置更新
```

### データフロー

```
BaseManager.getBasesByOwner('player')
  ↓
EconomyManager.calculateIncomePerMinute(bases)
  ↓ 各Base.getIncome()を合計
総収入/分
  ↓
SystemInfoBar.updateDisplay(money, income)
  ↓
画面右上に表示更新
```

## インターフェース定義

### EconomyManager

```typescript
class EconomyManager {
  /**
   * 全味方拠点の収入を計算
   * @param bases - BaseManager.getBasesByOwner('player')で取得した拠点リスト
   * @returns 総収入/分
   */
  public calculateIncomePerMinute(bases: Base[]): number;

  // 既存メソッド
  public getMoney(): number;
  public canAfford(cost: number): boolean;
  public spend(cost: number): boolean;
  public addIncome(amount: number): void;
  public setMoney(amount: number): void; // テスト用
}
```

### SystemInfoBar

```typescript
class SystemInfoBar extends Phaser.GameObjects.Container {
  constructor(config: {
    scene: Phaser.Scene;
    x: number;  // 初期位置（画面外）
    y: number;
  });

  /**
   * 表示内容を更新
   * @param money - 現在の所持金
   * @param income - 収入/分
   */
  public updateDisplay(money: number, income: number): void;

  /**
   * 表示/非表示切り替え
   */
  public show(): void;
  public hide(): void;
}
```

### UIManager統合

```typescript
class UIManager {
  private systemInfoBar: SystemInfoBar | null = null;

  /**
   * SystemInfoBarの初期化
   */
  private initSystemInfoBar(): void;

  /**
   * update()でSystemInfoBarの位置を更新
   */
  public update(): void;
}
```

## テスト方針

### 統合テスト観点
1. **収入計算の正確性**:
   - 本拠地1つ: 200両/分
   - 本拠地1つ + 占領拠点2つ: 400両/分
   - 拠点なし: 0両/分

2. **UI表示の正確性**:
   - 所持金の表示フォーマット
   - 収入/分の表示フォーマット
   - 値変更時の即座な更新

3. **BaseManagerとの連携**:
   - getBasesByOwner('player')の正しい呼び出し
   - 拠点所有権変更時の収入再計算

## 未解決事項
- [ ] SystemInfoBarのデザイン詳細（フォント、色、枠線など）
- [ ] 収入値の表示フォーマット（カンマ区切り、単位など）
