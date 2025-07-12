# [タスク4-2] 移動モード

## 概要
- エピック: #4
- タスク: #4-2
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.3

## 設計方針

### 移動モードの種類
- **通常移動**: 高速移動、攻撃不可
- **戦闘移動**: 低速移動、攻撃可能
- **待機**: 移動しない、攻撃可能、視界ボーナス

### モード別特性
| モード | 移動速度 | 攻撃可否 | 視界補正 | 用途 |
|--------|----------|----------|----------|------|
| 通常移動 | 100% | 不可 | ±0マス | 高速移動、撤退 |
| 戦闘移動 | 60% | 可能 | ±0マス | 攻撃しながら移動 |
| 待機 | 0% | 可能 | +1マス | その場で迎撃 |

## インターフェース定義

### 移動モードシステム
```typescript
enum MovementMode {
  NORMAL = 'normal',    // 通常移動
  COMBAT = 'combat',    // 戦闘移動
  STANDBY = 'standby'   // 待機
}

interface MovementModeConfig {
  speedMultiplier: number;  // 速度倍率
  canAttack: boolean;       // 攻撃可能か
  sightBonus: number;       // 視界ボーナス
}

const MOVEMENT_MODE_CONFIGS: Record<MovementMode, MovementModeConfig> = {
  [MovementMode.NORMAL]: {
    speedMultiplier: 1.0,
    canAttack: false,
    sightBonus: 0
  },
  [MovementMode.COMBAT]: {
    speedMultiplier: 0.6,
    canAttack: true,
    sightBonus: 0
  },
  [MovementMode.STANDBY]: {
    speedMultiplier: 0,
    canAttack: true,
    sightBonus: 1
  }
};
```

### 主要コンポーネント
- **MovementMode**: 移動モードの定義
- **MovementModeConfig**: モード別の設定
- **MovementModeManager**: モードの管理と切り替え

## テスト方針
- 各モードの速度倍率の検証
- 攻撃可否の状態管理テスト
- 視界ボーナスの適用テスト
- モード切り替え時の状態遷移

## 未解決事項
- [ ] 移動中のモード切り替えタイミング
- [ ] 待機モードから他モードへの遷移条件