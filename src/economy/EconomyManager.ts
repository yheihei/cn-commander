import { Base } from '../base/Base';
import { BaseManager } from '../base/BaseManager';

/**
 * 経済システム管理クラス
 * task-8-1, task-8-2で実装
 */
export class EconomyManager {
  private money: number;
  private accumulatedTime: number = 0;
  private static readonly INCOME_INTERVAL_MS = 60000; // 60秒

  constructor(_scene: Phaser.Scene) {
    // sceneは将来の拡張用に引数として受け取るが、現時点では使用しない
    this.money = 3000; // 初期資金3000両
  }

  /**
   * 現在の所持金を取得
   */
  public getMoney(): number {
    return this.money;
  }

  /**
   * 指定金額を支払えるか確認
   */
  public canAfford(cost: number): boolean {
    return this.money >= cost;
  }

  /**
   * 資金を消費
   * @returns 支払い成功時true、資金不足時false
   */
  public spend(cost: number): boolean {
    if (!this.canAfford(cost)) {
      console.log(`資金不足: 必要${cost}両、所持${this.money}両`);
      return false;
    }
    this.money -= cost;
    console.log(`${cost}両支払い、残高: ${this.money}両`);
    return true;
  }

  /**
   * 収入を追加
   */
  public addIncome(amount: number): void {
    this.money += amount;
  }

  /**
   * テスト用：所持金を設定
   */
  public setMoney(amount: number): void {
    this.money = amount;
  }

  /**
   * 全味方拠点の収入を計算
   * @param bases - BaseManager.getBasesByOwner('player')で取得した拠点リスト
   * @returns 総収入/分
   */
  public calculateIncomePerMinute(bases: Base[]): number {
    return bases.reduce((total, base) => total + base.getIncome(), 0);
  }

  /**
   * ゲームループから呼ばれる更新処理
   * @param delta - 前フレームからの経過時間（ミリ秒）
   * @param baseManager - 拠点情報取得用
   */
  public update(delta: number, baseManager: BaseManager): void {
    this.accumulatedTime += delta;

    // 複数サイクルの収入を処理（大きなdeltaが渡された場合に対応）
    while (this.accumulatedTime >= EconomyManager.INCOME_INTERVAL_MS) {
      this.processIncome(baseManager);
      this.accumulatedTime -= EconomyManager.INCOME_INTERVAL_MS;
    }
  }

  /**
   * 収入処理を実行
   */
  private processIncome(baseManager: BaseManager): void {
    const playerBases = baseManager.getBasesByOwner('player');
    const income = this.calculateIncomePerMinute(playerBases);
    this.addIncome(income);
    console.log(`収入発生: ${income}両（所持金: ${this.money}両）`);
  }
}
