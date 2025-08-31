# [task-7-3] 拠点占領システム

## 概要
- エピック: #7（拠点管理システム）
- タスク: #7-3
- 関連PR/要件: PRD 6.1.6 拠点占領システム

## 設計方針

### 占領の基本フロー
1. 軍団が敵拠点/中立拠点のHPを0まで減らす
2. 3マス以内の軍団が「占領」コマンドを選択
3. 拠点の所有者が変更され、占領軍団が自動的に駐留
4. 拠点のHPが占領軍団の合計HPまで回復

### 既存システムとの連携
- Base.changeOwner()メソッドを活用して所有者変更
- ArmyManager.garrisonArmy()を活用して自動駐留
- ActionMenuに占領コマンドを追加

## インターフェース定義

### UIManager
```typescript
// 占領コマンドの表示条件判定
canOccupyBase(army: Army): Base | null

// 占領実行
executeOccupation(army: Army, base: Base): void
```

### ActionMenu
```typescript
// 占領ボタンの追加
occupyButton?: Phaser.GameObjects.Container
onOccupyCallback?: () => void
canOccupy: boolean
```

### BaseManager
```typescript
// 占領処理
occupyBase(base: Base, army: Army): void {
  // 1. 所有者変更
  // 2. HP回復（軍団の合計HP）
  // 3. 敵兵士の処理
  // 4. 生産中アイテムの破棄
}

// 占領可能判定
canBeOccupied(base: Base, army: Army): boolean
```

### ArmyManager
```typescript
// 占領可能な拠点の取得
getOccupiableBase(army: Army): Base | null {
  // 1. 3マス以内の拠点を探す
  // 2. HP=0の敵/中立拠点を返す
}
```

## データ構造の概要

### 占領時の状態変更
- BaseType: NEUTRAL → PLAYER_OCCUPIED / ENEMY_OCCUPIED
- owner: 'enemy' → 'player' / 'player' → 'enemy'
- hp: 0 → 占領軍団の合計HP
- 待機兵士: 全員削除
- 生産中アイテム: 全キャンセル

### 軍団の状態変更
- isGarrisoned: false → true
- position: マップ上 → 拠点内

## テスト方針

### 統合テストの観点
1. 占領可能条件の判定テスト
   - HP=0の拠点のみ占領可能
   - 3マス以内判定
   - 味方拠点は占領不可

2. 占領実行テスト
   - 所有者変更の確認
   - HP回復（軍団合計HP）の確認
   - 軍団の自動駐留確認

3. 占領時の処理テスト
   - 敵兵士の削除確認
   - 生産中アイテムのキャンセル確認

## 未解決事項
- [ ] 占領アニメーションの実装（将来的な改善）
- [ ] 占領完了時の効果音（将来的な改善）
- [ ] 占領中の中断処理（現在は即座に完了）