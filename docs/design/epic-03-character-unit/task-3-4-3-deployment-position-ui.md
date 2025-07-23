# [task-3-4-3] 出撃位置選択UI

## 概要
- エピック: #3
- タスク: #3-4-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.5（軍団編成 - 出撃位置選択）
- 親タスク: #3-4（軍団編成UI）
- 前タスク: #3-4-2（アイテム選択UI）

## 設計方針

### 全体アプローチ
- アイテム選択完了後の最終確認画面
- 拠点周囲2マス以内から出撃位置を選択
- マップビューを表示して視覚的に位置選択
- 選択完了後、軍団を生成して配置

### 技術選定理由
- マップの部分表示：拠点周辺のみ表示してパフォーマンス向上
- グリッド表示：選択可能な位置を明確化
- プレビュー機能：配置前に軍団の位置を確認可能

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
  
  // 選択可能位置の表示
  showDeployablePositions(): void;
  highlightPosition(x: number, y: number): void;
  
  // 位置選択
  selectPosition(x: number, y: number): void;
  getSelectedPosition(): Position | null;
}

interface DeploymentPositionUIConfig {
  scene: Phaser.Scene;
  base: Base;
  mapManager: MapManager;
  armyManager: ArmyManager;
  itemEquippedFormationData: ItemEquippedFormationData;  // task-3-4-2から受け取る
  onDeploymentComplete?: (army: Army) => void;
  onBack?: () => void;  // アイテム選択画面に戻る
  onCancelled?: () => void;
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
- 他の軍団が存在しない
- 移動不可能な地形でない
- 敵軍団の視界内でない（オプション）

### 軍団生成処理
- ItemEquippedFormationDataから軍団を生成
- ArmyFactoryを使用して適切に配置
- BaseManagerから待機兵士を削除

## 実装の詳細

### レイアウト仕様
- 画面中央：拠点周辺のマップビュー
- 右側：編成内容の確認パネル
- 下部：操作ボタン

#### 詳細レイアウト
```
+-------------------------------------------------------------------------+
|                        軍団編成 - 出撃位置選択                          |
+-------------------------------------------------------------------------+
| マップビュー（拠点周辺）      | 編成確認                                |
|                               |-----------------------------------------|
|    □ □ □ □ □               | 指揮官: 風太郎                          |
|    □ ■ ■ □ □               |   装備: 忍者刀、兵糧丸                  |
|    □ ■ 拠 □ □               |                                         |
|    □ □ □ ○ □               | 一般兵:                                 |
|    □ □ □ □ □               |   鉄壁花子 - 手裏剣×2                  |
|                               |   影丸 - 忍者刀、手裏剣                 |
|                               |                                         |
| ■: 選択可能  ○: 選択中       | 軍団移動速度: 10.75                     |
| 拠: 拠点                      | 視界範囲: 平均8.25マス                  |
+-------------------------------------------------------------------------+
|  [戻る]                                              [出撃]             |
+-------------------------------------------------------------------------+
```

### マップビュー仕様
- 拠点を中心とした5×5マスを表示
- 選択可能位置：青いハイライト（■）
- 選択中の位置：黄色いハイライト（○）
- 拠点：特別なマーカー（拠）
- 既存軍団：赤いマーカー

### 編成確認パネル
- 指揮官と一般兵の名前
- 各メンバーの装備アイテム
- 軍団の平均移動速度
- 軍団の平均視界範囲

### インタラクション仕様
1. **位置選択**: 青いハイライトされたマスをクリック
2. **選択確認**: 選択したマスが黄色にハイライト
3. **出撃実行**: 「出撃」ボタンで軍団生成・配置
4. **キャンセル**: 「戻る」でアイテム選択画面へ

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
// 1. 位置の妥当性確認
if (!isValidDeploymentPosition(selectedPosition)) {
  showError("その位置には配置できません");
  return;
}

// 2. 軍団生成
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

// 5. 完了通知
onDeploymentComplete(army);
```

## 他システムとの連携
- **MapManager**: 地形情報の取得、配置可能判定
- **ArmyManager**: 既存軍団の位置確認、新規軍団の登録
- **BaseManager**: 待機兵士の削除
- **UIManager**: 全体のUI制御（task-7-5-3と連携）

## 未解決事項
- [ ] 敵の視界内への配置制限の実装
- [ ] 配置アニメーション（軍団が拠点から出現する演出）
- [ ] 最大同時軍団数（6軍団）の制限チェック
- [ ] 配置後の自動的な初期行動（待機 or 移動）
- [ ] マップビューのカメラ制御とスクロール