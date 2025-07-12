# [タスク4-1] 移動指示システム

## 概要
- エピック: #4
- タスク: #4-1
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.4

## 設計方針

### 基本方針
- 最大4地点の経路指定が可能
- 各地点は直線で結ばれる
- 地形を考慮した最短経路ではなく、指定通りの経路を移動
- 軍団の指揮官を左クリックで選択

### 操作フロー
1. 軍団の指揮官を左クリックで選択
2. 移動モードを選択（通常移動/戦闘移動）
3. 最大4地点を順番にクリックして経路を設定
4. 軍団が指定経路に沿って移動開始

## インターフェース定義

### 移動経路システム
```typescript
interface MovementPath {
  waypoints: Position[];  // 最大4地点
  currentIndex: number;   // 現在の目標地点インデックス
}

interface MovementCommand {
  armyId: string;
  mode: MovementMode;
  path: MovementPath;
  startTime: number;
}

interface MovementCommandSystem {
  // 経路指定
  setPath(army: Army, waypoints: Position[], mode: MovementMode): void;
  
  // 現在の移動コマンド取得
  getCommand(armyId: string): MovementCommand | null;
  
  // 移動コマンドのキャンセル
  cancelMovement(armyId: string): void;
}
```

### 主要コンポーネント
- **MovementCommand**: 移動指示データ
- **MovementCommandSystem**: 移動指示の管理システム
- **MovementInputHandler**: マウス入力の処理

## テスト方針
- 経路指定の上限テスト（最大4地点）
- 経路のクリアと再設定
- 移動中の経路変更
- 無効な経路の検証（マップ外等）

## 未解決事項
- [ ] 移動中の経路変更時の挙動
- [ ] 障害物がある場合の処理
- [ ] 他の軍団との衝突時の処理