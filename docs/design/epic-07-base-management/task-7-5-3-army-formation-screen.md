# [task-7-5-3] 軍団編成画面実装

## 概要
- エピック: #7
- タスク: #7-5-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.5、5.5.1

## 設計方針

### 拠点システムとの統合
- 兵舎メニューから「軍団編成」を選択時に起動
- task-3-4で実装する`ArmyFormationUITabbed`を拠点コンテキストで利用
- 拠点の待機兵士リストと倉庫アイテムにアクセス
- 編成完了後は拠点周囲2マス以内に出撃

### UIフロー設計
1. 拠点選択 → BaseActionMenu表示 → 兵舎選択
2. BarracksSubMenu表示 → 軍団編成選択
3. ArmyFormationUITabbed表示（画面右側パネル）
4. 編成作業 → 出撃位置選択（デフォルト位置） → 軍団出撃
5. または、キャンセルで拠点情報表示に戻る

## インターフェース定義

### BarracksSubMenuの拡張
```typescript
class BarracksSubMenu {
  // 軍団編成ボタンのコールバック
  private onFormArmy(): void {
    this.uiManager.showArmyFormationUI(this.selectedBase);
  }
}
```

### BaseManagerの拡張
```typescript
interface BaseManager {
  // 待機兵士管理
  getWaitingSoldiers(baseId: string): Character[];
  addWaitingSoldier(baseId: string, soldier: Character): void;
  removeWaitingSoldiers(baseId: string, soldiersToRemove: Character[]): void;
  
  // 駐留軍団管理（将来実装）
  getStationedArmies(baseId: string): Army[];
  addStationedArmy(baseId: string, army: Army): void;
  removeStationedArmy(baseId: string, army: Army): void;
}
```

### ArmyManagerの拡張
```typescript
interface ArmyManager {
  // 拠点からの出撃
  createArmyFromBase(
    formationData: ArmyFormationData,
    base: Base
  ): Army;
  
  // 出撃位置の検証
  validateDeployPosition(
    position: { x: number; y: number },
    base: Base
  ): boolean;
  
  // 拠点周囲の有効な出撃位置取得
  getValidDeployPositions(base: Base): Array<{ x: number; y: number }>;
}
```

## 拠点コンテキストでの実装詳細

### 待機兵士の表示
- 拠点に所属する兵士のみ表示
- 他の拠点の兵士は表示しない
- 駐留軍団の兵士は表示しない（既に軍団に所属）

### アイテム装備
- 拠点の倉庫（共通倉庫）からアイテムを取得
- 装備したアイテムは倉庫から削除
- キャンセル時はアイテムを倉庫に戻す

### 出撃位置選択
- 拠点を中心とした5x5グリッド（拠点から2マス以内）
- 他の軍団や障害物がある位置は選択不可
- 有効な位置をハイライト表示

## テスト方針

### 統合テストのポイント
- 拠点 → 兵舎 → 軍団編成の一連のフロー
- 待機兵士の追加/削除が正しく反映されるか
- 編成キャンセル時のロールバック
- 最大軍団数制限の確認
- 出撃位置の重複チェック

## 実装の詳細

### UIManagerの統合
- `showArmyFormationUI()`でUIを表示
- カメラのズームを考慮したサイズ計算
- `update()`でカメラ移動時の位置更新
- ArmyInfoPanelと同じ表示/非表示パターン

### タブ式UI実装
- 3つのタブで情報を整理（待機兵士/編成/アイテム）
- 兵士選択時に自動的に編成タブへ遷移
- 限られた画面スペースの効率的活用

## 未解決事項
- [ ] 複数拠点間での兵士の移動機能（将来実装）
- [ ] 編成プリセット機能の追加検討
- [ ] 出撃位置選択UIの実装（現在はデフォルト位置のみ）
- [ ] 駐留軍団管理機能の実装