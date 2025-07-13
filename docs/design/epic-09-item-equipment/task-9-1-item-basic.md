# [task-9-1] アイテム基本システム

## 概要
- エピック: #9
- タスク: #9-1
- 関連PR/要件: @docs/prd/requirements.md 2.3節、2.1.10節

## 設計方針

### 何を実現するか（What）
キャラクターのアイテム所持・管理システムを構築する。各キャラクターは最大4個のアイテムを所持でき、武器と消耗品を管理する。

### なぜその設計にしたか（Why）
- アイテム所持数の制限により戦術的な選択を促進
- 武器の自動装備により操作の簡素化を実現
- ステージ中のアイテム受け渡し不可により、事前準備の重要性を強調

### 主要なコンポーネントと責務（High-level design）

1. **Item基底クラス**
   - アイテムの基本情報（ID、名前、タイプ）を管理
   - サブクラスで武器・消耗品を実装

2. **ItemHolder**
   - キャラクターのアイテム所持を管理
   - 最大4個の所持制限を実装
   - 武器の自動装備ロジック

3. **ItemType列挙型**
   - WEAPON: 武器（刀剣/飛び道具）
   - CONSUMABLE: 消耗品（兵糧丸等）

## インターフェース定義

```typescript
// アイテムタイプ
enum ItemType {
  WEAPON = 'weapon',
  CONSUMABLE = 'consumable'
}

// アイテム基底インターフェース
interface IItem {
  id: string;
  name: string;
  type: ItemType;
  stackable: boolean;
  getDisplayInfo(): ItemDisplayInfo;
}

// アイテム所持管理インターフェース
interface IItemHolder {
  items: IItem[];
  maxItems: number;
  equippedWeapon: IWeapon | null;
  
  // アイテム操作
  addItem(item: IItem): boolean;
  removeItem(item: IItem): boolean;
  hasItem(itemId: string): boolean;
  getItemCount(): number;
  
  // 装備管理
  equipWeapon(weapon: IWeapon): void;
  getEquippedWeapon(): IWeapon | null;
  autoEquipBestWeapon(): void;
}

// アイテム表示情報
interface ItemDisplayInfo {
  name: string;
  icon?: string;
  description: string;
}
```

## データ構造の概要

- アイテムはIDで一意に識別
- 各キャラクターがItemHolderを保持
- 武器は配列の先頭にある使用可能なものが自動装備
- 耐久度0の武器も所持枠を使用（削除しない）

## テスト方針

- アイテム追加・削除の境界値テスト（最大4個）
- 武器自動装備の優先順位テスト
- 耐久度0武器の所持継続テスト
- 異なるアイテムタイプの混在管理テスト

## 未解決事項
- [x] アイテムのスタック可能性（同じアイテムを複数持つ場合の扱い） - stackableフラグで実装済み
- [ ] アイテムの並び替え機能の必要性

## 実装時の変更点
- 武器の自動装備：PRDでは「上にあるものが自動装備」だったが、実装では「攻撃力が最も高い武器を自動装備」に変更（より戦術的に適切）
- CharacterクラスにItemHolderを統合し、getItemHolder()メソッドでアクセス可能に