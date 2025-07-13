# [task-6-2] 発見メカニクス

## 概要
- エピック: #6
- タスク: #6-2
- 関連PR/要件: 敵軍団の発見状態を管理し、未発見の敵を非表示にするシステム

## 設計方針
発見状態を軍団ごとに管理し、視界システムと連携して敵の発見・表示を制御する。

### 発見状態
1. **未発見（undiscovered）**: 
   - 敵軍団が見えない状態
   - マップ上に表示されない（visible = false）
   
2. **発見済み（discovered）**: 
   - 敵軍団が視界に入った
   - 一度発見されたら視界外でも表示継続

### 発見メカニクス
1. 味方軍団の視界範囲に敵軍団が入ると発見
2. 発見は軍団内の任意のメンバーの視界で成立
3. 全軍団間で発見情報を共有

## インターフェース定義

### DiscoverySystem
```typescript
class DiscoverySystem {
  private discoveredArmies: Set<string>; // 発見済み軍団ID
  
  checkDiscovery(observer: Army, targets: Army[], visionSystem: VisionSystem): void
  isDiscovered(armyId: string): boolean
  discoverArmy(armyId: string): void
  resetDiscoveries(): void
  onArmyDiscovered: (army: Army) => void // コールバック
}
```

### Army拡張
```typescript
// Armyクラスに追加
private discovered: boolean = false;

setDiscovered(discovered: boolean): void {
  this.discovered = discovered;
  this.setVisible(discovered || this.isPlayerArmy());
}

isDiscovered(): boolean {
  return this.discovered;
}
```

## テスト方針
- 未発見の敵軍団が非表示であることを確認
- 視界内に入った敵軍団が発見され表示されることを確認
- 一度発見された敵が視界外でも表示継続することを確認
- プレイヤー軍団は常に表示されることを確認

## 未解決事項
- [ ] 視界共有の詳細実装はtask-6-3で対応
- [ ] フォグオブウォーとの連携はtask-6-4で実装