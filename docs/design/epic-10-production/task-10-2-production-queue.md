# [task-10-2] 生産キュー管理（リアルタイム進行）

## 概要
- エピック: #10
- タスク: #10-2
- 関連PR/要件: @docs/prd/requirements.md セクション6.3.3（生産フロー）

## 設計方針

### リアルタイム処理アプローチ
- Phaser3のupdate()メソッドでdeltaTimeベースの進行管理
- 各生産ラインは独立してタイマーを持ち、並行処理が可能
- 生産完了は即座に検知し、次のアイテム生産を自動開始

### キュー管理の設計
- 各生産ラインは単一のProductionLineオブジェクトで管理
- キューは数量ベースで管理（同一アイテムをN個生産）
- 生産中断・再開をサポート（資金不足時など）

### 状態管理
- 生産状態を明確に定義（待機中、生産中、一時停止、完了）
- 状態遷移を厳密に管理してバグを防止

## インターフェース定義

### ProductionLineクラス
```typescript
class ProductionLine {
  // 生産ライン状態
  private state: ProductionState;
  private itemType: ProductionItemType | null;
  private remainingQuantity: number;
  private currentProgress: number;  // 0-1の値
  private elapsedTime: number;      // 現在のアイテムの経過時間（秒）
  
  // 生産開始
  start(itemType: ProductionItemType, quantity: number): void;
  
  // 生産更新（毎フレーム呼び出し）
  update(deltaTime: number): ProductionEvent | null;
  
  // 生産キャンセル
  cancel(): void;
  
  // 一時停止・再開
  pause(): void;
  resume(): void;
  
  // 状態取得
  getState(): ProductionLineState;
  isEmpty(): boolean;
  isActive(): boolean;
}
```

### ProductionState 列挙型
```typescript
enum ProductionState {
  IDLE = 'IDLE',           // 待機中（何も生産していない）
  PRODUCING = 'PRODUCING', // 生産中
  PAUSED = 'PAUSED',      // 一時停止中（資金不足等）
  COMPLETED = 'COMPLETED'  // 完了（次の指示待ち）
}
```

### ProductionEvent インターフェース
```typescript
interface ProductionEvent {
  type: 'ITEM_COMPLETED' | 'QUEUE_COMPLETED' | 'PAUSED';
  itemType?: ProductionItemType;
  lineIndex?: number;
}
```

### ProductionLineState インターフェース
```typescript
interface ProductionLineState {
  state: ProductionState;
  itemType: ProductionItemType | null;
  remainingQuantity: number;
  currentProgress: number;      // 0-1の進捗率
  estimatedTimeRemaining: number; // 残り時間（秒）
}
```

### ProductionQueueManagerクラス
```typescript
class ProductionQueueManager {
  private lines: Map<string, ProductionLine[]>; // baseId -> ProductionLine[]
  
  // ライン管理
  initializeBase(baseId: string): void;
  getLines(baseId: string): ProductionLine[];
  
  // 生産操作
  addToQueue(baseId: string, itemType: ProductionItemType, quantity: number): number | null;
  cancelLine(baseId: string, lineIndex: number): void;
  
  // 更新処理
  updateAll(deltaTime: number): ProductionEvent[];
  
  // 状態確認
  getQueueStates(baseId: string): ProductionLineState[];
  getActiveLineCount(baseId: string): number;
}
```

## データ構造の概要

### 生産ライン管理
- ProductionLineクラスが個々の生産ラインを管理
- 各ラインは独立した状態とタイマーを持つ
- 最大6ラインの配列として管理

### 進捗計算
- deltaTimeを累積して経過時間を管理
- 進捗率 = 経過時間 / アイテム生産時間
- 1個完成ごとに経過時間をリセット

### イベント通知
- 生産完了時にイベントを発行
- ProductionManagerがイベントを受け取って処理

## 生産フロー詳細

### 生産開始フロー
1. 空いているラインを検索
2. アイテムタイプと数量を設定
3. 状態をPRODUCINGに変更
4. タイマーを開始

### 生産進行フロー
1. update()でdeltaTimeを加算
2. 進捗率を計算
3. 1個完成したらイベント発行
4. 残り数量を減少
5. 次のアイテム生産を開始

### 生産完了フロー
1. 最後のアイテム完成時にQUEUE_COMPLETEDイベント発行
2. ラインをIDLE状態に戻す
3. 次の生産指示を待機

### 一時停止フロー
1. 資金不足等でPAUSED状態に遷移
2. タイマーを停止（経過時間は保持）
3. 資金回復時にresume()で再開

## 他システムとの連携

### ProductionManager（task-10-1）
- ProductionQueueManagerのインスタンスを保持
- イベントを受け取ってInventoryManagerへアイテム追加
- 資金確認と引き落とし処理

### ProductionFactoryMenu（task-10-4）
- getQueueStates()で表示用データを取得
- 進捗バーの表示に使用
- キャンセル操作の実行

## テスト方針

### 単体テスト
- 生産タイマーの正確性
- 状態遷移の妥当性
- キャンセル・一時停止の動作

### 統合テスト
- 複数ラインの並行動作
- イベント発行と処理の連携
- エッジケース（0個生産、大量生産等）

### パフォーマンステスト
- 複数拠点×6ラインの同時更新
- deltaTimeの精度と処理負荷

## 未解決事項
- [ ] 生産速度ボーナスの適用方法
- [ ] オフライン時の生産進行（セーブ/ロード対応）
- [ ] 生産優先度の設定（どのラインを優先するか）
- [ ] 生産予約機能（キューの次に何を作るか事前設定）