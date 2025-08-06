# [task-10-4] キャンセル機能

## 概要
- エピック: #10
- タスク: #10-4
- 関連PR/要件: @docs/prd/requirements.md セクション6.3.3（生産フロー ステップ11）

## 設計方針

生産途中でもキューを削除できる機能を実装する。既に生産されたアイテムは倉庫に残ることを明確にユーザーに伝える。

### 実装範囲
- キャンセルボタン（×）のUI
- キャンセル確認ダイアログ
- 既生産分の保持処理
- キャンセル後のライン解放

### 重要な仕様
- 既に生産されたアイテムは倉庫に残る
- キャンセル時に既生産数をユーザーに通知
- 資金の返金はなし（既に消費済み）

## インターフェース定義

### ProductionFactoryMenuクラス（キャンセルUI部分）
```typescript
class ProductionFactoryMenu {
  // キャンセルボタンの設定
  private setupCancelButtons(): void;
  
  // キャンセル確認ダイアログ
  private showCancelConfirmation(lineIndex: number): void;
  
  // キャンセル実行
  private executeCancelProduction(lineIndex: number): void;
}
```

### CancelConfirmationDialogクラス
```typescript
class CancelConfirmationDialog extends Phaser.GameObjects.Container {
  constructor(config: {
    scene: Phaser.Scene;
    itemName: string;
    completedQuantity: number;
    totalQuantity: number;
    onConfirm: () => void;
    onCancel: () => void;
  });
  
  // ダイアログ表示
  show(): void;
  hide(): void;
  
  // メッセージ生成
  private createMessage(): string;
}
```

### ProductionManagerクラス（キャンセル処理部分）
```typescript
class ProductionManager {
  // キャンセル実行
  cancelProduction(baseId: string, lineIndex: number): CancelResult;
  
  // キャンセル可能かチェック
  canCancel(baseId: string, lineIndex: number): boolean;
}
```

### CancelResult インターフェース
```typescript
interface CancelResult {
  success: boolean;
  itemType?: ProductionItemType;
  completedQuantity: number;    // 既生産数
  totalQuantity: number;        // 元の指示数
  message: string;              // ユーザー向けメッセージ
}
```

## UIデザイン

### 1. キャンセルボタン
```
生産キューの各ライン右端に×ボタン配置:
"1. 忍者刀 5/20 [====  ] 残り15:00 [×]"
                                     ↑キャンセルボタン
```

### 2. 確認ダイアログ
```
+----------------------------------+
|     生産をキャンセルしますか？      |
|                                  |
| アイテム: 忍者刀                   |
| 進捗: 5/20                        |
|                                  |
| ⚠️ 既に生産された5個は              |
|    倉庫に残ります                  |
|                                  |
| [キャンセル実行]  [戻る]           |
+----------------------------------+
```

## キャンセル処理フロー

### 1. キャンセルボタンクリック
```typescript
// ProductionFactoryMenu内
onCancelButtonClick(lineIndex: number) {
  // 生産情報を取得
  const queue = this.productionManager.getQueue(this.baseId, lineIndex);
  
  if (!queue) {
    return;  // 空きライン
  }
  
  // 確認ダイアログ表示
  this.showCancelConfirmation(lineIndex);
}
```

### 2. 確認ダイアログ表示
```typescript
showCancelConfirmation(lineIndex: number) {
  const queue = this.productionManager.getQueue(this.baseId, lineIndex);
  
  const dialog = new CancelConfirmationDialog({
    scene: this.scene,
    itemName: queue.itemName,
    completedQuantity: queue.completedQuantity,
    totalQuantity: queue.totalQuantity,
    onConfirm: () => {
      this.executeCancelProduction(lineIndex);
      dialog.hide();
    },
    onCancel: () => {
      dialog.hide();
    }
  });
  
  dialog.show();
}
```

### 3. メッセージ生成
```typescript
// CancelConfirmationDialog.createMessage()
createMessage(): string {
  const base = `アイテム: ${this.itemName}\n` +
               `進捗: ${this.completedQuantity}/${this.totalQuantity}\n\n`;
  
  if (this.completedQuantity > 0) {
    return base + `⚠️ 既に生産された${this.completedQuantity}個は\n` +
                  `   倉庫に残ります`;
  } else {
    return base + `まだ生産が開始されていません`;
  }
}
```

### 4. キャンセル実行
```typescript
// ProductionManager.cancelProduction()
cancelProduction(baseId: string, lineIndex: number): CancelResult {
  const lines = this.queues.get(baseId);
  
  if (!lines || !lines[lineIndex]) {
    return {
      success: false,
      completedQuantity: 0,
      totalQuantity: 0,
      message: "無効なラインです"
    };
  }
  
  const line = lines[lineIndex];
  const result = {
    success: true,
    itemType: line.itemType,
    completedQuantity: line.completedQuantity,
    totalQuantity: line.totalQuantity,
    message: `生産をキャンセルしました`
  };
  
  // ラインをリセット（既生産分はすでに倉庫にある）
  line.reset();
  
  return result;
}
```

### 5. UI更新
```typescript
// キャンセル後のUI更新
executeCancelProduction(lineIndex: number) {
  const result = this.productionManager.cancelProduction(
    this.baseId, 
    lineIndex
  );
  
  if (result.success) {
    // メッセージ表示
    if (result.completedQuantity > 0) {
      this.showMessage(
        `${result.completedQuantity}個は倉庫に保管されています`
      );
    }
    
    // ライン表示を更新（"[空き]"に戻る）
    this.updateLineDisplay(lineIndex, null);
  }
}
```

## エラーハンドリング

### キャンセル不可のケース
- 空きライン（何も生産していない）
- 既に完了したライン（自動削除前の一瞬）

### エッジケース
- 最後の1個を生産中にキャンセル
- 資金不足で停止中のラインをキャンセル

## 他システムとの連携

### ProductionManager
- キャンセル処理の実行
- ラインのリセット

### InventoryManager
- 既生産分は既に格納済み（追加処理不要）

### UIManager
- ダイアログの表示制御
- メッセージ表示

## テスト方針

### 単体テスト
- キャンセル処理のロジック
- 既生産数の正確な取得
- ラインリセットの確認

### 統合テスト
- ダイアログ表示と操作
- キャンセル後のライン状態
- 既生産分の倉庫確認

### UIテスト
- ボタンの有効/無効状態
- ダイアログのメッセージ内容
- キャンセル後の表示更新

## 未解決事項
- [ ] キャンセル時の効果音
- [ ] 連続キャンセル時の処理
- [ ] キャンセル履歴の記録