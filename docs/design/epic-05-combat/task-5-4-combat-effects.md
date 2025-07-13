# [タスク5-4] 戦闘エフェクト

## 概要
- エピック: #5
- タスク: #5-4
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.10

## 設計方針

### 基本方針
- 攻撃タイプごとに異なるエフェクト
- エフェクトの飛翔速度は2マス/秒
- ヒット時は爆発アニメーション表示

### エフェクト種別
1. 斬撃エフェクト（刀剣）
2. 手裏剣エフェクト（飛び道具）
3. ヒットエフェクト（共通）

## インターフェース定義

### CombatEffectManager
```typescript
interface ICombatEffectManager {
  // 攻撃エフェクトを生成
  createAttackEffect(
    attacker: Character,
    target: Character,
    weaponType: string,
    onComplete: () => void
  ): void;
  
  // ヒットエフェクトを生成
  createHitEffect(position: { x: number; y: number }): void;
  
  // エフェクトのプリロード
  preloadEffects(scene: Phaser.Scene): void;
  
  // クリーンアップ
  destroy(): void;
}
```

### EffectConfig
```typescript
interface EffectConfig {
  texture: string;
  frames?: number[];
  duration: number;
  scale?: number;
  rotation?: boolean;
}
```

## データ構造の概要

### エフェクト設定
```typescript
const EFFECT_CONFIGS = {
  slash: {
    texture: 'slash_effect',
    duration: 500,
    scale: 1.0
  },
  shuriken: {
    texture: 'Syuriken',
    duration: 1000,  // 距離に応じて変動
    rotation: true
  },
  hit: {
    texture: 'explode',
    frames: [1, 2, 3, 4, 5, 6, 7],
    duration: 300,
    scale: 1.5
  }
};
```

### アニメーション管理
- Phaser3のTweenシステムを使用
- 飛翔エフェクトは直線移動
- 回転アニメーション（手裏剣）
- フレームアニメーション（爆発）

## テスト方針

### 単体テスト
- エフェクト生成の確認
- タイミング制御の精度
- メモリリークの確認

### 統合テスト
- 戦闘計算との同期
- 複数エフェクトの同時表示
- カメラ範囲外での処理

## 未解決事項
- [ ] エフェクトの重ね順（zIndex）管理
- [ ] パフォーマンス最適化（大量エフェクト時）
- [ ] サウンドエフェクトとの同期