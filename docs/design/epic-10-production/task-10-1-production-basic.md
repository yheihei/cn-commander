# [task-10-1] 生産基本システム（拠点別6ライン、共通倉庫）

## 概要
- エピック: #10
- タスク: #10-1
- 関連PR/要件: @docs/prd/requirements.md セクション6.3（アイテム生産システム）

## 設計方針

### 全体アプローチ
- 拠点ごとに独立した生産ラインを管理（最大6ライン）
- 生産されたアイテムは全拠点共通の倉庫（InventoryManager）に格納
- リアルタイムで生産が進行し、完了時に自動的に倉庫へ移動
- 資金管理システムとの連携により、生産時に費用を消費

### 技術選定理由
- マネージャーパターン：既存のアーキテクチャと統一性を保つため
- 拠点ごとの生産キュー：複数拠点での並行生産を実現
- イベント駆動：生産完了時の処理を柔軟に拡張可能

### 既存システムとの整合性
- BaseManagerと連携して拠点ごとの生産ラインを管理
- InventoryManagerに生産完了アイテムを追加
- 将来実装予定の資金管理システム（EconomyManager）と連携

## インターフェース定義

### ProductionManagerクラス
```typescript
class ProductionManager {
  // 初期化
  constructor(scene: Phaser.Scene);
  
  // 生産ライン管理
  startProduction(baseId: string, itemType: ProductionItemType, quantity: number): boolean;
  cancelProduction(baseId: string, lineIndex: number): void;
  getProductionQueues(baseId: string): ProductionQueue[];
  
  // 更新処理
  update(deltaTime: number): void;
  
  // 生産可能アイテムの取得
  getProductionItems(): ProductionItemDefinition[];
  
  // 生産状態の確認
  isProducing(baseId: string): boolean;
  getAvailableLines(baseId: string): number;
}
```

### ProductionQueue インターフェース
```typescript
interface ProductionQueue {
  itemType: ProductionItemType;
  remainingQuantity: number;
  currentProgress: number;  // 0-1の進捗率
  timePerItem: number;      // 秒単位
  costPerItem: number;      // 両単位
}
```

### ProductionItemDefinition インターフェース
```typescript
interface ProductionItemDefinition {
  type: ProductionItemType;
  name: string;
  category: 'weapon' | 'consumable';
  productionTime: number;   // 秒単位
  productionCost: number;   // 両単位
  createItem: () => IItem;  // アイテム生成関数
}
```

### ProductionItemType 列挙型
```typescript
enum ProductionItemType {
  NINJA_SWORD = 'NINJA_SWORD',    // 忍者刀
  SHURIKEN = 'SHURIKEN',          // 手裏剣
  BOW = 'BOW',                    // 弓
  FOOD_PILL = 'FOOD_PILL',        // 兵糧丸
}
```

## データ構造の概要

### 生産ライン管理
- 拠点IDをキーとしたMapで各拠点の生産キューを管理
- 各拠点は最大6つの生産ラインを持つ配列
- 空のラインはnullで表現

### 生産アイテム定義
- 静的な定義として4種類のアイテムを管理
- 各アイテムの生産時間、費用、生成方法を定義
- 将来的な拡張を考慮した設計

### 生産進行管理
- deltaTimeベースでリアルタイム進行
- 生産完了時にInventoryManagerへ自動追加
- 資金不足時は生産を一時停止

## 他システムとの連携

### BaseManager
- 拠点の所有者確認（味方拠点でのみ生産可能）
- 拠点の存在確認

### InventoryManager（既存）
- 生産完了アイテムの格納先
- `addItem()`メソッドを使用

### EconomyManager（将来実装）
- 生産開始時の資金確認
- 生産費用の引き落とし

### ProductionFactoryMenu（task-10-4）
- 生産可能アイテムリストの提供
- 生産キュー状態の提供

## テスト方針

### 単体テスト
- 生産ライン追加・削除の動作確認
- 生産進行の時間計算
- 複数拠点での並行生産

### 統合テスト
- InventoryManagerへのアイテム追加確認
- 6ライン満杯時の動作確認
- 生産キャンセル時の処理

## 未解決事項
- [ ] 資金管理システムとの具体的な連携方法
- [ ] セーブ/ロード時の生産状態の保存方法
- [ ] 生産速度ボーナス等の拡張機能の設計
- [ ] 生産完了通知の実装方法（UI通知、音声等）