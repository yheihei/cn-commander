# [タスク5-1] 戦闘計算システム

## 概要
- エピック: #5
- タスク: #5-1
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.7

## 設計方針

### 基本方針
- 攻撃成功率は攻撃力と防御力の比率で決定
- ダメージは固定値1（HPを1減少）
- 武器の耐久度を攻撃ごとに1消費

### 計算式
```typescript
攻撃成功率 = (攻撃側の攻撃力 + 武器補正) / (攻撃側の攻撃力 + 武器補正 + 防御側の防御力) × 100%
```

## インターフェース定義

### CombatCalculator
```typescript
interface ICombatCalculator {
  // 攻撃成功率を計算（0-100の値を返す）
  calculateHitRate(attacker: Character, defender: Character): number;
  
  // 攻撃を実行（成功/失敗を返す）
  performAttack(attacker: Character, defender: Character): boolean;
  
  // ダメージを適用
  applyDamage(defender: Character, damage: number): void;
}
```

### CombatResult
```typescript
interface CombatResult {
  success: boolean;
  hitRate: number;
  damage: number;
  weaponUsed?: IWeapon;
  targetKilled: boolean;
}
```

### イベント
```typescript
// 攻撃実行時
onAttackPerformed: (attacker: Character, defender: Character, result: CombatResult) => void;

// キャラクター撃破時
onCharacterDefeated: (character: Character) => void;
```

## データ構造の概要

### 攻撃情報の管理
- 攻撃者のCharacterインスタンス
- 防御者のCharacterインスタンス  
- 使用武器の情報
- 地形効果（将来的な拡張用）

## テスト方針

### 単体テスト
- 命中率計算の境界値テスト
- 武器補正の適用確認
- 耐久度消費の確認

### 統合テスト
- Character/ItemSystemとの連携
- 撃破時のArmyシステムへの通知

## 未解決事項
- [ ] 地形補正の適用方法（攻撃補正、防御補正）
- [ ] クリティカルヒットの実装有無
- [ ] 反撃システムの実装有無