# [タスク12-4] 軍団UIシステム

## 概要
- エピック: #12
- タスク: #12-4
- 関連PR/要件: 軍団選択時の情報表示と操作（PRD 5.3.1）

## 設計方針

### 軍団UI の統合設計
軍団選択時の情報表示から操作実行まで、軍団に特化したUI体験を提供する。
- 軍団構成員の詳細表示
- リアルタイムHP/状態更新
- コンテキストに応じた操作メニュー
- 視覚的な状態表現

### 表示要素の優先順位
1. **重要情報**: 総HP、戦闘/移動状態
2. **構成情報**: 指揮官、メンバー、装備
3. **詳細情報**: 個別ステータス、スキル

## インターフェース定義

### ArmyUIController
軍団UI全体を管理するコントローラ
```typescript
interface ArmyUIController {
  // 表示管理
  showArmyInfo(army: Army): void;
  updateArmyInfo(army: Army): void;
  hideArmyInfo(): void;
  
  // 操作メニュー
  showActionMenu(army: Army): void;
  getAvailableActions(army: Army): ArmyAction[];
  
  // 状態表示
  updateStatus(status: ArmyStatus): void;
}
```

### 軍団情報表示
```typescript
interface ArmyInfoDisplay {
  // ヘッダー情報
  name: string;
  totalHP: { current: number; max: number };
  status: 'idle' | 'moving' | 'combat' | 'stationed';
  
  // メンバー情報
  commander: MemberInfo;
  members: MemberInfo[];
  
  // 装備情報
  equipment: EquipmentSummary;
}

interface MemberInfo {
  id: string;
  name: string;
  class: CharacterClass;
  hp: { current: number; max: number };
  equipment: Item[];
}
```

### 軍団操作メニュー
```typescript
interface ArmyActionMenu {
  // 基本操作
  move: {
    normal: boolean;  // 通常移動
    combat: boolean;  // 戦闘移動
  };
  wait: boolean;      // 待機
  
  // 条件付き操作
  useItem: boolean;   // アイテム使用（所持時）
  garrison: boolean;  // 駐留（拠点隣接時）
  
  // 操作実行
  executeAction(action: ArmyAction): void;
}

enum ArmyAction {
  MOVE_NORMAL,
  MOVE_COMBAT,
  WAIT,
  USE_ITEM,
  GARRISON
}
```

### 視覚的フィードバック
```typescript
interface ArmyVisualFeedback {
  // 選択表示
  showSelection(army: Army): void;
  hideSelection(): void;
  
  // 状態エフェクト
  showMovingEffect(): void;
  showCombatEffect(): void;
  showLowHPWarning(): void;
  
  // アニメーション
  animateHPChange(oldHP: number, newHP: number): void;
}
```

## UI レイアウト仕様

### 軍団情報パネル
```
+------------------------+
| [軍団名]     HP: 48/60 |
| 状態: 移動中           |
+------------------------+
| 指揮官: 咲耶          |
| HP: 18/20 [=====---]  |
| 装備: 忍者刀(耐久80)   |
+------------------------+
| メンバー1: 風忍A      |
| HP: 10/15 [===-----]  |
| 装備: 手裏剣(耐久60)   |
+------------------------+
| メンバー2: 鉄忍B      |
| HP: 15/15 [========]  |
| 装備: 忍者刀(耐久90)   |
+------------------------+
| メンバー3: 影忍C      |
| HP: 5/10  [==------]  |
| 装備: なし            |
+------------------------+
```

### 操作メニュー
```
+------------------------+
| ▶ 移動                |
|   ・通常移動          |
|   ・戦闘移動          |
| ▶ 待機                |
| ▶ アイテム使用        |
| ▶ 駐留（拠点隣接時）   |
+------------------------+
```

## テスト方針

### 統合テスト観点
1. **情報表示**
   - 軍団選択時に正しい情報が表示されるか
   - HP変化がリアルタイムに反映されるか
   - 状態変化が適切に表示されるか

2. **操作メニュー**
   - コンテキストに応じた操作が表示されるか
   - 拠点隣接時のみ「駐留」が表示されるか
   - アイテム未所持時に「アイテム使用」が非表示か

3. **視覚的フィードバック**
   - 選択時のハイライト表示
   - 低HP時の警告表示
   - 状態変化時のアニメーション

## 未解決事項
- [ ] 複数軍団選択時のUI表示方法
- [ ] 軍団間のアイテム受け渡しUI
- [ ] 戦闘中の詳細情報表示