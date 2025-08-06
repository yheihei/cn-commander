# [task-10-5] 倉庫システム（InventoryManager本格実装）

## 概要
- エピック: #10
- タスク: #10-5
- 関連PR/要件: @docs/prd/requirements.md セクション6.3.1（共通倉庫）

## 設計方針

全拠点で共有される倉庫システムを本格実装する。既存のInventoryManagerスタブを拡張し、生産システムと軍団編成システムをつなぐ中核機能として実装する。

### 実装範囲
- アイテムの追加・削除・検索機能
- 在庫数の管理と取得
- アイテムの一意性管理（ID、耐久度）
- 共通倉庫としての一元管理

### 既存スタブからの拡張
- 基本的なインターフェースは維持
- 内部実装を本格化
- パフォーマンスを考慮した設計

## インターフェース定義

### InventoryManagerクラス
```typescript
class InventoryManager {
  private items: Map<string, IItem>;           // itemId -> Item
  private itemsByType: Map<ItemType, Set<string>>;  // Type -> itemIds
  
  constructor(scene: Phaser.Scene);
  
  // === 基本操作 ===
  addItem(item: IItem): void;
  removeItem(itemId: string): boolean;
  getItem(itemId: string): IItem | null;
  
  // === 取得・検索 ===
  getItems(): IItem[];
  getItemsByType(type: ItemType): IItem[];
  getItemCount(type: ItemType): number;
  getTotalCount(): number;
  
  // === フィルタリング ===
  findAvailableWeapons(): IItem[];        // 耐久度 > 0 の武器
  findConsumables(): IItem[];             // 全消耗品
  findItemsWithDurability(minDurability: number): IItem[];
  
  // === 在庫管理 ===
  hasItem(itemId: string): boolean;
  hasItemType(type: ItemType, count?: number): boolean;
  
  // === デバッグ・情報 ===
  getInventoryStats(): InventoryStats;
  clear(): void;  // 全アイテム削除（テスト用）
}
```

### IItem インターフェース
```typescript
interface IItem {
  id: string;                    // UUID
  type: ItemType;                // NINJA_SWORD, SHURIKEN, etc.
  name: string;                  // 表示名
  category: 'weapon' | 'consumable';
  
  // 武器専用
  durability?: number;           // 現在の耐久度
  maxDurability?: number;        // 最大耐久度
  attackBonus?: number;          // 攻撃力補正
  range?: Range;                 // 射程
  
  // 消耗品専用  
  effect?: ItemEffect;           // 効果
  uses?: number;                 // 使用回数
  
  // メタデータ
  createdAt: number;             // 作成時刻（タイムスタンプ）
  source?: 'production' | 'initial' | 'loot';  // 入手源
}
```

### ItemType 列挙型
```typescript
enum ItemType {
  // 武器
  NINJA_SWORD = 'NINJA_SWORD',    // 忍者刀
  SHURIKEN = 'SHURIKEN',          // 手裏剣
  BOW = 'BOW',                    // 弓
  
  // 消耗品
  FOOD_PILL = 'FOOD_PILL',        // 兵糧丸
}
```

### InventoryStats インターフェース
```typescript
interface InventoryStats {
  totalItems: number;
  weaponCount: number;
  consumableCount: number;
  
  // タイプ別カウント
  itemCounts: Map<ItemType, number>;
  
  // 耐久度統計（武器のみ）
  averageDurability: number;
  weaponsNeedRepair: number;  // 耐久度50%以下
  
  // 最古・最新アイテム
  oldestItem: IItem | null;
  newestItem: IItem | null;
}
```

## アイテム生成

