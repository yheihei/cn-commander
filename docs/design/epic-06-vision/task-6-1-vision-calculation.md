# [タスク6-1] 視界計算システム

## 概要
- エピック: #6
- タスク: #6-1
- 関連PR/要件: @docs/prd/requirements.md 2.1.9 視界システムと発見メカニクス

## 設計方針

### 基本方針
- 各キャラクターが個別の視界を持つ
- 職業、移動モード、地形による視界補正を適用
- 正方形（マンハッタン距離）での視界判定

### 視界計算式
```
実効視界 = 基本視界 + クラスボーナス + モード補正 + 地形補正
```

## インターフェース定義

### VisionSystem
```typescript
interface VisionSystem {
  // 軍団の視界エリアを計算
  calculateVision(army: Army): SightArea[];
  
  // 軍団間の視認可能性をチェック
  canSeeArmy(observer: Army, target: Army): boolean;
  
  // 特定座標が視界内かチェック
  isPositionInSight(army: Army, x: number, y: number): boolean;
}
```

### SightArea
```typescript
interface SightArea {
  position: { x: number; y: number };
  baseRange: number;
  effectiveRange: number;
  character: Character;
}
```

## テスト方針

### 統合テストの観点
- 職業による視界ボーナス（影忍+3）
- 移動モードによる視界補正（待機+1）
- 地形効果による視界補正（森林-2、山地+3）
- 軍団メンバー全員の視界統合

## 未解決事項
- [ ] 視界共有システム（全軍団間での視界共有）の実装
- [ ] フォグオブウォー表示の実装
- [ ] 視界範囲の可視化（デバッグ用）