# [task-3-5] 軍団所属識別システム

## 概要
- エピック: #3
- タスク: #3-5
- 関連要件: 視界・発見システム（エピック6）の前提条件

## 設計方針

### 背景
- 現在、軍団と兵士には所属（味方/敵/中立）を識別する仕組みがない
- ArmyFactoryでcreatePlayerArmy/createEnemyArmyを分けているが、作成後の軍団に所属情報が保持されない
- 視界・発見システムや戦闘システムで敵味方判定が必要

### 設計方針
- MapTypesのBaseDataで既に使用されているowner属性と同じ形式を採用
- 'player' | 'enemy' | 'neutral' の3種類の所属を定義
- 軍団レベルで所属を管理（全メンバーは軍団の所属に従う）

## インターフェース定義

### 型定義の追加

```typescript
// types/CharacterTypes.ts または types/ArmyTypes.ts
export type FactionType = 'player' | 'enemy' | 'neutral';

// types/ArmyTypes.ts
export interface ArmyConfig {
  id: string;
  name: string;
  commander: Character;
  soldiers?: Character[];
  owner: FactionType; // 追加
}

// types/CharacterTypes.ts
export interface CharacterConfig {
  id: string;
  name: string;
  jobType: JobType;
  stats: CharacterStats;
  isCommander?: boolean;
  owner?: FactionType; // 追加（オプション、軍団から継承）
}
```

### Armyクラスの拡張

```typescript
// army/Army.ts
class Army {
  private owner: FactionType;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: ArmyConfig) {
    // ... 既存のコンストラクタ処理
    this.owner = config.owner;
  }
  
  getOwner(): FactionType {
    return this.owner;
  }
  
  isPlayerArmy(): boolean {
    return this.owner === 'player';
  }
  
  isEnemyArmy(): boolean {
    return this.owner === 'enemy';
  }
  
  isNeutralArmy(): boolean {
    return this.owner === 'neutral';
  }
  
  // 他の軍団との敵対関係判定
  isHostileTo(other: Army): boolean {
    if (this.owner === 'neutral' || other.owner === 'neutral') {
      return false; // 中立は誰とも敵対しない
    }
    return this.owner !== other.owner;
  }
  
  // 同盟関係判定
  isAlliedWith(other: Army): boolean {
    return this.owner === other.owner;
  }
}
```

### ArmyFactoryの更新

```typescript
// army/ArmyFactory.ts
class ArmyFactory {
  static createPlayerArmy(...) {
    const army = armyManager.createArmy(commander, x, y, 'player'); // ownerを渡す
  }
  
  static createEnemyArmy(...) {
    const army = armyManager.createArmy(commander, x, y, 'enemy'); // ownerを渡す
  }
}
```

## テスト方針

### 統合テスト項目
1. 軍団作成時の所属設定
   - プレイヤー軍団がowner='player'で作成される
   - 敵軍団がowner='enemy'で作成される

2. 敵味方判定メソッド
   - isPlayerArmy/isEnemyArmy/isNeutralArmyが正しく動作
   - isHostileToが正しい敵対関係を返す
   - isAlliedWithが正しい同盟関係を返す

3. 中立軍団の振る舞い
   - 中立軍団は誰とも敵対しない
   - 将来の拠点占領システムで使用予定

## 未解決事項
- [ ] Characterクラスにもowner属性を持たせるべきか（現在は軍団レベルで管理）
- [ ] 中立軍団の実装は将来のタスクで対応