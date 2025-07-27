# [task-10-3] 倉庫システム（共通在庫管理）

## 概要
- エピック: #10
- タスク: #10-3
- 関連PR/要件: @docs/prd/requirements.md セクション6.3（アイテム生産システム）

## 設計方針

### 全体アプローチ
- 全拠点共通の倉庫システムとして実装
- 生産されたアイテムは自動的に倉庫に格納
- 軍団編成時に倉庫からアイテムを取り出して兵士に装備
- 現在のスタブ実装から本格実装へ段階的に移行

### 技術選定理由
- シングルトンパターン：全拠点で共通の倉庫を使用するため
- TypeScriptの型システム：アイテムの種類を厳密に管理
- イベントシステム：在庫変更時の通知機能（将来実装）

## インターフェース定義

### InventoryManagerクラス
```typescript
class InventoryManager {
  // シングルトンインスタンス取得
  static getInstance(): InventoryManager;
  
  // アイテム管理
  addItem(item: IItem): void;
  addItems(items: IItem[]): void;
  removeItem(item: IItem): boolean;
  
  // アイテム検索
  getAllItems(): IItem[];
  getItemsByType(type: ItemType): IItem[];
  getItemCount(): number;
  getItemCountByType(type: ItemType): number;
  
  // アイテムグループ化（UI表示用）
  getGroupedItems(): Map<string, { item: IItem; count: number }>;
  
  // 在庫チェック
  hasItem(itemId: string): boolean;
  canAddItem(): boolean;  // 在庫上限チェック
  
  // イベント（将来実装）
  onInventoryChanged(callback: (items: IItem[]) => void): void;
}
```

## データ構造の概要

### 在庫管理
- アイテムの実体を配列で保持
- アイテムIDによる高速検索用のMapを併用（将来実装）
- 在庫上限の管理（将来実装）

### アイテムグループ化
- 同じ種類・名前のアイテムをグループ化してカウント
- UI表示の効率化

## 他システムとの連携

### 生産システム（task-10-1, 10-2）
- 生産完了時にInventoryManagerにアイテムを追加

### 軍団編成UI（task-3-4-2）
- ItemSelectionUIが倉庫からアイテムを取得
- 兵士への装備時に倉庫から削除

### 拠点施設UI（task-7-5-4）
- 倉庫施設UIで在庫確認
- アイテムの詳細情報表示

## テスト方針
- 単体テスト：アイテムの追加・削除・検索機能
- 統合テスト：ItemSelectionUIとの連携確認

## 未解決事項
- [ ] 在庫上限の仕様（無制限 or 上限あり）
- [ ] アイテムのソート順（種類別、価格順など）
- [ ] 在庫変更通知の実装方法（EventEmitter or Observer）
- [ ] アイテムの一意性管理（同じ忍者刀でも個別に管理するか）