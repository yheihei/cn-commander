# [task-10-1] 生産開始フロー（生産指示〜キュー追加）

## 概要
- エピック: #10
- タスク: #10-1
- 関連PR/要件: @docs/prd/requirements.md セクション6.3.3（生産フロー ステップ1-4）

## 設計方針

生産システムの入口となる機能を実装する。ユーザーが拠点から生産工場にアクセスし、アイテムを選択して生産を開始するまでのフローに焦点を当てる。

### 実装範囲
- 拠点のActionMenuから生産工場を選択
- 生産可能アイテムのリスト表示
- アイテム選択と数量指定
- 生産ラインへの追加（「0/指定数」形式）

### 除外範囲（後続タスクで実装）
- 実際の生産進行処理（task-10-2）
- 進捗表示の更新（task-10-3）
- キャンセル機能（task-10-4）

## インターフェース定義

### ProductionFactoryMenuクラス
```typescript
class ProductionFactoryMenu extends Phaser.GameObjects.Container {
  constructor(config: ProductionFactoryMenuConfig);
  
  // UI表示制御
  show(): void;
  hide(): void;
  
  // アイテムリスト表示
  displayProductionItems(items: ProductionItemDefinition[]): void;
  
  // 選択状態管理
  selectItem(itemType: ProductionItemType): void;
  setQuantity(quantity: number): void;
  
  // 生産開始
  onStartProduction(): void;  // 内部でキューへの追加を実行
}
```

### ProductionManagerクラス（基本部分のみ）
```typescript
class ProductionManager {
  constructor(scene: Phaser.Scene);
  
  // 生産可能アイテムの定義
  getProductionItems(): ProductionItemDefinition[];
  
  // キューへの追加（初期状態「0/指定数」）
  addToQueue(baseId: string, itemType: ProductionItemType, quantity: number): boolean;
  
  // 空きライン確認
  hasAvailableSlot(baseId: string): boolean;
  getAvailableSlotIndex(baseId: string): number;
}
```

### ProductionItemDefinition
```typescript
interface ProductionItemDefinition {
  type: ProductionItemType;
  name: string;
  category: 'weapon' | 'consumable';
  productionTime: number;   // 60秒（表示用）
  productionCost: number;   // 費用（両）
}
```

### ProductionQueue（初期状態）
```typescript
interface ProductionQueue {
  itemType: ProductionItemType;
  totalQuantity: number;        // 生産指示合計数
  completedQuantity: number;    // 0で初期化
  lineIndex: number;            // ライン番号（0-5）
  status: 'queued';             // 初期状態
}
```

## UIフロー

### 1. 生産工場へのアクセス
```
ユーザー操作: 拠点をクリック
→ BaseActionMenu表示
→ 「生産工場」を選択
→ ProductionFactoryMenu表示
```

### 2. アイテム選択
```
ProductionFactoryMenu内:
- 左側: 生産可能アイテムリスト
  - 忍者刀 (300両, 60秒/個)
  - 手裏剣 (200両, 60秒/個)
  - 弓 (400両, 60秒/個)
  - 兵糧丸 (50両, 60秒/個)
- アイテムクリックで選択状態に
```

### 3. 数量指定
```
- 数量入力フィールド: デフォルト1
- ＋/－ボタンで増減
- 最大99個まで指定可能
- 資金による制限表示
```

### 4. キューへの追加
```
「生産を追加」ボタンクリック:
→ 空きラインを検索
→ キューに「0/指定数」として追加
→ 右側のキューリストに表示
  例: "1. 忍者刀 0/20"
```

## データフロー

### 生産開始時のデータ
```typescript
// UIからManagerへ
{
  baseId: "base_001",
  itemType: ProductionItemType.NINJA_SWORD,
  quantity: 20
}

// Managerでキュー生成
{
  itemType: ProductionItemType.NINJA_SWORD,
  totalQuantity: 20,
  completedQuantity: 0,    // 初期値
  lineIndex: 0,            // 空きライン
  status: 'queued'
}
```

## 他システムとの連携

### BaseActionMenu
- 「生産工場」ボタンからProductionFactoryMenuを起動

### UIManager
- showProductionFactory()でメニュー表示を管理
- 他のUIとの排他制御

### EconomyManager（将来実装）
- 資金残高の確認（表示のみ、この時点では引き落とさない）

## エラーハンドリング

- 空きラインがない場合: 「生産ラインが満杯です」メッセージ表示
- 資金不足の場合: この時点では警告のみ（実際の引き落としはtask-10-2）

## テスト方針

### 単体テスト
- アイテムリストの表示
- 選択状態の管理
- 数量入力の境界値（1-99）
- キューへの追加処理

### 統合テスト
- BaseActionMenuからの遷移
- 6ライン全て使用時の動作
- UIの開閉

## 未解決事項
- [ ] アイテムアイコンの表示方法
- [ ] 生産可能アイテムのフィルタリング（将来的な拡張）