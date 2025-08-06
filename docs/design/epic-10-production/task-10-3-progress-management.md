# [task-10-3] 進捗管理と完了処理

## 概要
- エピック: #10
- タスク: #10-3  
- 関連PR/要件: @docs/prd/requirements.md セクション6.3.3（生産フロー ステップ9-10）

## 設計方針

生産の進捗を可視化し、生産完了時の自動削除を実装する。ユーザーが生産状況を把握しやすくすることに焦点を当てる。

### 実装範囲
- 「現在数/合計数」形式での進捗表示
- 進捗バーの更新（現在作成中アイテムの進捗）
- 残り時間の計算と表示
- 生産完了時のキューからの自動削除

### 前提条件
- task-10-2で生産進行処理が実装済み
- ProductionLineが completedQuantity を更新している

## インターフェース定義

### ProductionFactoryMenuクラス（進捗表示部分）
```typescript
class ProductionFactoryMenu {
  // 進捗表示の更新（毎フレーム呼び出し）
  updateProgressDisplay(): void;
  
  // 個別ラインの表示更新
  private updateLineDisplay(lineIndex: number, queue: ProductionQueue | null): void;
  
  // 進捗バーコンポーネント
  private createProgressBar(progress: number): Phaser.GameObjects.Container;
  
  // 残り時間フォーマット
  private formatRemainingTime(seconds: number): string;
}
```

### ProductionLineクラス（進捗管理部分）
```typescript
class ProductionLine {
  // 進捗情報の取得
  getProgress(): ProductionProgress;
  
  // 表示用テキストの生成
  getDisplayText(): string;  // "忍者刀 5/20"
  
  // 完了判定と自動削除
  isCompleted(): boolean;
  autoDelete(): void;
}
```

### ProductionProgress インターフェース
```typescript
interface ProductionProgress {
  itemName: string;
  completedQuantity: number;    // 現在生産数
  totalQuantity: number;        // 合計数
  currentItemProgress: number;  // 現在アイテムの進捗（0-1）
  remainingTime: number;        // 全体の残り時間（秒）
  displayText: string;          // "忍者刀 5/20"
}
```

### ProductionManagerクラス（完了処理部分）
```typescript
class ProductionManager {
  // 完了チェックと自動削除
  private checkCompletion(baseId: string, line: ProductionLine): void;
  
  // キューの自動削除
  private autoDeleteCompleted(baseId: string, lineIndex: number): void;
  
  // UI用の進捗データ取得
  getProgressData(baseId: string): ProductionProgress[];
}
```

## 進捗表示の実装

### 1. 表示フォーマット
```typescript
// ProductionLine.getDisplayText()
getDisplayText(): string {
  if (this.itemType === null) {
    return "[空き]";
  }
  
  const itemName = this.getItemName();
  return `${itemName} ${this.completedQuantity}/${this.totalQuantity}`;
}

// 例: "忍者刀 5/20", "手裏剣 10/10"
```

### 2. 進捗バー計算
```typescript
// 現在作成中の1個の進捗
getCurrentItemProgress(): number {
  if (this.status !== ProductionStatus.PRODUCING) {
    return 0;
  }
  
  return this.elapsedTime / this.timePerItem;  // 0-1の値
}

// UI表示: 25%なら [====      ]
```

### 3. 残り時間計算
```typescript
// 全体の残り時間
getRemainingTime(): number {
  const remainingItems = this.totalQuantity - this.completedQuantity;
  const currentItemRemaining = this.timePerItem - this.elapsedTime;
  
  return currentItemRemaining + (remainingItems - 1) * this.timePerItem;
}

// フォーマット: "15:30" (MM:SS形式)
formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

## 完了処理の実装

### 1. 完了判定
```typescript
// ProductionLine内
isCompleted(): boolean {
  return this.completedQuantity >= this.totalQuantity;
}
```

### 2. 自動削除フロー
```typescript
// ProductionManager.update()内で呼び出し
checkCompletion(baseId: string, line: ProductionLine) {
  if (line.isCompleted()) {
    const lineIndex = this.getLineIndex(baseId, line);
    this.autoDeleteCompleted(baseId, lineIndex);
  }
}

autoDeleteCompleted(baseId: string, lineIndex: number) {
  const lines = this.queues.get(baseId);
  if (lines && lines[lineIndex]) {
    // ラインをリセット
    lines[lineIndex].reset();  // IDLE状態に戻す
    
    // 完了通知（オプション）
    this.notifyCompletion(baseId, lineIndex);
  }
}
```

### 3. ラインのリセット
```typescript
// ProductionLine.reset()
reset() {
  this.itemType = null;
  this.totalQuantity = 0;
  this.completedQuantity = 0;
  this.elapsedTime = 0;
  this.status = ProductionStatus.IDLE;
}
```

## UIの更新フロー

### 毎フレーム更新
```typescript
// ProductionFactoryMenu.updateProgressDisplay()
updateProgressDisplay() {
  const progressData = this.productionManager.getProgressData(this.baseId);
  
  progressData.forEach((progress, index) => {
    this.updateLineDisplay(index, progress);
  });
}

// 個別ライン更新
updateLineDisplay(lineIndex: number, progress: ProductionProgress | null) {
  const lineUI = this.lineDisplays[lineIndex];
  
  if (!progress) {
    lineUI.showEmpty();  // "[空き]"表示
    return;
  }
  
  // テキスト更新: "忍者刀 5/20"
  lineUI.setText(progress.displayText);
  
  // 進捗バー更新
  lineUI.updateProgressBar(progress.currentItemProgress);
  
  // 残り時間更新
  lineUI.setRemainingTime(this.formatRemainingTime(progress.remainingTime));
}
```

## 完了時の表示遷移

### 表示の流れ
```
1. 生産中: "忍者刀 19/20" [========= ] 残り0:45
2. 最後の1個完成: "忍者刀 20/20" [==========] 残り0:00
3. 自動削除: "[空き]"
```

## 他システムとの連携

### UIManager
- update()でProductionFactoryMenu.updateProgressDisplay()を呼び出し
- UIが表示中の場合のみ更新

### ProductionManager
- getProgressData()で最新の進捗情報を取得
- 完了時の自動削除処理

## テスト方針

### 単体テスト
- 進捗計算の正確性
- 残り時間計算
- 完了判定ロジック
- 表示フォーマット

### 統合テスト
- リアルタイム更新の確認
- 完了時の自動削除
- 複数ライン同時完了

### UI表示テスト
- 進捗バーのアニメーション
- 数値表示の更新頻度
- 完了時の表示切り替え

## 未解決事項
- [ ] 完了時の通知方法（効果音、ポップアップ）
- [ ] 進捗バーのビジュアルデザイン
- [ ] 大量生産時（99個）の残り時間表示