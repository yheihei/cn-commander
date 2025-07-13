# [タスク5-2] 攻撃間隔システム

## 概要
- エピック: #5
- タスク: #5-2
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.7

## 設計方針

### 基本方針
- 各キャラクターが独立した攻撃タイマーを持つ
- 攻撃間隔は「90 / 速さ」秒で計算
- 戦闘移動/待機モード時のみ攻撃可能

### タイマー管理
- Phaser3のタイマーシステムを活用
- 各メンバーごとに個別のタイマーインスタンス
- モード変更時にタイマーをリセット

## インターフェース定義

### AttackTimer
```typescript
interface IAttackTimer {
  // タイマーを開始
  start(character: Character, onAttack: () => void): void;
  
  // タイマーを停止
  stop(character: Character): void;
  
  // タイマーをリセット
  reset(character: Character): void;
  
  // 攻撃間隔を取得（ミリ秒）
  getAttackInterval(character: Character): number;
  
  // 次の攻撃までの残り時間を取得
  getRemainingTime(character: Character): number;
}
```

### AttackTimerManager
```typescript
interface IAttackTimerManager {
  // 軍団の全メンバーのタイマーを管理
  startArmyAttackTimers(army: Army): void;
  stopArmyAttackTimers(army: Army): void;
  
  // 個別メンバーのタイマー管理
  updateCharacterTimer(character: Character): void;
  
  // クリーンアップ
  destroy(): void;
}
```

## データ構造の概要

### タイマー情報
```typescript
interface TimerInfo {
  character: Character;
  timer: Phaser.Time.TimerEvent;
  lastAttackTime: number;
  attackInterval: number;
}
```

### 攻撃間隔の計算
- 基本式: `間隔（ミリ秒） = (90 / 速さ) * 1000`
- 速さ20の場合: 4.5秒
- 速さ15の場合: 6秒
- 速さ10の場合: 9秒

## テスト方針

### 単体テスト
- 攻撃間隔の計算精度
- タイマーの開始/停止
- 複数キャラクターの同時管理

### 統合テスト
- MovementModeとの連携（通常移動時は攻撃不可）
- キャラクター撃破時のタイマー処理
- メモリリークの確認

## 未解決事項
- [ ] 武器切り替え時のタイマー処理
- [ ] スキル使用時の攻撃間隔への影響
- [ ] ポーズ/再開時のタイマー管理