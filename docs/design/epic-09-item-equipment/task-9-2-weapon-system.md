# [task-9-2] 武器システム

## 概要
- エピック: #9
- タスク: #9-2
- 関連PR/要件: @docs/prd/requirements.md 2.3.2節、2.1.7節

## 設計方針

### 何を実現するか（What）
刀剣と飛び道具の2種類の武器システムを実装し、攻撃力補正、射程、耐久度の管理を行う。

### なぜその設計にしたか（Why）
- 武器種別により異なる戦術的選択を提供（近距離高威力 vs 遠距離低威力）
- 耐久度システムによりリソース管理の要素を追加
- 攻撃成否に関わらず耐久度を消費することで、攻撃回数の管理を促進

### 主要なコンポーネントと責務（High-level design）

1. **Weaponクラス**
   - Item基底クラスを継承
   - 攻撃力補正、射程、耐久度を管理
   - 武器使用時の耐久度消費

2. **WeaponType列挙型**
   - SWORD: 刀剣系（忍者刀）
   - PROJECTILE: 飛び道具系（手裏剣）

3. **WeaponFactory**
   - 武器インスタンスの生成
   - 武器データの定義と管理

## インターフェース定義

```typescript
// 武器タイプ
enum WeaponType {
  SWORD = 'sword',
  PROJECTILE = 'projectile'
}

// 武器インターフェース
interface IWeapon extends IItem {
  weaponType: WeaponType;
  attackBonus: number;
  minRange: number;
  maxRange: number;
  durability: number;
  maxDurability: number;
  price: number;
  
  // 武器操作
  use(): void;
  canUse(): boolean;
  getDurabilityPercentage(): number;
  repair(amount?: number): void;
}

// 武器ファクトリーインターフェース
interface IWeaponFactory {
  createWeapon(weaponId: string): IWeapon;
  getWeaponData(weaponId: string): WeaponData;
}

// 武器データ定義
interface WeaponData {
  id: string;
  name: string;
  weaponType: WeaponType;
  attackBonus: number;
  minRange: number;
  maxRange: number;
  maxDurability: number;
  price: number;
  description: string;
}

// 射程チェック
interface IRangeChecker {
  isInRange(attackerPos: Position, targetPos: Position, weapon: IWeapon): boolean;
  getAttackablePositions(attackerPos: Position, weapon: IWeapon): Position[];
}
```

## データ構造の概要

### 武器定義データ
```typescript
const WEAPON_DATA: Record<string, WeaponData> = {
  'ninja_sword': {
    id: 'ninja_sword',
    name: '忍者刀',
    weaponType: WeaponType.SWORD,
    attackBonus: 15,
    minRange: 1,
    maxRange: 3,
    maxDurability: 100,
    price: 300,
    description: '標準的な忍者の刀'
  },
  'shuriken': {
    id: 'shuriken',
    name: '手裏剣',
    weaponType: WeaponType.PROJECTILE,
    attackBonus: 5,
    minRange: 2,
    maxRange: 6,
    maxDurability: 100,
    price: 200,
    description: '遠距離攻撃用の投擲武器'
  }
};
```

## テスト方針

- 武器生成と初期値のテスト
- 耐久度消費と使用可能判定のテスト
- 射程計算の正確性テスト
- 異なる武器タイプの特性テスト

## 未解決事項
- [x] 武器の修理機能の実装タイミング - repairメソッドとして実装済み
- [ ] 特殊武器（レア武器）の追加可能性
- [ ] 武器のグラフィック表示仕様

## 実装時の追加機能
- getWeapons()、getUsableWeapons()メソッドをItemHolderに追加
- 武器の自動装備で耐久度も考慮（同じ攻撃力なら耐久度が高い方を選択）