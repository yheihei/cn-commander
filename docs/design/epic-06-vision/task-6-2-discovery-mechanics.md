# [タスク6-2] 発見メカニクス

## 概要
- エピック: #6
- タスク: #6-2
- 関連PR/要件: @docs/prd/requirements.md 2.1.9 視界システムと発見メカニクス

## 設計方針

### 基本方針
- 敵軍団の発見状態を管理し、プレイヤーに視覚的・聴覚的フィードバックを提供
- 未発見の敵は非表示、発見後は継続的に表示
- 発見時の演出により、戦術的な緊張感を演出

### 技術選定
- Phaser3のタイマーとTweenシステムを使用した演出
- 効果音による聴覚的フィードバック

## インターフェース定義

### DiscoverySystem
```typescript
interface DiscoverySystem {
  // 発見チェック
  checkDiscovery(observers: Army[], targets: Army[]): void;
  
  // 発見状態の確認
  isDiscovered(armyId: string): boolean;
  
  // 軍団の初期表示状態設定
  initializeArmyVisibility(army: Army): void;
  
  // 発見時のコールバック
  onArmyDiscovered?: (army: Army, event: DiscoveryEvent) => void;
}
```

### 発見演出
- **効果音**: `assets/sounds/EnemyFound.mp3`（音量25%）
- **視覚演出**: 
  - 3回の点滅（150ms間隔、透明度0.6と0を交互）
  - 最終フェードイン（300ms、透明度1へ）

## テスト方針

### 統合テストの観点
- プレイヤー軍団による敵軍団の発見
- 発見状態の永続性（一度発見した敵は視界外でも表示継続）
- 発見時コールバックの動作確認

### 演出テストの観点
- 効果音の再生タイミング
- 点滅アニメーションの正確性
- 最終的な表示状態の確認

## 未解決事項
- [x] 効果音の音量調整（0.5→0.25に変更済み）
- [ ] 複数の敵を同時に発見した場合の効果音の重複制御
- [ ] 発見演出中の軍団への操作制限