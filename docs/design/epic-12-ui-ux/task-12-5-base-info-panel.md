# [タスク12-5] BaseInfoPanel - 拠点情報表示パネル

## 概要
- エピック: #12
- タスク: #12-5
- 関連PR/要件: PRD 5.3.3 拠点オブジェクト

## 設計方針

### 基本方針
- 拠点をクリックした際に、その拠点の情報を表示するパネルを実装
- ArmyInfoPanelと同様の操作性・表示位置を採用
- 全拠点タイプ（味方・中立・敵）で統一されたフォーマットで表示

### 既存システムとの整合性
- UIManagerを通じた表示制御
- ArmyInfoPanelと排他的に表示（同時に表示されない）
- 既存の固定位置UI表示方式を踏襲

## インターフェース定義

### BaseInfoPanelクラス

```typescript
interface BaseInfoPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
}

class BaseInfoPanel {
  constructor(config: BaseInfoPanelConfig);
  
  // 拠点情報の表示
  show(base: Base): void;
  
  // パネルを隠す
  hide(): void;
  
  // パネルの破棄
  destroy(): void;
  
  // 表示状態の取得
  isVisible(): boolean;
}
```

### UIManagerとの連携

```typescript
// UIManagerに追加するメソッド
showBaseInfoPanel(base: Base): void;
hideBaseInfoPanel(): void;
```

### イベント連携
- 拠点クリック時: `BaseClickEvent` → UIManager → BaseInfoPanel表示
- パネル外クリック時: BaseInfoPanelを非表示
- 右クリック時: BaseInfoPanelを非表示

## データ構造

### 表示データ構造

```typescript
interface BaseDisplayInfo {
  name: string;           // 拠点名
  faction: string;        // 所属（味方拠点/中立拠点/敵拠点）
  currentHP: number;      // 現在HP
  maxHP: number;          // 最大HP
  defense: number;        // 防御力
  income: number;         // 収入（両/分）
}
```

## 表示レイアウト

```
┌─────────────────────┐
│  [拠点名]           │
├─────────────────────┤
│ 所属: [faction]     │
│ HP: [currentHP/maxHP]│
│ 防御力: [defense]   │
│ 収入: [income]両/分 │
└─────────────────────┘
```

## テスト方針

### 統合テストのポイント
1. 拠点クリック時の表示確認
2. 各拠点タイプでの表示内容確認
3. ArmyInfoPanelとの排他制御
4. パネルの表示/非表示制御
5. 破棄処理の確認

## 未解決事項
- [ ] 拠点の防御力の値をどこから取得するか（Base実装時に決定）
- [ ] 味方拠点選択時の施設アクセス機能は別タスクで実装