# [task-7-4-3] 駐留実行処理

## 概要
- エピック: #7 拠点管理システム
- タスク: #7-4-3
- 関連PR/要件: 軍団の駐留状態管理、マップからの非表示化、BaseManager/ArmyManagerへの登録

## 設計方針

### 基本方針
- 駐留中の軍団はマップ上から非表示にし、ゲームループから除外
- 駐留状態は軍団自身が保持し、拠点との関連はBaseManagerで管理
- 駐留/解除の処理はArmyManagerが中央管理

### アーキテクチャの選択
- **状態管理**: Armyクラス内に駐留状態フラグを持たせる（単純明快）
- **可視性制御**: Phaser.GameObjectsのsetVisible()を使用（既存メカニズムの活用）
- **マネージャー連携**: ArmyManagerを中心に、BaseManagerと協調動作

## インターフェース定義

### Army クラスの拡張
```typescript
class Army {
  // 駐留状態管理
  private isGarrisoned: boolean;
  private garrisonedBaseId: string | null;
  
  // 公開メソッド
  setGarrisoned(baseId: string): void;
  ungarrison(): void;
  isGarrisonedAt(baseId: string): boolean;
  getIsGarrisoned(): boolean;
  getGarrisonedBaseId(): string | null;
}
```

### ArmyManager クラスの拡張
```typescript
class ArmyManager {
  // 駐留管理メソッド
  garrisonArmy(army: Army, baseId: string): void;
  ungarrisonArmy(army: Army, position: Position): void;
  getGarrisonedArmies(baseId?: string): Army[];
}
```

### システム連携
- **MovementInputHandler**: 駐留中の軍団を選択不可に
- **Army.update()**: 駐留中は更新処理をスキップ
- **GarrisonSelectionInputHandler**: 拠点選択後、ArmyManagerに処理を委譲

## テスト方針

### 統合テストの観点
1. 駐留実行時に軍団がマップから消えること
2. 駐留中の軍団が選択できないこと
3. 駐留中の軍団が移動・戦闘しないこと
4. BaseManagerに正しく登録されること
5. 駐留解除時に正常に復帰すること（task-7-4-4で実装）

## 未解決事項
- [ ] 駐留中の軍団の戦闘参加（拠点防衛時の扱い）
- [ ] 駐留軍団の最大数制限（現在は無制限）
- [ ] 駐留中の軍団へのアイテム補給機能（後続タスク）