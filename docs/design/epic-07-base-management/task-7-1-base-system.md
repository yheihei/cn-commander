# [タスク7-1] 拠点基本システム

## 概要
- エピック: #7
- タスク: #7-1
- 関連PR/要件: 拠点の種類定義、基本属性、ビジュアル表示

## 設計方針

### 基本概念
- 拠点は戦略的な重要地点として機能
- 収入源であり、軍団の生産・補給拠点
- 占領により所属が変更可能

### 技術選定
- Phaser3のGameObjectsを継承した実装
- 既存のマップシステムと統合
- タイルマップ上の特定位置に配置

## インターフェース定義

### BaseType（拠点種類）
```typescript
enum BaseType {
  PLAYER_HQ = 'player_hq',      // 味方本拠地
  ENEMY_HQ = 'enemy_hq',        // 敵本拠地
  NEUTRAL = 'neutral',          // 中立拠点
  PLAYER_OCCUPIED = 'player_occupied',  // 味方占領拠点
  ENEMY_OCCUPIED = 'enemy_occupied'     // 敵占領拠点
}
```

### BaseData（拠点データ）
```typescript
interface BaseData {
  id: string;
  name: string;
  type: BaseType;
  position: { x: number; y: number };  // タイル座標
  maxHp: number;
  currentHp: number;
  income: number;  // 両/分
  owner: 'player' | 'enemy' | 'neutral';
  facilities: FacilityType[];  // 利用可能施設
}
```

### Base（拠点クラス）
```typescript
class Base extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, data: BaseData);
  
  // 基本機能
  getId(): string;
  getName(): string;
  getType(): BaseType;
  getPosition(): { x: number; y: number };
  getOwner(): string;
  
  // HP管理
  getMaxHp(): number;
  getCurrentHp(): number;
  takeDamage(amount: number): void;
  heal(amount: number): void;
  
  // 所属変更
  changeOwner(newOwner: 'player' | 'enemy'): void;
  
  // 収入
  getIncome(): number;
  
  // ビジュアル
  updateVisual(): void;
}
```

### BaseManager（拠点管理）
```typescript
class BaseManager {
  constructor(scene: Phaser.Scene, mapManager: MapManager);
  
  // 拠点の追加・取得
  addBase(baseData: BaseData): Base;
  getBase(id: string): Base | null;
  getAllBases(): Base[];
  getBasesByOwner(owner: string): Base[];
  getBaseAtPosition(x: number, y: number): Base | null;
  
  // 収入計算
  calculateIncome(owner: 'player' | 'enemy'): number;
  
  // 更新
  update(deltaTime: number): void;
  destroy(): void;
}
```

## ビジュアル仕様

### スプライトの選択
- 味方本拠地: 青い屋根の城（pipo-map001.png内）
- 敵本拠地: 紫の城
- 中立拠点: 灰色の石造りの城
- 占領拠点: 所属に応じて色を変更

### 表示要素
- 拠点スプライト（2x2タイルサイズ）
- HP バー（拠点上部に表示）
- 所属フラグ（味方/敵/中立を示すアイコン）
- 拠点名（ホバー時に表示）

## テスト方針
- 拠点の生成と配置
- 所属変更時の処理
- HP管理とダメージ処理
- 収入計算の正確性
- ビジュアル更新の確認

## 未解決事項
- [ ] 拠点のサイズ（2x2タイルか3x3タイルか）
- [ ] 拠点のアニメーション要否
- [ ] 施設システムの詳細実装（task-7-4で対応予定）