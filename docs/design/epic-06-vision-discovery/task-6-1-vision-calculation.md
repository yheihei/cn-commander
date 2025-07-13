# [task-6-1] 視界計算システム

## 概要
- エピック: #6
- タスク: #6-1
- 関連PR/要件: 各軍団メンバーの視界を計算し、視界範囲を管理するシステム

## 設計方針
視界計算を独立したシステムとして実装し、様々な要素（基本視界、クラスボーナス、モード補正、地形補正）を統合的に計算する。

### 視界計算式
```
実効視界 = 基本視界 + クラスボーナス + モード補正 + 地形補正
```

### 影響要素
1. **基本視界**: キャラクターのsight属性（3〜20マス）
2. **クラスボーナス**: 影忍の暗視スキル（+3マス）
3. **モード補正**: 待機モード時（+1マス）
4. **地形補正**: 
   - 森林: -2マス
   - 山地: +3マス
   - 平地: ±0マス

## インターフェース定義

### VisionSystem
```typescript
class VisionSystem {
  calculateVision(army: Army, mapManager: MapManager): VisionArea[]
  getEffectiveSight(character: Character, position: Position, mode: MovementMode, terrain: TerrainEffect): number
  isInSight(observer: Position, target: Position, sightRange: number): boolean
  getVisibleTiles(center: Position, range: number): Position[]
}
```

### VisionArea（拡張）
```typescript
interface VisionArea {
  character: Character;
  range: number;        // 実効視界範囲
  center: Position;
  effectiveRange: number; // 地形・モード考慮後の範囲
}
```

## テスト方針
- 各種ボーナスが正しく計算されることを確認
- 視界範囲内のタイル判定が正確であることを確認
- 地形効果が適切に適用されることを確認

## 未解決事項
- [ ] フォグオブウォー表示はtask-6-4で実装
- [ ] 視界共有システムはtask-6-3で実装