# [task-7-4-4-1] 駐留軍団管理UI

## 概要
- エピック: #7 拠点管理システム
- タスク: #7-4-4-1
- 関連PR/要件: 駐留軍団の管理UI、アイテム装備変更、出撃位置選択

## 設計方針

### 基本方針
- ArmyFormationUIと同じレイアウトパターンを踏襲し、UIの一貫性を保つ
- 1画面に1軍団の詳細を表示し、複数軍団がある場合はページネーション対応
- 駐留中でもアイテム装備の変更を可能にし、拠点での補給を実現
- 耐久度が低下した武器は破棄処理により、耐久度悪用を防止

### アーキテクチャの選択
- **UIパターン**: 既存のArmyFormationUIのレイアウトを完全踏襲
- **モーダル表示**: 画面の90%サイズで全画面モーダル表示
- **データフロー**: 駐留軍団選択 → アイテム装備 → 出撃位置選択の3段階

## インターフェース定義

### GarrisonedArmiesPanel クラス
```typescript
interface GarrisonedArmiesPanelConfig {
  scene: Phaser.Scene;
  base: Base;
  armies: Army[];
  onProceedToItemSelection?: (army: Army) => void;
  onCancel?: () => void;
}

class GarrisonedArmiesPanel extends Phaser.GameObjects.Container {
  // メンバー表示（テーブル形式）
  private createMemberTable(): void;
  private displayCurrentArmy(): void;
  
  // ページネーション
  private currentArmyIndex: number;
  private createPaginationControls(): void;
  private navigateToNextArmy(): void;
  private navigateToPreviousArmy(): void;
}
```

### ItemSelectionUI の拡張
```typescript
// 耐久度判定機能の追加
private createItemSlot(): {
  // 耐久度100%未満の武器は[破棄]ボタンに変更
  const removeButtonText = weapon.durability < weapon.maxDurability ? '[破棄]' : '[×]';
}

private removeItem(): {
  // 破棄された武器は倉庫に戻さない
  if (weapon.durability === weapon.maxDurability) {
    this.availableItems.push(removedItem);
  }
  // 耐久度が低下した武器は破棄（何もしない）
}
```

### UIManager の統合
```typescript
class UIManager {
  // BaseManager追加によるコンストラクタ変更
  constructor(scene: Phaser.Scene, productionManager: ProductionManager, baseManager: any);
  
  // 駐留軍団管理UI表示
  showGarrisonedArmiesPanel(base: Base): void;
  hideGarrisonedArmiesPanel(): void;
}
```

## UI仕様

### レイアウト
- **サイズ**: ビューポートの90%（幅・高さとも）
- **背景**: 半透明の黒背景で全画面を覆う
- **パネル**: 中央配置の灰色背景（#222222、透明度95%）

### 表示内容
1. **ヘッダー部**
   - タイトル: 「駐留軍団管理 - [拠点名]」
   - 軍団名表示
   - ページ番号（例: 軍団 1/3）

2. **メンバーテーブル**
   - 列: 名前、職業、HP、攻撃、防御、速さ、移動、視界、役職
   - 指揮官は赤枠で強調表示
   - 偶数行に背景色を設定（視認性向上）

3. **操作ボタン**
   - 「アイテム装備へ」: 選択中の軍団のアイテム装備画面へ遷移
   - 「キャンセル」: 駐留軍団管理を終了

4. **ページネーション**（複数軍団がある場合）
   - 「< 前へ」「次へ >」ボタン
   - 循環ナビゲーション対応

## フロー

### 操作フロー
1. **兵舎から駐留軍団管理を選択**
   - BarracksSubMenuから「駐留軍団管理」を選択
   - BaseManager.getStationedArmies()で駐留軍団を取得

2. **駐留軍団の表示**
   - 駐留軍団がない場合は「駐留軍団がありません」と表示
   - ある場合はGarrisonedArmiesPanelを表示

3. **アイテム装備変更**
   - 「アイテム装備へ」ボタンでItemSelectionUIへ遷移
   - 耐久度判定により破棄/返却を自動処理

4. **出撃位置選択**
   - ItemSelectionUIから自動的にDeploymentPositionUIへ遷移
   - 拠点周囲の4方向から出撃位置を選択

5. **出撃実行**
   - 軍団が選択位置に配置される
   - 駐留状態が解除される

## テスト方針

### 統合テストの観点
1. 駐留軍団が正しく表示されること
2. ページネーションが正常に動作すること
3. アイテム装備画面への遷移が正常であること
4. 耐久度100%未満の武器が破棄されること
5. 出撃後に駐留状態が解除されること

## 実装上の注意点
- UIManagerのコンストラクタ変更により、既存テストの修正が必要
- 二重遷移バグ対策：ItemSelectionUIが自動的に次画面へ遷移するため、追加処理不要
- カメラのズーム値（2.25）を考慮した位置計算が必要

## 未解決事項
- [ ] 駐留中の軍団の最大数制限（現在は無制限）
- [ ] 駐留軍団の一括出撃機能
- [ ] 駐留中の軍団への治療機能連携（医療施設との連携）