import Phaser from 'phaser';

/**
 * 倉庫管理システム（最小実装）
 * task-10-5で本格実装予定
 */
export class InventoryManager {
  private scene: Phaser.Scene;
  private inventory: Map<string, number> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene; // Will be used in task-10-5
  }

  /**
   * アイテムを追加
   */
  public addItem(itemId: string, quantity: number = 1): void {
    const current = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, current + quantity);
  }

  /**
   * アイテムを削除
   */
  public removeItem(itemId: string, quantity: number = 1): boolean {
    const current = this.inventory.get(itemId) || 0;
    if (current < quantity) {
      return false;
    }
    this.inventory.set(itemId, current - quantity);
    return true;
  }

  /**
   * アイテム数を取得
   */
  public getItemCount(itemId: string): number {
    return this.inventory.get(itemId) || 0;
  }

  /**
   * 全アイテムを取得
   */
  public getAllItems(): Map<string, number> {
    return new Map(this.inventory);
  }

  /**
   * クリア
   */
  public clear(): void {
    this.inventory.clear();
  }

  /**
   * 初期化（task-10-5で実装）
   */
  public initialize(): void {
    // this.scene will be used in task-10-5
    if (this.scene) {
      // TODO: task-10-5で実装
    }
  }
}
