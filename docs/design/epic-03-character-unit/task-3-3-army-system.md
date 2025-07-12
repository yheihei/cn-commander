# [タスク3-3] 軍団システム

## 概要
- エピック: #3
- タスク: #3-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.2

## 設計方針

### 基本方針
- 1軍団 = 指揮官1名 + 一般兵3名（合計4名）
- 軍団は操作の基本単位
- 各メンバーは個別のHPと能力値を保持
- 最大6軍団まで同時出撃可能

### 軍団の特性
- 移動：軍団単位で行動（全員が一緒に移動）
- 移動速度：構成メンバーの平均値
- 視界：各メンバーが個別に視界を持つ
- 戦闘：各メンバーが個別に攻撃
- 消滅条件：全メンバーのHPが0

## インターフェース定義

### 軍団システム
```typescript
interface Army {
  id: string;
  name: string;
  commander: Character;
  soldiers: Character[]; // 最大3名
  
  // 軍団の状態
  isActive(): boolean;
  getMemberCount(): number;
  getAliveMembers(): Character[];
  
  // 軍団能力値（計算値）
  getAverageMovementSpeed(): number;
  getTotalSight(): SightArea[];
  
  // 軍団操作
  moveTo(position: Position): void;
  setFormation(formation: FormationType): void;
  
  // メンバー管理
  addSoldier(soldier: Character): boolean;
  removeSoldier(soldierId: string): void;
}

interface ArmyManager {
  armies: Map<string, Army>;
  maxArmies: number; // 6
  
  createArmy(commander: Character): Army;
  disbandArmy(armyId: string): void;
  getActiveArmies(): Army[];
}
```

### 主要コンポーネント
- **Army**: 軍団クラス
- **ArmyManager**: 軍団管理システム
- **ArmyFactory**: テスト用の軍団生成ファクトリ

## テスト方針
- 軍団編成の制限テスト（指揮官必須、最大人数）
- 移動速度計算の検証
- 視界システムとの連携テスト
- 軍団消滅条件のテスト

## 未解決事項
- [ ] 軍団のフォーメーション詳細
- [ ] 軍団間の衝突判定
- [ ] 軍団の表示方法（4人をどう表現するか）