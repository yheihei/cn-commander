# [タスク7-5] 拠点UI実装

## 概要
- エピック: #7
- タスク: #7-5-1, #7-5-2
- 関連PR/要件: PRD 5.3.3 拠点オブジェクト、5.5 拠点内施設UI

## 設計方針

### UIアーキテクチャ
- 既存のUIパターン（ActionMenu、MovementModeMenu）に従い、階層的なメニュー構造を実装
- BaseInfoPanelは情報表示専用、BaseActionMenuとサブメニューで操作を実現
- 固定位置UIとして実装し、カメラのスクロールに追従

### 責務の分離
- BaseInfoPanel: 拠点情報の表示のみ
- BaseActionMenu: 味方拠点での施設選択
- BarracksSubMenu等: 各施設の具体的な操作

### 段階的実装
- Phase 1: BaseActionMenuとBarracksSubMenuの実装
- Phase 2: 他の施設サブメニューの追加（生産工場、医療施設、倉庫）
- Phase 3: 各施設の実機能実装（軍団編成画面等）

## インターフェース定義

### BaseActionMenu
```typescript
interface BaseActionMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  onBarracks?: () => void;
  onFactory?: () => void;
  onHospital?: () => void;
  onWarehouse?: () => void;
  onCancel?: () => void;
}
```

### BarracksSubMenu
```typescript
interface BarracksSubMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  onFormArmy?: () => void;
  onManageGarrison?: () => void;
  onViewSoldiers?: () => void;
  onCancel?: () => void;
}
```

### UIManager拡張
- showBaseInfo(): BaseInfoPanel表示と味方拠点時のBaseActionMenu表示
- showBaseActionMenu(): 拠点用ActionMenuの表示
- showBarracksSubMenu(): 兵舎サブメニューの表示
- hideBaseInfo(): 全ての拠点関連UIを非表示

## 操作フロー
1. 拠点クリック（MovementInputHandler）
2. 拠点情報表示（BaseInfoPanel）
3. 味方拠点の場合、施設選択メニュー表示（BaseActionMenu）
4. 施設選択でサブメニュー表示（BarracksSubMenu等）
5. 具体的な操作実行またはキャンセル

## テスト方針

### 統合テスト
- 拠点選択時のUI表示フロー
- 味方/敵/中立拠点での表示差異
- メニュー階層の遷移
- キャンセル操作での前画面復帰

### 主要テストケース
1. 味方拠点選択でBaseActionMenuが表示される
2. 敵・中立拠点選択では情報表示のみ
3. 兵舎選択でサブメニューが表示される
4. キャンセルで適切な画面に戻る

## 未解決事項
- [ ] 他施設のサブメニュー実装（生産工場、医療施設、倉庫）
- [ ] 軍団編成画面の実装（task-3-4と連携）
- [ ] 拠点選択時のアニメーション追加
- [ ] アクセシビリティ対応（キーボード操作）