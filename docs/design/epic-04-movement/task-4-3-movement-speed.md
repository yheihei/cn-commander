# [タスク4-3] 移動速度計算

## 概要
- エピック: #4
- タスク: #4-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.4

## 設計方針

### 移動速度計算の要素
1. **軍団平均速度**: 構成メンバーの移動速度の平均値
2. **モード補正**: 移動モードによる速度倍率
3. **地形コスト**: 現在地の地形による移動コスト

### 計算式
```
軍団移動速度 = (指揮官の移動速度 + 一般忍者3名の移動速度合計) ÷ 軍団人数
実際の移動時間（秒/マス） = (40 / 軍団移動速度) × (1 / モード補正) × 地形コスト
```

## インターフェース定義

### 移動速度計算システム
```typescript
interface MovementSpeedCalculator {
  // 軍団の平均移動速度を計算
  calculateArmySpeed(army: Army): number;
  
  // 実際の移動時間を計算（秒/マス）
  calculateMovementTime(
    army: Army,
    mode: MovementMode,
    terrainType: TileType
  ): number;
  
  // ピクセル単位の移動速度を計算（ピクセル/秒）
  calculatePixelSpeed(
    army: Army,
    mode: MovementMode,
    terrainType: TileType
  ): number;
}

interface MovementCalculation {
  armySpeed: number;          // 軍団平均速度
  modeMultiplier: number;     // モード倍率
  terrainCost: number;        // 地形コスト
  timePerTile: number;        // 1マスあたりの移動時間（秒）
  pixelsPerSecond: number;    // ピクセル/秒の移動速度
}
```

### 計算例
```typescript
// 例1：風忍指揮官（速度13）+ 混成部隊（速度10、12、13）
// 軍団速度 = (13 + 10 + 12 + 13) ÷ 4 = 12
// 通常移動で平地 = (40 / 12) × (1 / 1.0) × 1.0 = 3.33秒/マス

// 例2：鉄忍指揮官（速度8）+ 混成部隊（速度10、11、12）
// 軍団速度 = (8 + 10 + 11 + 12) ÷ 4 = 10.25
// 戦闘移動で森林 = (40 / 10.25) × (1 / 0.6) × 1.5 = 9.76秒/マス
```

### 主要コンポーネント
- **MovementSpeedCalculator**: 移動速度計算クラス
- **MovementCalculation**: 計算結果データ
- **地形効果の適用**: TERRAIN_EFFECTSからの移動コスト取得

## テスト方針
- 軍団平均速度の計算精度
- 各移動モードでの速度計算
- 地形効果の適用確認
- 境界値での計算（最小・最大速度）

## 未解決事項
- [ ] メンバーが戦闘不能になった場合の再計算
- [ ] 速度バフ・デバフの適用タイミング