import { IItem } from '../types/ItemTypes';

/**
 * 倉庫システムのスタブ実装
 * 全拠点共通のアイテム在庫を管理する
 * 
 * TODO: task-10-3で本格実装に置き換える
 */
export class InventoryManager {
  private static instance: InventoryManager;
  private items: IItem[] = [];

  private constructor() {
    // シングルトンパターン
  }

  public static getInstance(): InventoryManager {
    if (!InventoryManager.instance) {
      InventoryManager.instance = new InventoryManager();
    }
    return InventoryManager.instance;
  }

  /**
   * アイテムを倉庫に追加
   */
  public addItem(item: IItem): void {
    this.items.push(item);
  }

  /**
   * 複数のアイテムを倉庫に追加
   */
  public addItems(items: IItem[]): void {
    this.items.push(...items);
  }

  /**
   * アイテムを倉庫から削除
   */
  public removeItem(item: IItem): boolean {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 倉庫内の全アイテムを取得
   */
  public getAllItems(): IItem[] {
    return [...this.items];
  }

  /**
   * 倉庫内のアイテム数を取得
   */
  public getItemCount(): number {
    return this.items.length;
  }

  /**
   * 倉庫をクリア（テスト用）
   */
  public clear(): void {
    this.items = [];
  }

  /**
   * 倉庫の状態をリセット（テスト用）
   */
  public static resetInstance(): void {
    InventoryManager.instance = undefined as any;
  }
}