# [タスク7-2] 拠点戦闘システム

## 概要
- エピック: #7
- タスク: #7-2
- 関連PR/要件: 拠点へのダメージ処理、HP管理、軍団による攻撃

## 設計方針

### 戦闘メカニクス
- 拠点は軍団から攻撃を受けることが可能
- 拠点自体は反撃しない（駐留軍団が防衛）
- 通常の戦闘計算式を適用
- HPが0になると占領可能状態になる

### 攻撃対象としての拠点
- 軍団の攻撃目標として指定可能
- 射程内判定は拠点の中心点を基準
- 複数の軍団から同時攻撃可能

## インターフェース定義

### IAttackableBase（攻撃可能な拠点）
```typescript
interface IAttackableBase {
  // 戦闘関連
  isAttackable(): boolean;
  canBeTargeted(): boolean;
  getDefenseBonus(): number;
  
  // ダメージ処理
  onAttacked(attacker: Character): void;
  takeDamage(amount: number): boolean; // 破壊されたらtrue
  
  // HP関連
  isDestroyed(): boolean;
  getHpPercentage(): number;
}
```

### BaseCombatSystem（拠点戦闘管理）
```typescript
class BaseCombatSystem {
  constructor(combatManager: CombatManager, baseManager: BaseManager);
  
  // 攻撃処理
  processBaseAttack(attacker: Character, targetBase: Base): void;
  calculateDamageToBase(attacker: Character, targetBase: Base): number;
  
  // 射程判定
  isBaseInRange(attacker: Character, targetBase: Base): boolean;
  getDistanceToBase(from: Position, targetBase: Base): number;
  
  // 攻撃可能判定
  canAttackBase(attacker: Character, targetBase: Base): boolean;
  getAttackableBases(attacker: Character): Base[];
  
  // エフェクト
  showBaseHitEffect(base: Base): void;
  showBaseDamageNumber(base: Base, damage: number): void;
}
```

### 拡張: Base クラスへの戦闘機能追加
```typescript
class Base extends Phaser.GameObjects.Container implements IAttackableBase {
  // 既存の機能に加えて...
  
  // 戦闘関連
  private combatData: {
    isBeingAttacked: boolean;
    lastAttackedTime: number;
    attackers: Set<string>; // 攻撃中の軍団ID
  };
  
  // IAttackableBase実装
  isAttackable(): boolean;
  canBeTargeted(): boolean;
  getDefenseBonus(): number;
  onAttacked(attacker: Character): void;
  
  // HP表示
  private hpBar: Phaser.GameObjects.Graphics;
  updateHpBar(): void;
  
  // 破壊状態
  setDestroyed(): void;
  showDestroyedVisual(): void;
}
```

### 拡張: CombatManager への統合
```typescript
interface AttackTarget {
  type: 'character' | 'base';
  target: Character | Base;
}

// CombatManagerの拡張
class CombatManager {
  // 既存の機能に加えて...
  
  setAttackTarget(armyId: string, target: AttackTarget): void;
  processAttack(attacker: Character, target: AttackTarget): void;
}
```

## ダメージ計算

### 拠点への攻撃成功率
```
攻撃成功率 = (攻撃側の攻撃力 + 武器補正) / (攻撃側の攻撃力 + 武器補正 + 拠点防御値) × 100%

拠点防御値:
- 本拠地: 30
- 通常拠点: 20
- 破壊状態: 0
```

### ダメージ
- 固定値1（キャラクター間戦闘と同じ）
- 複数攻撃者による累積ダメージ可能

## ビジュアル仕様

### HP表示
- 拠点上部にHPバーを常時表示
- 緑→黄→赤の3段階で色変化
- 数値表示（現在HP/最大HP）

### 被ダメージ演出
- ヒット時に赤いフラッシュ効果
- ダメージ数値のポップアップ
- 画面振動効果（大ダメージ時）

### 破壊状態
- スプライトを破壊された城に変更
- 煙エフェクトの追加
- HPバーを非表示

## テスト方針
- 軍団による拠点攻撃の動作確認
- ダメージ計算の正確性
- 複数軍団による同時攻撃
- HP0時の状態遷移
- エフェクトとビジュアル更新

## 未解決事項
- [ ] 拠点への攻撃アニメーション詳細
- [ ] 占領可能状態の視覚的表現
- [ ] 駐留軍団との防衛戦闘連携（task-7-4で実装）