### ItemFactoryクラス
```typescript
class ItemFactory {
  // アイテム生成（生産システムから呼び出し）
  static createItem(type: ItemType): IItem {
    const id = this.generateId();
    const base = {
      id,
      type,
      createdAt: Date.now(),
      source: 'production' as const
    };
    
    switch(type) {
      case ItemType.NINJA_SWORD:
        return {
          ...base,
          name: '忍者刀',
          category: 'weapon',
          durability: 100,
          maxDurability: 100,
          attackBonus: 15,
          range: { min: 1, max: 3 }
        };
        
      case ItemType.SHURIKEN:
        return {
          ...base,
          name: '手裏剣',
          category: 'weapon',
          durability: 100,
          maxDurability: 100,
          attackBonus: 5,
          range: { min: 1, max: 6 }
        };
        
      case ItemType.BOW:
        return {
          ...base,
          name: '弓',
          category: 'weapon',
          durability: 100,
          maxDurability: 100,
          attackBonus: 2,
          range: { min: 4, max: 12 }
        };
        
      case ItemType.FOOD_PILL:
        return {
          ...base,
          name: '兵糧丸',
          category: 'consumable',
          effect: ItemEffect.FULL_HEAL,
          uses: 1
        };
    }
  }
  
  private static generateId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## データ管理

### 内部データ構造
```typescript
class InventoryManager {
  // 主要なデータ保存
  private items: Map<string, IItem>;
  
  // インデックス（高速検索用）
  private itemsByType: Map<ItemType, Set<string>>;
  private weaponIds: Set<string>;
  private consumableIds: Set<string>;
  
  // 統計キャッシュ（パフォーマンス用）
  private statsCache: InventoryStats | null;
  private statsCacheValid: boolean;
}
```

### アイテム追加処理
```typescript
addItem(item: IItem): void {
  // 主データに追加
  this.items.set(item.id, item);
  
  // インデックス更新
  if (!this.itemsByType.has(item.type)) {
    this.itemsByType.set(item.type, new Set());
  }
  this.itemsByType.get(item.type)!.add(item.id);
  
  // カテゴリ別インデックス
  if (item.category === 'weapon') {
    this.weaponIds.add(item.id);
  } else {
    this.consumableIds.add(item.id);
  }
  
  // キャッシュ無効化
  this.statsCacheValid = false;
  
  // イベント発行（オプション）
  this.emit('itemAdded', item);
}
```

### アイテム削除処理
```typescript
removeItem(itemId: string): boolean {
  const item = this.items.get(itemId);
  if (!item) return false;
  
  // 主データから削除
  this.items.delete(itemId);
  
  // インデックスから削除
  this.itemsByType.get(item.type)?.delete(itemId);
  
  if (item.category === 'weapon') {
    this.weaponIds.delete(itemId);
  } else {
    this.consumableIds.delete(itemId);
  }
  
  // キャッシュ無効化
  this.statsCacheValid = false;
  
  // イベント発行
  this.emit('itemRemoved', item);
  
  return true;
}
```

## 他システムとの連携

### ProductionManager（task-10-2）
```typescript
// 生産完了時の呼び出し
const newItem = ItemFactory.createItem(ProductionItemType.NINJA_SWORD);
inventoryManager.addItem(newItem);
```

### 軍団編成システム（task-3-4-2）
```typescript
// 利用可能な武器取得
const weapons = inventoryManager.findAvailableWeapons();

// アイテム装備時
inventoryManager.removeItem(selectedWeaponId);
```

### 倉庫UI（将来実装）
```typescript
// 在庫一覧表示
const stats = inventoryManager.getInventoryStats();
const itemsByType = inventoryManager.getItemsByType(ItemType.NINJA_SWORD);
```

## パフォーマンス最適化

### インデックスの活用
- タイプ別インデックスで高速検索
- カテゴリ別インデックスでフィルタリング高速化

### キャッシュ戦略
- 統計情報はキャッシュして再利用
- アイテム追加/削除時のみキャッシュ無効化

### メモリ管理
- 不要なアイテム（耐久度0）の定期削除（オプション）
- 大量アイテム時の警告

## テスト方針

### 単体テスト
- アイテムの追加・削除・検索
- インデックスの整合性
- 統計情報の正確性

### 統合テスト
- 生産システムからの連続追加
- 軍団編成での大量取得
- 1000個以上のアイテム管理

### パフォーマンステスト
- 大量アイテムでの検索速度
- メモリ使用量の監視
- インデックス更新のオーバーヘッド

## 未解決事項
- [ ] アイテムのソート機能
- [ ] アイテムのお気に入り登録
- [ ] 倉庫容量制限の実装
- [ ] アイテムスタック機能（同種アイテムのグループ化）
- [ ] セーブ/ロード時のシリアライズ