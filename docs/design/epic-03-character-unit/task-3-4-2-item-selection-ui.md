# [task-3-4-2] アイテム選択UI

## 概要
- エピック: #3
- タスク: #3-4-2
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.5（軍団編成）、セクション2.3（アイテムシステム）
- 親タスク: #3-4（軍団編成UI）
- 前タスク: #3-4-1（兵士選択UI）

## 設計方針

### 全体アプローチ
- 兵士選択完了後のアイテム割り当て画面
- 倉庫のアイテムを各兵士に配布（最大4個/人）
- 装備の自動/手動設定機能
- 全画面モーダルUIの継続使用

### 技術選定理由
- Phaser3のContainerシステム：既存UIとの統一性
- ドラッグ&ドロップまたはクリック操作：直感的なアイテム配布
- 自動装備機能：初心者にも使いやすい設計

## インターフェース定義

### ItemSelectionUIクラス
```typescript
class ItemSelectionUI extends Phaser.GameObjects.Container {
  constructor(config: ItemSelectionUIConfig);
  
  // 表示/非表示
  show(): void;
  hide(): void;
  
  // アイテムと兵士データの設定
  setFormationData(data: FormationData): void;
  updateInventory(items: IItem[]): void;
  
  // アイテム割り当て
  assignItem(soldierIndex: number, item: IItem): void;
  removeItem(soldierIndex: number, itemIndex: number): void;
  
  // 自動装備
  autoEquip(): void;
}

interface ItemSelectionUIConfig {
  scene: Phaser.Scene;
  base: Base;
  formationData: FormationData;  // task-3-4-1から受け取る
  onProceedToDeployment?: (data: ItemEquippedFormationData) => void;
  onBack?: () => void;  // 兵士選択画面に戻る
  onCancelled?: () => void;
}
```

### ItemEquippedFormationData型
```typescript
interface ItemEquippedFormationData {
  commander: Character;
  soldiers: Character[];
  items: Map<Character, IItem[]>;  // 各キャラクターの所持アイテム
}
```

## データ構造の概要

### 倉庫アイテムの管理
- BaseManagerから倉庫アイテムリストを取得
- アイテムの種類：武器（忍者刀、手裏剣）、消耗品（兵糧丸）
- 在庫数の管理と表示

### アイテム割り当ての制約
- 各兵士最大4アイテムまで
- 武器は自動的に攻撃力の高いものが装備される
- 同じアイテムの複数所持可能

## 実装の詳細

### レイアウト仕様
- 全画面モーダルUI（兵士選択画面と同じ）
- 左側：選択された兵士リスト（指揮官＋一般兵）
- 右側：倉庫アイテム一覧
- 下部：操作ボタン

#### 詳細レイアウト
```
+-------------------------------------------------------------------------+
|                        軍団編成 - アイテム選択                          |
+-------------------------------------------------------------------------+
| 選択した兵士             |  倉庫アイテム                                |
|--------------------------|---------------------------------------------|
| [指] 風太郎              | 忍者刀 x12    手裏剣 x25    兵糧丸 x30   |
|  □ □ □ □               |                                             |
|                          | [忍者刀]      [手裏剣]       [兵糧丸]     |
| [兵] 鉄壁花子            | 攻撃力+15     攻撃力+5       HP全快       |
|  □ □ □ □               | 射程:1-3      射程:2-6       使用回数:1   |
|                          |                                             |
| [兵] 影丸                |                                             |
|  □ □ □ □               |                                             |
|                          |                                             |
+-------------------------------------------------------------------------+
|  [戻る]        [自動装備]                    [出撃位置選択]             |
+-------------------------------------------------------------------------+
```

### 兵士表示仕様
- 各兵士の名前と役割マーク（指/兵）を表示
- 4つのアイテムスロット（□で表示）
- 割り当て済みアイテムはアイコンで表示

### アイテム表示仕様
- アイテム名と在庫数
- アイテムの詳細情報（攻撃力、射程、効果など）
- 在庫0のアイテムはグレーアウト

### インタラクション仕様
- **アイテム割り当て**: 倉庫アイテムをクリック→兵士を選択
- **アイテム解除**: 兵士のアイテムスロットを右クリック
- **自動装備**: ボタンクリックで最適な装備を自動配置

## 画面遷移フロー

### 全体フロー
```
[兵士選択画面] ← task-3-4-1
  ↓
[アイテム選択画面] ← 本タスクの設計範囲
  ↓
[出撃位置選択] ← task-3-4-3
```

### アイテム選択画面の役割
1. 選択された兵士にアイテムを配布
2. 武器の自動装備機能を提供
3. 完了後、ItemEquippedFormationDataを生成して次画面へ

## 次タスクへの受け渡し事項
- **task-3-4-3へ**: ItemEquippedFormationData（兵士とアイテムの情報）
- **コールバック**: onProceedToDeployment(data: ItemEquippedFormationData)

## 未解決事項
- [ ] ドラッグ&ドロップ実装の詳細（Phaser3での実装方法）
- [ ] アイテムアイコンの表示方法（スプライトシート）
- [ ] 在庫管理の更新タイミング（即座に反映 or 出撃確定時）
- [ ] 自動装備のアルゴリズム詳細
- [ ] アイテムが1つもない場合の処理