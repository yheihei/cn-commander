# [task-1-2] ゲーム時間管理とポーズシステム

## 概要
- エピック: #1 基盤システム
- タスク: #1-2
- 関連PR/要件: PRD 2.1.1「リアルタイムで進行（一時停止機能あり）」

## 設計方針

### Why（なぜこの設計にしたか）
- **プレイヤー体験の向上**: モーダルUI表示中にゲームが進行すると、プレイヤーが焦りを感じたり、意図しない戦闘結果が生じる
- **時間管理の一元化**: ゲーム時間の管理をGameTimeManagerに集約することで、将来的なゲーム速度調整やリプレイ機能の実装が容易になる
- **既存システムとの互換性**: 各マネージャーは受け取るdeltaが0になるだけで、内部実装の変更は不要

### What（何を実現するか）
1. ゲーム時間の一元管理
2. ポーズ機能（pause/resume）
3. モーダルUI表示時の自動ポーズ
4. 全ゲームシステムの一時停止

## High-level design

### アーキテクチャ概要
```
GameScene
  └─ GameTimeManager ← ポーズ状態を管理
       ├─ update(delta) → 調整されたdelta
       │
       ├─ ArmyManager.update(adjustedDelta)
       ├─ BaseManager.update(adjustedDelta)
       ├─ MovementManager.update(time, adjustedDelta)
       ├─ CombatSystem.update(time, adjustedDelta)
       ├─ ProductionManager.update(adjustedDelta / 1000)
       ├─ EconomyManager.update(adjustedDelta, baseManager)
       └─ UIManager.update()
            └─ isAnyMenuVisible() → 自動ポーズ制御
```

### 主要コンポーネント

#### GameTimeManager
**責務**:
- ゲーム時間の管理
- ポーズ状態の管理
- delta値の調整（ポーズ中は0を返す）

**配置場所**: `src/time/GameTimeManager.ts`

#### UIManager（拡張）
**追加責務**:
- モーダルUI表示状態の監視
- GameTimeManagerへのポーズ/再開指示

## インターフェース定義

### GameTimeManager

```typescript
export class GameTimeManager {
  private isPaused: boolean = false;
  private totalElapsedTime: number = 0; // オプション：累積ゲーム時間

  /**
   * ゲームをポーズ
   */
  public pause(): void;

  /**
   * ゲームを再開
   */
  public resume(): void;

  /**
   * ポーズ状態を取得
   */
  public getIsPaused(): boolean;

  /**
   * delta値を処理
   * @param delta - フレーム間の経過時間（ミリ秒）
   * @returns 調整されたdelta（ポーズ中は0）
   */
  public update(delta: number): number;

  /**
   * 累積ゲーム時間を取得（オプション）
   */
  public getTotalElapsedTime(): number;
}
```

### UIManager（追加メソッド）

```typescript
export class UIManager {
  private gameTimeManager: GameTimeManager | null = null;
  private wasAnyMenuVisible: boolean = false;

  /**
   * GameTimeManagerへの参照を設定
   */
  public setGameTimeManager(gameTimeManager: GameTimeManager): void;

  /**
   * update内でモーダルUI状態を監視し、自動ポーズ制御を実行
   */
  public update(): void {
    // 既存のupdate処理...

    // モーダルUI状態に基づく自動ポーズ制御
    const isAnyMenuVisible = this.isAnyMenuVisible();
    if (isAnyMenuVisible && !this.wasAnyMenuVisible) {
      // メニューが開いた → ポーズ
      this.gameTimeManager?.pause();
    } else if (!isAnyMenuVisible && this.wasAnyMenuVisible) {
      // メニューが閉じた → 再開
      this.gameTimeManager?.resume();
    }
    this.wasAnyMenuVisible = isAnyMenuVisible;
  }
}
```

### GameScene（修正）

```typescript
export class GameScene extends Phaser.Scene {
  private gameTimeManager!: GameTimeManager;

  create(): void {
    // GameTimeManagerの初期化
    this.gameTimeManager = new GameTimeManager();

    // ... 各マネージャーの初期化 ...

    // UIManagerにGameTimeManagerを設定
    this.uiManager.setGameTimeManager(this.gameTimeManager);
  }

  update(time: number, delta: number): void {
    // GameTimeManagerでdeltaを調整
    const adjustedDelta = this.gameTimeManager.update(delta);

    // 調整されたdeltaを各マネージャーに渡す
    this.armyManager.update(time, adjustedDelta);
    this.baseManager.update(adjustedDelta);
    this.movementManager.update(time, adjustedDelta);
    this.combatSystem.update(time, adjustedDelta);
    this.productionManager.update(adjustedDelta / 1000);
    this.economyManager.update(adjustedDelta, this.baseManager);
    this.uiManager.update(); // モーダルUI監視と自動ポーズ制御
  }
}
```

## データ構造

### GameTimeManager内部状態
```typescript
{
  isPaused: boolean,          // ポーズ中かどうか
  totalElapsedTime: number    // 累積ゲーム時間（オプション）
}
```

## テスト方針

### 統合テスト観点
1. **基本動作**
   - pause()でポーズ状態になること
   - resume()でポーズが解除されること
   - getIsPaused()が正しい状態を返すこと

2. **delta調整**
   - ポーズ中はupdate()が0を返すこと
   - 通常時はupdate()が渡されたdeltaを返すこと

3. **モーダルUI連動**
   - モーダルUIが開いたときに自動的にポーズされること
   - モーダルUIが閉じたときに自動的に再開されること

4. **ゲームシステムへの影響**
   - ポーズ中は各マネージャーの時間進行が停止すること
   - 再開後は正常に時間進行すること

## 未解決事項
- [ ] 手動ポーズ機能（キーボードショートカット等）は将来実装
- [ ] ゲーム速度調整機能（2倍速等）は将来実装
- [ ] ポーズ中のUIフィードバック（「一時停止中」表示等）は将来実装
