# [task-10-4] 生産管理UI

## 概要
- エピック: #10
- タスク: #10-4
- 関連PR/要件: @docs/prd/requirements.md セクション5.5.2（生産工場UI）

## 設計方針

### UI設計の基本方針
- 既存のUIパターン（ActionMenu、BaseActionMenu）に従った実装
- 固定位置UIとして画面左側に配置（既存メニューと同じ位置）
- カメラのworldViewを基準にした配置と更新
- 分かりやすい視覚的フィードバック（進捗バー、残り時間表示）

### レイアウト設計
```
+------------------+------------------+
| 生産可能アイテム  | 生産キュー        |
| ・忍者刀(300両)  | 1. 忍者刀 (45秒)  |
| ・手裏剣(200両)  | 2. 手裏剣 (30秒)  |
| ・兵糧丸(50両)   | 3. [空き]         |
| ・弓(400両)      | 4. [空き]         |
| [選択アイテム    | 5. [空き]         |
|  の生産を追加]   | 6. [空き]         |
+------------------+------------------+
```

### インタラクション設計
- 左側のリストからアイテムを選択
- 数量を入力（デフォルト1個、最大99個）
- 「生産を追加」ボタンで空いているラインに追加
- 各ラインの×ボタンで生産キャンセル可能

## インターフェース定義

### ProductionFactoryMenuクラス
```typescript
class ProductionFactoryMenu extends Phaser.GameObjects.Container {
  constructor(config: ProductionFactoryMenuConfig);
  
  // 表示制御
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  updateFixedPosition(): void;
  
  // データ更新
  updateProductionQueues(queues: ProductionLineState[]): void;
  updateAvailableMoney(money: number): void;
  
  // 選択状態
  setSelectedItem(itemType: ProductionItemType | null): void;
  getSelectedItem(): ProductionItemType | null;
  getSelectedQuantity(): number;
}
```

### ProductionFactoryMenuConfig
```typescript
interface ProductionFactoryMenuConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  baseId: string;
  onStartProduction?: (itemType: ProductionItemType, quantity: number) => void;
  onCancelProduction?: (lineIndex: number) => void;
  onClose?: () => void;
}
```

### ProductionItemListクラス（内部コンポーネント）
```typescript
class ProductionItemList extends Phaser.GameObjects.Container {
  // アイテムリストの表示
  setItems(items: ProductionItemDefinition[]): void;
  
  // 選択状態
  setSelectedItem(itemType: ProductionItemType | null): void;
  
  // 有効/無効状態
  updateItemStates(availableMoney: number): void;
}
```

### ProductionQueueListクラス（内部コンポーネント）
```typescript
class ProductionQueueList extends Phaser.GameObjects.Container {
  // キューの表示更新
  updateQueues(queues: ProductionLineState[]): void;
  
  // 進捗バーの更新
  updateProgress(lineIndex: number, progress: number): void;
  
  // キャンセルボタンのコールバック
  onCancelLine?: (lineIndex: number) => void;
}
```

### QuantityInputクラス（内部コンポーネント）
```typescript
class QuantityInput extends Phaser.GameObjects.Container {
  // 数量の取得・設定
  getValue(): number;
  setValue(value: number): void;
  
  // 増減ボタン
  increment(): void;
  decrement(): void;
  
  // 有効/無効
  setEnabled(enabled: boolean): void;
}
```

## UI要素の詳細

### 生産可能アイテムリスト
- 各アイテムは行として表示
- アイコン、名前、費用を表示
- 資金不足のアイテムはグレーアウト
- 選択中のアイテムはハイライト表示

### 生産キューリスト
- 6つの生産ラインを縦に並べて表示
- 各ラインの表示内容：
  - ライン番号（1-6）
  - 生産中アイテム名と残り数量
  - 進捗バー（0-100%）
  - 残り時間（MM:SS形式）
  - キャンセルボタン（×）
- 空きラインは「[空き]」と表示

### 数量入力部
- テキスト入力フィールド
- ＋/－ボタンで増減
- 最小1、最大99の制限
- 資金不足で作成不可能な数は入力不可

### 生産追加ボタン
- アイテム選択時のみ有効
- 空きラインがない場合は無効
- クリックで生産開始処理を実行

## 表示更新フロー

### 初期表示
1. BaseActionMenuから「生産工場」選択
2. ProductionFactoryMenuを生成・表示
3. 生産可能アイテムリストを初期化
4. 現在の生産キューを取得・表示

### リアルタイム更新
1. GameSceneのupdate()から定期的に呼び出し
2. ProductionManagerから最新のキュー状態を取得
3. 各ラインの進捗バーと残り時間を更新
4. 完了したラインは自動的に「[空き]」に変更

### インタラクション後の更新
1. アイテム選択時：選択状態を視覚的に反映
2. 生産開始時：新しいラインを即座に表示
3. キャンセル時：該当ラインを「[空き]」に変更

## 他システムとの連携

### UIManager
- showProductionFactory()メソッドで表示制御
- 他のUIとの排他制御
- update()でのカメラ追従処理

### ProductionManager（task-10-1）
- 生産可能アイテムリストの取得
- 生産開始・キャンセルの実行
- キュー状態の取得

### BaseActionMenu
- 「生産工場」ボタンからの遷移
- メニュー階層の管理

### EconomyDisplay（将来実装）
- 現在の所持金表示との連携
- 資金不足時の視覚的フィードバック

## テスト方針

### 単体テスト
- 各UIコンポーネントの表示/非表示
- 数量入力の境界値（1-99）
- ボタンの有効/無効状態

### 統合テスト
- BaseActionMenuからの遷移
- 生産開始・キャンセルの動作確認
- リアルタイム更新の確認

### ユーザビリティテスト
- 操作の分かりやすさ
- エラー時のフィードバック
- レスポンスの速さ

## 未解決事項
- [ ] アイテムアイコンの表示方法（スプライトシート）
- [ ] 生産完了時の通知方法（ポップアップ、効果音）
- [ ] キーボードショートカットの対応
- [ ] タッチ操作への対応（将来のモバイル版）
- [ ] 生産効率アップグレードUIの追加方法