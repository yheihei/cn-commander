/**
 * 経済システム管理クラス（スタブ実装）
 * task-8-1で本格実装予定
 */
export class EconomyManager {
  private money: number;

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
}
