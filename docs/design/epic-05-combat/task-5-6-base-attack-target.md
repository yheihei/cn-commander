# [タスク5-6] 拠点攻撃指定システム

## 概要
- エピック: #5 戦闘システム
- タスク: #5-6
- 関連PR/要件: PRD 2.1.10 拠点戦闘システム

## 設計方針
既存の攻撃目標指定システム（task-5-5）を最小限の変更で拡張し、拠点も攻撃目標として指定できるようにする。UIの一貫性を保ちながら、MVPアプローチで実装する。

## インターフェース定義

### 攻撃目標の型定義（新規）
```typescript
// src/types/CombatTypes.ts
import { Army } from '../army/Army';
import { Base } from '../base/Base';

export type AttackTarget = Army | Base | null;
```

### 攻撃目標管理の拡張（Army）
```typescript
interface Army {
  // 攻撃目標の設定（拠点も受け入れる）
  setAttackTarget(target: AttackTarget): void;
  
  // 攻撃目標の取得
  getAttackTarget(): AttackTarget;
}
```

### 入力処理の拡張（AttackTargetInputHandler）
```typescript
interface AttackTargetInputHandler {
  // 既存：敵軍団の検出
  findEnemyAtPosition(x: number, y: number): Army | null;
  
  // 新規：拠点の検出
  findBaseAtPosition(x: number, y: number): Base | null;
  
  // 修正：攻撃可能な対象を検出
  findTargetAtPosition(x: number, y: number): AttackTarget;
}
```

### 戦闘システムの拡張（CombatSystem）
```typescript
interface CombatSystem {
  // 拡張：攻撃目標が拠点の場合も処理
  performCharacterAttack(attacker: Character, attackerArmy: Army): void;
}
```

## 実装の流れ

1. **型定義の追加**
   - `CombatTypes.ts`に`AttackTarget`型を定義
   - 軍団と拠点の両方を扱える共通型として使用

2. **Armyクラスの修正**
   - `attackTarget`プロパティの型を`AttackTarget`に変更
   - 既存の`setAttackTarget()`を型変更のみ対応

3. **入力処理の拡張**
   - `AttackTargetInputHandler`に拠点検出機能を追加
   - クリック位置に敵拠点・中立拠点があれば選択可能に
   - 追加のビジュアル効果は実装しない（MVP）

4. **戦闘処理の統合**
   - `CombatSystem`で攻撃目標の型を判別
   - 拠点の場合は`BaseCombatSystem`を使用して攻撃

5. **UI表示の対応**
   - `ArmyInfoPanel`で拠点名を表示できるよう修正
   - シンプルに「攻撃目標: [拠点名]」形式で表示

## テスト方針

### 統合テスト
1. 拠点を攻撃目標に指定できることを確認
2. 軍団メンバーが拠点を攻撃することを検証
3. 攻撃目標の解除が正しく動作することを確認
4. 拠点が破壊された場合の自動解除を検証

## 実装完了事項
- [x] `SimpleAttackTarget`型を定義（Army | Base | null）
- [x] タイプガード関数（isArmyTarget, isBaseTarget）を実装
- [x] Armyクラスの攻撃目標を拡張
- [x] AttackTargetInputHandlerで拠点検出を追加
- [x] CombatSystemで拠点攻撃処理を実装
- [x] ArmyInfoPanelで拠点名表示に対応
- [x] 既存の攻撃目標指定UIを再利用

## 未解決事項
- [ ] 拠点攻撃時のビジュアルフィードバック強化（将来実装）
- [ ] 複数軍団で同一拠点を攻撃する際の協調動作
- [ ] 拠点への攻撃エフェクトの専用化