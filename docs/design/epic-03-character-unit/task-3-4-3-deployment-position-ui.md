# [task-3-4-3] 出撃位置選択UI

## 概要
- エピック: #3
- タスク: #3-4-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.5（軍団編成 - 出撃位置選択）
- 親タスク: #3-4（軍団編成UI）
- 前タスク: #3-4-2（アイテム選択UI）

## 設計方針

### 全体アプローチ
- アイテム選択完了後の出撃位置選択画面
- 拠点周囲2マス以内から出撃位置を選択
- シンプルなマップビューで視覚的に位置選択
- 選択完了後、即座に軍団を生成して配置（確認ステップなし）
- **画面遷移時に1秒の待機時間を設けて誤クリックを防止**

### 技術選定理由
- 固定位置UI：カメラに依存しない安定した表示
- 赤色ハイライト：選択可能位置を明確に表示
- 即座配置：操作の簡略化とレスポンス向上
- 遷移時待機：アイテム選択のクリックイベントが配置に影響しないよう保護

## インターフェース定義

### DeploymentPositionUIクラス
```typescript
class DeploymentPositionUI extends Phaser.GameObjects.Container {
  constructor(config: DeploymentPositionUIConfig);
  
  // 表示/非表示
  show(): void;
  hide(): void;
  
  // データ設定
  setItemEquippedFormationData(data: ItemEquippedFormationData): void;
  
  // 選択可能位置の表示（自動的に赤色ハイライト）
  showDeployablePositions(): void;
  
  // クリーンアップ
  destroy(): void;
}

interface DeploymentPositionUIConfig {
  scene: Phaser.Scene;
  base: Base;
  mapManager: MapManager;
  armyManager: ArmyManager;
  itemEquippedFormationData: ItemEquippedFormationData;  // task-3-4-2から受け取る
  onDeploymentComplete?: (army: Army) => void;
  onBack?: () => void;  // ItemSelectionUIに戻る
}
```

### Position型
```typescript
interface Position {
  x: number;  // タイルX座標
  y: number;  // タイルY座標
}
```

## データ構造の概要

### 選択可能位置の判定
- 拠点の中心から2マス以内（マンハッタン距離）
- 重複配置可能（他の軍団の存在を考慮しない）
- 移動可能な地形である

### 軍団生成処理
- ItemEquippedFormationDataから軍団を生成
- ArmyFactoryを使用して即座に配置
- BaseManagerから待機兵士を削除

## 実装の詳細

### レイアウト仕様
- 固定位置UI（画面中央に配置）
- シンプルなメッセージとマップビューのみ

#### 詳細レイアウト
```
+-------------------------------------------------------------------------+
|                        出撃位置を選択してください                        |
+-------------------------------------------------------------------------+
|                                                                         |
|                          □ □ □ □ □                                    |
|                          □ ■ ■ ■ □                                    |
|                          □ ■ 拠 ■ □                                    |
|                          □ ■ ■ ■ □                                    |
|                          □ □ □ □ □                                    |
|                                                                         |
|                    ■: 選択可能（赤色ハイライト）                       |
|                    拠: 拠点                                             |
|                    □: 選択不可                                         |
|                                                                         |
|                    右クリック: キャンセル                               |
+-------------------------------------------------------------------------+
```

### マップビュー仕様
- 拠点を中心とした5×5マスを表示
- 選択可能位置：赤色ハイライト（■）のみクリック可能
- 拠点：特別なマーカー（拠）で表示
- その他のタイル：グレーアウト表示

### インタラクション仕様
1. **画面遷移**: ItemSelectionUIから遷移後、1秒間の入力無効化（誤クリック防止）
2. **位置選択**: 赤色ハイライトされたマスを左クリック
3. **即座配置**: クリックと同時に軍団生成・配置（確認なし）
4. **キャンセル**: 右クリックでItemSelectionUIに戻る
5. **完了後**: 軍団編成UIを閉じてマップ表示に戻る

## 画面遷移フロー

### 全体フロー
```
[アイテム選択画面] ← task-3-4-2
  ↓
[出撃位置選択] ← 本タスクの設計範囲
  ↓
軍団生成・マップ配置
  ↓
ゲーム画面に戻る
```

### 出撃位置選択画面の役割
1. 拠点周囲の選択可能位置を表示
2. プレイヤーが出撃位置を選択
3. 軍団を生成してマップに配置
4. 軍団編成UIを閉じてゲーム画面へ

## 処理フロー

### 軍団生成の詳細
```typescript
// 1. 位置の妥当性確認（シンプル化）
if (!isWithinDeploymentRange(selectedPosition, base)) {
  // 赤色ハイライトされた位置のみクリック可能なので、この状況は起きない
  return;
}

// 2. 即座に軍団生成
const army = ArmyFactory.createArmy(
  scene,
  itemEquippedFormationData,
  selectedPosition
);

// 3. ArmyManagerに登録
armyManager.addArmy(army);

// 4. BaseManagerから待機兵士を削除
const allMembers = [
  itemEquippedFormationData.commander,
  ...itemEquippedFormationData.soldiers
];
baseManager.removeWaitingSoldiers(base.getId(), allMembers);

// 5. 完了通知と画面クローズ
onDeploymentComplete(army);
```

### 右クリックキャンセル処理
```typescript
// 右クリックイベントハンドラ
scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (pointer.rightButtonDown()) {
    onBack(); // ItemSelectionUIに戻る
  }
});
```

### 画面遷移時の待機処理
```typescript
// ItemSelectionUIから遷移時の処理
show(): void {
  this.setVisible(true);
  
  // 1秒間の入力無効化（誤クリック防止）
  this.scene.input.enabled = false;
  
  this.scene.time.delayedCall(1000, () => {
    this.scene.input.enabled = true;
    this.showDeployablePositions(); // 選択可能位置を表示
  });
}
```

## 他システムとの連携
- **MapManager**: 地形情報の取得
- **ArmyManager**: 新規軍団の登録
- **BaseManager**: 待機兵士の削除
- **UIManager**: 全体のUI制御（task-7-5-3と連携）
- **ItemSelectionUI**: onBackコールバックで遷移

## UI実装の重要ポイント

### 固定位置UIの実装（CLAUDE.md準拠）
```typescript
// カメラのズーム値を考慮
const zoom = this.scene.cameras.main.zoom || 2.25;
const viewWidth = 1280 / zoom;
const viewHeight = 720 / zoom;

// 画面中央に配置
const viewLeft = cam.worldView.x;
const viewTop = cam.worldView.y;
const centerX = viewLeft + viewWidth / 2;
const centerY = viewTop + viewHeight / 2;

// UIManagerのupdateで位置更新
public update(): void {
  if (this.deploymentPositionUI && this.deploymentPositionUI.visible) {
    // カメラ移動に追従
    const cam = this.scene.cameras.main;
    const centerX = cam.worldView.x + viewWidth / 2;
    const centerY = cam.worldView.y + viewHeight / 2;
    this.deploymentPositionUI.setPosition(centerX, centerY);
  }
}
```

## テスト方針
- 選択可能範囲（2マス）の正確な計算
- 赤色ハイライトのクリック判定
- 右クリックキャンセルの動作
- 軍団生成と配置の確認
- UI遷移（ItemSelectionUI ⇔ DeploymentPositionUI）

## 簡略化された仕様
- ❌ 敵の視界内への配置制限
- ❌ 配置アニメーション
- ❌ 最大同時軍団数チェック（別タスクで実装）
- ❌ 配置後の初期行動選択
- ❌ マップビューのスクロール
- ✅ シンプルな固定UI
- ✅ 即座配置
- ✅ 右クリックキャンセル