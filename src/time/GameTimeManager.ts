import * as Phaser from 'phaser';

/**
 * ゲーム時間管理クラス
 * task-1-2で実装
 *
 * ゲーム時間の管理とポーズ機能を提供します。
 * ポーズ中は全てのゲームシステムの時間進行を停止します。
 */
export class GameTimeManager {
  private isPaused: boolean = false;
  private totalElapsedTime: number = 0;
  private scene: Phaser.Scene | null = null;

  /**
   * ゲームをポーズ
   * Phaserの内部タイムシステム（攻撃タイマー、アニメーション等）も停止します。
   */
  public pause(): void {
    this.isPaused = true;
    if (this.scene) {
      this.scene.time.paused = true;
    }
  }

  /**
   * ゲームを再開
   * Phaserの内部タイムシステムも再開します。
   */
  public resume(): void {
    this.isPaused = false;
    if (this.scene) {
      this.scene.time.paused = false;
    }
  }

  /**
   * ポーズ状態を取得
   * @returns ポーズ中の場合true
   */
  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Phaserシーンを設定
   * Phaserの内部タイムシステム（攻撃タイマー等）もポーズ制御するために必要
   * @param scene - Phaserシーン
   */
  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * delta値を処理し、調整されたdelta値を返す
   * ポーズ中は0を返すことで、全てのゲームシステムの時間進行を停止します。
   *
   * @param delta - フレーム間の経過時間（ミリ秒）
   * @returns 調整されたdelta（ポーズ中は0）
   */
  public update(delta: number): number {
    if (this.isPaused) {
      return 0;
    }

    this.totalElapsedTime += delta;
    return delta;
  }

  /**
   * 累積ゲーム時間を取得（ミリ秒）
   * ポーズ中の時間は含まれません。
   *
   * @returns 累積ゲーム時間（ミリ秒）
   */
  public getTotalElapsedTime(): number {
    return this.totalElapsedTime;
  }

  /**
   * 累積ゲーム時間をリセット
   * テストや新規ステージ開始時に使用
   */
  public reset(): void {
    this.totalElapsedTime = 0;
    this.isPaused = false;
    if (this.scene) {
      this.scene.time.paused = false;
    }
  }
}
