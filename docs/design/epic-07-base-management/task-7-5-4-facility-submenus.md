# [task-7-5-4] 施設サブメニュー実装

## 概要
- エピック: #7
- タスク: #7-5-4
- 関連PR/要件: @docs/prd/requirements.md セクション5.3.3（拠点オブジェクト）、6.1.3（拠点内施設）

## 設計方針

### 統一的なサブメニュー設計
- 既存のBarracksSubMenuパターンに従った実装
- 各施設（生産工場、医療施設、倉庫）ごとに専用のサブメニュー
- BaseActionMenuからの階層的な遷移
- 固定位置UIとして画面左側に配置

### 責務の明確化
- サブメニューは施設の操作選択のみを担当
- 実際の施設機能は別のUIコンポーネントで実装
- メニュー階層の管理はUIManagerが担当

## インターフェース定義

### ProductionFactorySubMenuクラス
```typescript
class ProductionFactorySubMenu extends Phaser.GameObjects.Container {
  constructor(config: ProductionFactorySubMenuConfig);
  
  // 表示制御
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  updateFixedPosition(): void;
}

interface ProductionFactorySubMenuConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  onManageProduction?: () => void;    // 生産管理画面へ
  onViewQueue?: () => void;           // 生産状況確認
  onUpgradeFactory?: () => void;      // 工場アップグレード（将来実装）
  onCancel?: () => void;
}
```

### HospitalSubMenuクラス
```typescript
class HospitalSubMenu extends Phaser.GameObjects.Container {
  constructor(config: HospitalSubMenuConfig);
  
  // 表示制御（共通）
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  updateFixedPosition(): void;
}

interface HospitalSubMenuConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  onTreatArmy?: () => void;          // 軍団治療開始
  onViewTreatment?: () => void;      // 治療状況確認
  onEmergencyTreat?: () => void;     // 緊急治療（将来実装）
  onCancel?: () => void;
}
```

### WarehouseSubMenuクラス
```typescript
class WarehouseSubMenu extends Phaser.GameObjects.Container {
  constructor(config: WarehouseSubMenuConfig);
  
  // 表示制御（共通）
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  updateFixedPosition(): void;
}

interface WarehouseSubMenuConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  onViewInventory?: () => void;      // 在庫確認
  onManageItems?: () => void;        // アイテム管理
  onTransferItems?: () => void;     // アイテム移送（将来実装）
  onCancel?: () => void;
}
```

## メニュー構成

### 生産工場サブメニュー
1. **生産管理** - ProductionFactoryMenuを開く
2. **生産状況** - 簡易的な生産ライン確認
3. **工場強化** - 将来実装（グレーアウト表示）

### 医療施設サブメニュー
1. **軍団治療** - 駐留軍団の治療開始UI
2. **治療状況** - 現在治療中の軍団確認
3. **緊急治療** - 将来実装（即時回復、高額）

### 倉庫サブメニュー
1. **在庫確認** - 倉庫内アイテムリスト表示
2. **アイテム管理** - アイテムの整理・破棄
3. **アイテム移送** - 将来実装（拠点間移送）

## UIフロー

### 基本的な遷移フロー
1. 拠点選択 → BaseInfoPanel表示
2. BaseActionMenuから施設選択
3. 各施設のサブメニュー表示
4. サブメニューから具体的な操作選択
5. 専用UIの表示または処理実行

### キャンセル操作
- 右クリックまたはメニュー外クリックで前の画面へ
- ESCキー対応（将来実装）
- 階層を遡る際の一貫した動作

## 表示仕様

### 共通仕様
- 背景：半透明の黒（0x000000, alpha: 0.8）
- ボタン：200x40ピクセル
- フォント：Arial 16px 白色
- ボタン間隔：10ピクセル
- ホバー時：明度を上げる（tint: 0xcccccc）

### 配置
- BaseActionMenuと同じX座標
- Y座標は画面中央付近
- カメラスクロールに追従（updateFixedPosition）

### 無効状態の表示
- 将来実装機能はグレーアウト（alpha: 0.5）
- インタラクション無効化
- ツールチップで「今後実装予定」表示

## 他システムとの連携

### UIManager
- showProductionFactorySubMenu()
- showHospitalSubMenu()
- showWarehouseSubMenu()
- 各サブメニューの表示制御と階層管理

### BaseActionMenu
- factoryButtonクリック → ProductionFactorySubMenu
- hospitalButtonクリック → HospitalSubMenu
- warehouseButtonクリック → WarehouseSubMenu

### 各施設の専用UI
- ProductionFactoryMenu（task-10-4）
- HospitalTreatmentUI（将来実装）
- WarehouseInventoryUI（将来実装）

## 実装の優先順位

### Phase 1（必須）
- ProductionFactorySubMenuの実装
- 「生産管理」ボタンからProductionFactoryMenuへの遷移

### Phase 2（推奨）
- WarehouseSubMenuの実装
- 簡易的な在庫確認機能

### Phase 3（オプション）
- HospitalSubMenuの実装
- 治療機能の基本実装

## テスト方針

### 単体テスト
- 各サブメニューの表示/非表示
- ボタンクリックのコールバック実行
- カメラ追従の動作確認

### 統合テスト
- BaseActionMenuからの遷移
- サブメニューから専用UIへの遷移
- キャンセル操作での階層遡り

### ユーザビリティテスト
- メニュー階層の分かりやすさ
- 操作の一貫性
- レスポンスの速さ

## 未解決事項
- [ ] アニメーション効果の追加（フェードイン/アウト）
- [ ] キーボードショートカットの設計
- [ ] 施設レベルによるメニュー項目の変化
- [ ] 施設が破壊された場合の表示制御
- [ ] 複数拠点選択時の施設メニュー切り替え