# [タスク5-3] 射程システム

## 概要
- エピック: #5
- タスク: #5-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.8

## 設計方針

### 基本方針
- 武器タイプごとに最小/最大射程を定義
- グリッド座標でのマンハッタン距離計算
- 射程内の敵を効率的に検索

### 射程定義
- 刀剣: 最小1マス、最大3マス
- 手裏剣: 最小2マス、最大6マス

## インターフェース定義

### RangeCalculator
```typescript
interface IRangeCalculator {
  // 射程内判定
  isInRange(attacker: Character, target: Character): boolean;
  
  // 射程内の敵を取得
  getTargetsInRange(attacker: Character, potentialTargets: Character[]): Character[];
  
  // 最も近い敵を取得
  getNearestTarget(attacker: Character, targets: Character[]): Character | null;
  
  // 武器の射程情報を取得
  getWeaponRange(weapon: IWeapon): { min: number; max: number };
}
```

### RangeInfo
```typescript
interface RangeInfo {
  weapon: IWeapon;
  minRange: number;
  maxRange: number;
  currentTargets: Character[];
}
```

## データ構造の概要

### 距離計算
```typescript
// マンハッタン距離（グリッド座標）
function calculateDistance(pos1: GridPosition, pos2: GridPosition): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}
```

### 武器タイプと射程
```typescript
const WEAPON_RANGES = {
  sword: { min: 1, max: 3 },      // 刀剣
  shuriken: { min: 2, max: 6 }    // 手裏剣
};
```

## テスト方針

### 単体テスト
- 距離計算の精度
- 射程境界値でのテスト
- 複数ターゲットの優先順位

### 統合テスト
- MapManagerとの座標変換
- 発見済み敵のみを対象とする
- 軍団内メンバー間の射程共有

## 未解決事項
- [ ] 障害物による射線の遮断
- [ ] 高低差の影響（将来実装）
- [ ] 範囲攻撃の実装有無