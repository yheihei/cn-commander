# [タスク12-5] 拠点UIシステム

## 概要
- エピック: #12
- タスク: #12-5
- 関連PR/要件: 拠点選択時の情報表示と施設UI（PRD 5.3.3, 5.5, 6.1.3）

## 設計方針

### 拠点UIの統合設計
拠点選択時の情報表示から施設利用まで、一貫したUI体験を提供する。
- 拠点選択時の基本情報表示
- 施設一覧の表示とナビゲーション
- 各施設の専用UI
- 拠点状態のリアルタイム更新

### UI階層
1. **拠点情報レベル**: 拠点選択時の基本情報（HP、収入、施設一覧）
2. **施設選択レベル**: 利用可能な施設のメニュー表示
3. **施設内部レベル**: 各施設固有のUI（兵舎、生産工場、医療施設、倉庫）

## インターフェース定義

### FacilityUIManager
施設UIの統括管理
```typescript
interface FacilityUIManager {
  // 施設UI表示
  openFacility(facilityType: FacilityType, baseId: string): void;
  closeFacility(): void;
  
  // 施設取得
  getFacility(type: FacilityType): FacilityUI;
  
  // 更新
  updateFacilityData(baseId: string): void;
}

enum FacilityType {
  BARRACKS,      // 兵舎
  FACTORY,       // 生産工場
  MEDICAL,       // 医療施設
  WAREHOUSE      // 倉庫
}
```

### 施設UI基底インターフェース
```typescript
interface FacilityUI {
  // 基本操作
  open(baseData: BaseData): void;
  close(): void;
  refresh(): void;
  
  // UI構築
  createLayout(): void;
  updateContent(data: any): void;
  
  // イベント処理
  onObjectSelected(object: any): void;
  onActionSelected(action: string): void;
}
```

### 兵舎UI
```typescript
interface BarracksUI extends FacilityUI {
  // 表示コンテンツ
  showStandbyUnits(units: Unit[]): void;
  showStationedArmies(armies: Army[]): void;
  showFormingArmy(army: Partial<Army>): void;
  
  // 軍団編成
  startFormation(): void;
  addUnitToArmy(unit: Unit, position: number): void;
  removeUnitFromArmy(position: number): void;
  confirmFormation(): void;
  
  // 軍団管理
  disbandArmy(armyId: string): void;
  deployArmy(armyId: string, position: Position): void;
}
```

### 生産工場UI
```typescript
interface FactoryUI extends FacilityUI {
  // 生産管理
  showProductionQueue(queue: ProductionItem[]): void;
  showAvailableItems(items: ItemTemplate[]): void;
  
  // 生産操作
  addToQueue(itemId: string, quantity: number): void;
  removeFromQueue(queueIndex: number): void;
  
  // 進捗表示
  updateProgress(queueIndex: number, progress: number): void;
}

interface ProductionItem {
  itemId: string;
  quantity: number;
  progress: number;
  timeRemaining: number;
}
```

### 医療施設UI
```typescript
interface MedicalUI extends FacilityUI {
  // 治療管理
  showTreatableArmies(armies: Army[]): void;
  showTreatingArmy(army: Army, timeRemaining: number): void;
  
  // 治療操作
  startTreatment(armyId: string): void;
  cancelTreatment(): void;
  
  // コスト表示
  showTreatmentCost(cost: number): void;
}
```

### 倉庫UI
```typescript
interface WarehouseUI extends FacilityUI {
  // 在庫表示
  showInventory(items: InventoryItem[]): void;
  showItemDetails(item: Item): void;
  
  // アイテム配布
  distributeToArmy(itemId: string, armyId: string, quantity: number): void;
  
  // フィルタリング
  filterByType(itemType: ItemType): void;
  sortBy(criteria: 'name' | 'quantity' | 'type'): void;
}
```

## UI レイアウト仕様

### 共通レイアウト構造
```typescript
interface FacilityLayout {
  // ヘッダー
  header: {
    title: string;
    closeButton: boolean;
  };
  
  // メインエリア（3カラム）
  leftPanel: {
    width: 300;
    title: string;
  };
  
  centerPanel: {
    width: 400;
    title: string;
  };
  
  rightPanel: {
    width: 300;
    title: string;
  };
  
  // フッター（アクションボタン）
  footer: {
    height: 60;
    buttons: ButtonConfig[];
  };
}
```

### インタラクション定義
```typescript
interface FacilityInteraction {
  // オブジェクト選択
  onSelect(object: any): void;
  onDeselect(): void;
  
  // ドラッグ&ドロップ
  onDragStart(object: any): void;
  onDragEnd(target: any): void;
  
  // ボタンアクション
  onConfirm(): void;
  onCancel(): void;
}
```

## テスト方針

### 統合テスト観点
1. **施設切り替え**
   - 異なる施設間の切り替えが正しく動作するか
   - 前の施設の状態がクリアされるか

2. **兵舎機能**
   - 軍団編成フローが正しく動作するか
   - 兵士の重複編成が防げているか

3. **生産工場機能**
   - 生産キューが正しく管理されるか
   - 資金不足時の挙動が適切か

4. **医療施設機能**
   - 治療時間のカウントダウンが正確か
   - 治療中の軍団が他の操作から除外されるか

5. **倉庫機能**
   - アイテムの在庫数が正しく表示されるか
   - 配布後の在庫更新が適切か

## 未解決事項
- [ ] 施設UIのモーダル表示 vs 画面切り替え
- [ ] 複数施設の同時利用の可否
- [ ] 施設利用中の外部イベント（攻撃等）への対応