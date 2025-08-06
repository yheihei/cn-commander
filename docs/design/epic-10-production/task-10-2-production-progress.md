# [task-10-2] 生産進行システム（バックグラウンド処理）

## 概要
- エピック: #10
- タスク: #10-2
- 関連PR/要件: @docs/prd/requirements.md セクション6.3.3（生産フロー ステップ5-8）

## 設計方針

生産キューに追加されたアイテムを実際に生産する処理を実装する。UIの表示状態に関わらず、バックグラウンドで継続的に生産を進行させる。

### 実装範囲
- リアルタイム生産進行（deltaTimeベース）
- リードタイムによる1個ずつの完成
- アイテム完成時の費用引き落とし
- 完成品の倉庫への自動格納

### 前提条件
- task-10-1でキューにアイテムが追加済み（「0/指定数」状態）
- InventoryManagerのスタブが存在

## インターフェース定義

### ProductionManagerクラス（生産進行部分）
```typescript
class ProductionManager {
  private queues: Map<string, ProductionLine[]>;  // baseId -> lines
  
  // GameSceneから毎フレーム呼び出される
  update(deltaTime: number): void;
  
  // 生産進行の内部処理
  private processProduction(line: ProductionLine, deltaTime: number): void;
  private completeItem(baseId: string, line: ProductionLine): void;
  private chargeProductionCost(itemType: ProductionItemType): boolean;
  private addToInventory(itemType: ProductionItemType): void;
}
```

### ProductionLineクラス
```typescript
class ProductionLine {
  private itemType: ProductionItemType | null;
  private totalQuantity: number;
  private completedQuantity: number;
  private elapsedTime: number;      // 現在アイテムの経過時間
  private timePerItem: number;      // リードタイム（60秒）
  private status: ProductionStatus;
  
  // 時間を進める
  tick(deltaTime: number): ProductionEvent | null;
  
  // 1個完成時の処理
  completeOne(): void;
  
  // 状態確認
  isActive(): boolean;
  isPaused(): boolean;
}
```

### ProductionStatus 列挙型
```typescript
enum ProductionStatus {
  IDLE = 'idle',           // 何も生産していない
  PRODUCING = 'producing', // 生産中
  PAUSED = 'paused',      // 資金不足で一時停止
  QUEUED = 'queued'       // キュー追加済み（生産待機）
}
```

### ProductionEvent
```typescript
interface ProductionEvent {
  type: 'ITEM_COMPLETED' | 'FUNDS_INSUFFICIENT';
  itemType?: ProductionItemType;
  lineIndex?: number;
  completedQuantity?: number;
  totalQuantity?: number;
}
```

## 生産進行フロー

### 1. update()の処理フロー
```typescript
update(deltaTime: number) {
  for (const [baseId, lines] of this.queues) {
    for (const line of lines) {
      if (line.isActive()) {
        this.processProduction(line, deltaTime);
      }
    }
  }
}
```

### 2. 個別ラインの処理
```typescript
processProduction(line: ProductionLine, deltaTime: number) {
  const event = line.tick(deltaTime);
  
  if (event?.type === 'ITEM_COMPLETED') {
    // 資金確認
    if (this.chargeProductionCost(line.itemType)) {
      // 倉庫に追加
      this.addToInventory(line.itemType);
      // カウント更新
      line.completeOne();
    } else {
      // 資金不足で一時停止
      line.pause();
    }
  }
}
```

### 3. リードタイム計算
```typescript
// ProductionLine.tick()内
tick(deltaTime: number): ProductionEvent | null {
  if (this.status !== ProductionStatus.PRODUCING) {
    return null;
  }
  
  this.elapsedTime += deltaTime;
  
  if (this.elapsedTime >= this.timePerItem) {
    this.elapsedTime = 0;  // リセット
    return {
      type: 'ITEM_COMPLETED',
      itemType: this.itemType,
      completedQuantity: this.completedQuantity + 1,
      totalQuantity: this.totalQuantity
    };
  }
  
  return null;
}
```

### 4. アイテム完成処理
```typescript
completeOne() {
  this.completedQuantity++;
  
  // 全数完成はtask-10-3で処理
  if (this.completedQuantity < this.totalQuantity) {
    // 次のアイテム生産を継続
    this.elapsedTime = 0;
  }
}
```

## データフロー

### 生産進行中のデータ変化
```typescript
// 初期状態（task-10-1で作成）
{
  itemType: ProductionItemType.NINJA_SWORD,
  totalQuantity: 20,
  completedQuantity: 0,
  elapsedTime: 0,
  status: 'producing'
}

// 30秒経過後
{
  completedQuantity: 0,
  elapsedTime: 30,  // 半分経過
  status: 'producing'
}

// 60秒経過後（1個完成）
{
  completedQuantity: 1,
  elapsedTime: 0,   // リセット
  status: 'producing'
}
```

## 他システムとの連携

### GameScene
- update()メソッドから毎フレームProductionManager.update()を呼び出し
- UIの表示状態に関わらず常に実行

### EconomyManager（将来実装）
- chargeProductionCost()で資金引き落とし
- 資金不足時は生産を一時停止

### InventoryManager
- addToInventory()で完成品を倉庫に追加
- 1個完成ごとに即座に格納

## バックグラウンド処理の実装

### GameSceneでの呼び出し
```typescript
// GameScene.update()
update(time: number, delta: number) {
  const deltaTime = delta / 1000; // ミリ秒を秒に変換
  
  // UIの状態に関わらず常に実行
  if (this.productionManager) {
    this.productionManager.update(deltaTime);
  }
  
  // 他のupdate処理...
}
```

## エラーハンドリング

### 資金不足時
- 生産を一時停止（PAUSEDステータス）
- 資金が回復したら自動再開（将来実装）

### 倉庫満杯時（将来実装）
- 生産を一時停止
- 倉庫に空きができたら再開

## テスト方針

### 単体テスト
- リードタイム計算の正確性
- アイテム完成タイミング
- 資金引き落としタイミング

### 統合テスト
- UIを閉じても生産が継続することの確認
- 複数ラインの並行処理
- 倉庫への格納確認

### パフォーマンステスト
- 6ライン×複数拠点の同時処理

## 未解決事項
- [ ] 資金システムの具体的な実装
- [ ] 生産速度ボーナスの適用方法
- [ ] オフライン時の生産進行（セーブ/ロード対応）