# [タスク12-6] 地形UIシステム

## 概要
- エピック: #12
- タスク: #12-6
- 関連PR/要件: 地形選択時の情報表示（PRD 5.3.4）

## 設計方針

### 地形情報の可視化
地形タイルを選択した際に、その地形効果を分かりやすく表示する。
- 地形タイプの明確な表示
- 効果の数値化と視覚化
- 戦術的な意味の説明
- 周辺地形との比較

### シンプルで直感的な表示
地形情報は補助的な情報のため、必要最小限の情報を簡潔に表示する。

## インターフェース定義

### TerrainUIController
地形UI全体を管理するコントローラ
```typescript
interface TerrainUIController {
  // 表示管理
  showTerrainInfo(tile: MapTile): void;
  hideTerrainInfo(): void;
  
  // 効果の可視化
  highlightEffectArea(tile: MapTile): void;
  clearHighlight(): void;
}
```

### 地形情報表示
```typescript
interface TerrainInfoDisplay {
  // 基本情報
  type: TerrainType;
  coordinates: { x: number; y: number };
  
  // 地形効果
  effects: TerrainEffects;
  
  // 説明テキスト
  description: string;
}

interface TerrainEffects {
  movementCost: number;      // 移動コスト（1.0 = 通常）
  defenseBonus: number;      // 防御補正（%）
  attackBonus: number;       // 攻撃補正（%）
  visionModifier: number;    // 視界補正（マス）
}
```

### 地形タイプ定義
```typescript
enum TerrainType {
  PLAIN = 'plain',      // 平地
  FOREST = 'forest',    // 森林
  MOUNTAIN = 'mountain' // 山地
}

// 地形タイプ別の表示設定
interface TerrainDisplayConfig {
  [TerrainType.PLAIN]: {
    name: '平地';
    color: '#90EE90';
    icon: '⬜';
  };
  [TerrainType.FOREST]: {
    name: '森林';
    color: '#228B22';
    icon: '🌲';
  };
  [TerrainType.MOUNTAIN]: {
    name: '山地';
    color: '#8B4513';
    icon: '⛰️';
  };
}
```

### 効果の視覚化
```typescript
interface TerrainEffectVisualizer {
  // 数値の視覚表現
  formatMovementCost(cost: number): string;
  formatBonus(bonus: number): string;
  
  // カラーコーディング
  getEffectColor(value: number): string;
  
  // アイコン表示
  getEffectIcon(effect: string): string;
}
```

## UI レイアウト仕様

### 地形情報パネル（コンパクト版）
```
+------------------------+
| 🌲 森林    (12, 35)   |
+------------------------+
| 移動コスト: 1.5x 🐌    |
| 防御補正:  +20% 🛡️    |
| 攻撃補正:  -10% ⚔️    |
| 視界:     -2マス 👁️   |
+------------------------+
| 身を隠しやすいが、     |
| 移動と攻撃には不利     |
+------------------------+
```

### 効果の比較表示（オプション）
```
+------------------------+
| 現在地: 平地           |
| → 森林への移動        |
+------------------------+
| 移動: 1.0x → 1.5x ↓  |
| 防御: +0% → +20% ↑   |
| 攻撃: +0% → -10% ↓   |
| 視界: ±0 → -2マス ↓  |
+------------------------+
```

## 実装詳細

### 地形効果の計算表示
```typescript
class TerrainEffectCalculator {
  // 実効値の計算
  calculateEffectiveSpeed(baseSpeed: number, terrain: TerrainType): number {
    const cost = TERRAIN_CONFIG[terrain].movementCost;
    return baseSpeed / cost;
  }
  
  // 表示用フォーマット
  formatEffect(effect: number, type: 'cost' | 'bonus'): string {
    if (type === 'cost') {
      return `${effect}x`;
    } else {
      const sign = effect >= 0 ? '+' : '';
      return `${sign}${effect}%`;
    }
  }
}
```

## テスト方針

### 統合テスト観点
1. **情報表示**
   - 各地形タイプで正しい効果が表示されるか
   - 座標が正しく表示されるか

2. **視覚的フィードバック**
   - 地形選択時のハイライト表示
   - 効果の色分け表示

3. **パフォーマンス**
   - 頻繁な地形選択でも軽快に動作するか

## 未解決事項
- [ ] 複数タイル選択時の表示方法
- [ ] 地形効果のアニメーション表現
- [ ] 高低差の表現方法（将来的な拡張）