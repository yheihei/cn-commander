# [タスク4-4] 移動処理

## 概要
- エピック: #4
- タスク: #4-4
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.4

## 設計方針

### 移動処理の基本
- 経路に沿った段階的な移動
- 各地点間は直線移動
- フレームごとの座標更新
- 地形コストを考慮した速度調整

### 移動処理フロー
1. 現在位置から次の目標地点を取得
2. 移動速度と経過時間から移動距離を計算
3. 目標地点への方向ベクトルを計算
4. 新しい位置を計算して更新
5. 目標地点到達時は次の地点へ切り替え

## インターフェース定義

### 移動処理システム
```typescript
interface MovementProcessor {
  // 軍団の移動を更新
  updateMovement(
    army: Army,
    deltaTime: number,
    mapManager: MapManager
  ): void;
  
  // 目標地点への移動処理
  moveTowardsTarget(
    army: Army,
    target: Position,
    speed: number,
    deltaTime: number
  ): boolean; // 到達したらtrue
  
  // 現在地の地形を取得
  getCurrentTerrain(army: Army, mapManager: MapManager): TileType;
}

interface MovementState {
  isMoving: boolean;
  currentPath: MovementPath;
  currentSpeed: number;      // 現在の移動速度（ピクセル/秒）
  mode: MovementMode;
  lastTerrainType: TileType; // 速度再計算用
}
```

### 座標更新ロジック
```typescript
// 1フレームあたりの移動処理
function updatePosition(army: Army, deltaTime: number) {
  const target = getCurrentTarget(army);
  const distance = calculateDistance(army.position, target);
  const moveDistance = army.currentSpeed * (deltaTime / 1000);
  
  if (distance <= moveDistance) {
    // 目標地点に到達
    army.setPosition(target);
    // 次の地点へ
    advanceToNextWaypoint(army);
  } else {
    // 目標地点へ向かって移動
    const direction = normalize(target - army.position);
    army.x += direction.x * moveDistance;
    army.y += direction.y * moveDistance;
  }
}
```

### 主要コンポーネント
- **MovementProcessor**: 移動処理の実行クラス
- **MovementState**: 軍団の移動状態管理
- **座標計算**: ベクトル演算による位置更新

## テスト方針
- 直線移動の精度検証
- 複数地点の経路追従
- 地形変化時の速度調整
- 到達判定の精度

## 未解決事項
- [ ] 移動中の衝突処理
- [ ] 移動不可地形への対応
- [ ] 軍団同士の重なり防止