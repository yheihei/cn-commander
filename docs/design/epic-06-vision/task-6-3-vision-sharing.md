# [task-6-3] 視界共有システム

## 概要
- エピック: #6
- タスク: #6-3
- 関連PR/要件: 全軍団間で視界を共有し、いずれかの軍団が発見した敵は全軍団から見えるようにする

## 設計方針

### 基本方針
- 既存のVisionSystemとDiscoverySystemを拡張
- 味方軍団間で視界情報を共有
- パフォーマンスを考慮した効率的な実装

### 技術選定理由
- 既存システムとの整合性を保つため、VisionSystemに統合
- 計算量削減のため、視界情報をキャッシュ

## インターフェース定義

### VisionSystem拡張
```typescript
// 追加メソッド
getSharedVisionForFaction(faction: Faction): SharedVisionData;
isVisibleByFaction(targetArmy: Army, viewerFaction: Faction): boolean;

// SharedVisionData型
interface SharedVisionData {
  visibleArmies: Set<Army>;
  visibleTiles: Set<string>; // "x,y"形式のキー
  lastUpdated: number;
}
```

### DiscoverySystem拡張
```typescript
// 既存メソッドの拡張
checkDiscovery(viewerArmies: Army[], targetArmies: Army[]): void;
// → 全味方軍団の視界を統合して発見チェック

// 追加メソッド
checkFactionDiscovery(faction: Faction, targetArmies: Army[]): void;
```

### GameSceneとの連携
- 毎フレームで全味方軍団の視界を統合
- 統合された視界で敵軍団の発見チェック
- 発見時の演出は既存のものを使用

## テスト方針

### 統合テストの観点
1. 複数軍団での視界共有確認
   - 軍団Aが見えない敵を軍団Bが発見した場合
   - 全軍団から見えることを確認

2. パフォーマンステスト
   - 多数の軍団（10軍団以上）での処理速度
   - 視界計算の最適化確認

3. 境界値テスト
   - 視界ギリギリでの発見
   - 複数軍団の視界が重なる場合

## 実装内容

### VisionSystemの拡張
- `getSharedVisionForFaction`: 勢力の全軍団の視界を統合
- `isVisibleByFaction`: 勢力視界での可視判定
- `getVisibleEnemyArmies`: 勢力から見える敵軍団リスト取得
- 視界キャッシュ機能（100ms有効）で最適化

### DiscoverySystemの拡張
- `checkFactionDiscovery`: 勢力単位での発見チェック
- 最も近い観測者を発見者として記録

### 性能
- 10軍団での視界共有処理が100ms以内で完了することを確認

## 未解決事項
- [x] 視界情報のキャッシュ更新タイミング（毎フレーム or 変更時のみ） → 100msキャッシュで実装
- [ ] フォグオブウォー（task-6-4）実装時の連携方法