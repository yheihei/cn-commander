import Phaser from 'phaser';
import { InventoryManager } from '../item/InventoryManager';
import { EconomyManager } from '../economy/EconomyManager';

/**
 * 生産アイテムタイプ
 */
export enum ProductionItemType {
  NINJA_SWORD = 'NINJA_SWORD', // 忍者刀
  SHURIKEN = 'SHURIKEN', // 手裏剣
  BOW = 'BOW', // 弓
  FOOD_PILL = 'FOOD_PILL', // 兵糧丸
}

/**
 * 生産アイテム定義
 */
export interface ProductionItemDefinition {
  type: ProductionItemType;
  name: string;
  category: 'weapon' | 'consumable';
  productionTime: number; // 秒単位（リードタイム）
  productionCost: number; // 両単位
}

/**
 * 生産キュー
 */
export interface ProductionQueue {
  itemType: ProductionItemType;
  totalQuantity: number; // 生産指示合計数
  completedQuantity: number; // 現在生産数
  lineIndex: number; // ライン番号（0-5）
  status: 'queued' | 'producing' | 'paused' | 'completed';
  elapsedTime: number; // 現在アイテムの経過時間（秒）
}

/**
 * 生産進捗情報
 */
export interface ProductionProgress {
  itemName: string;
  completedQuantity: number;
  totalQuantity: number;
  currentItemProgress: number; // 現在アイテムの進捗（0-1）
  remainingTime: number; // 全体の残り時間（秒）
  displayText: string; // "忍者刀 5/20"
}

/**
 * 生産管理システム
 * task-10-1: 生産開始フロー実装
 */
export class ProductionManager {
  private inventoryManager: InventoryManager | null = null;
  private economyManager: EconomyManager | null = null;

  // 拠点ごとの生産ライン（最大6ライン/拠点）
  private productionLines: Map<string, (ProductionQueue | null)[]> = new Map();

  // 生産可能アイテムの定義
  private readonly productionItems: Map<ProductionItemType, ProductionItemDefinition> = new Map([
    [
      ProductionItemType.NINJA_SWORD,
      {
        type: ProductionItemType.NINJA_SWORD,
        name: '忍者刀',
        category: 'weapon',
        productionTime: 60,
        productionCost: 300,
      },
    ],
    [
      ProductionItemType.SHURIKEN,
      {
        type: ProductionItemType.SHURIKEN,
        name: '手裏剣',
        category: 'weapon',
        productionTime: 80,
        productionCost: 200,
      },
    ],
    [
      ProductionItemType.BOW,
      {
        type: ProductionItemType.BOW,
        name: '弓',
        category: 'weapon',
        productionTime: 100,
        productionCost: 400,
      },
    ],
    [
      ProductionItemType.FOOD_PILL,
      {
        type: ProductionItemType.FOOD_PILL,
        name: '兵糧丸',
        category: 'consumable',
        productionTime: 120,
        productionCost: 50,
      },
    ],
  ]);

  constructor(_scene: Phaser.Scene) {
    // sceneは将来の拡張用に引数として受け取るが、現時点では使用しない
  }

  /**
   * InventoryManagerを設定
   */
  public setInventoryManager(inventoryManager: InventoryManager): void {
    this.inventoryManager = inventoryManager;
  }

  /**
   * EconomyManagerを設定
   */
  public setEconomyManager(economyManager: EconomyManager): void {
    this.economyManager = economyManager;
  }

  /**
   * 拠点の初期化
   */
  public initializeBase(baseId: string): void {
    if (!this.productionLines.has(baseId)) {
      // 6つの空きラインを作成
      const lines: (ProductionQueue | null)[] = new Array(6).fill(null);
      this.productionLines.set(baseId, lines);
    }
  }

  /**
   * 生産可能アイテムリストを取得
   */
  public getProductionItems(): ProductionItemDefinition[] {
    return Array.from(this.productionItems.values());
  }

  /**
   * 生産をキューに追加（task-10-1の主要機能）
   * @param baseId 拠点ID
   * @param itemType アイテムタイプ
   * @param quantity 生産数量
   * @returns 成功時はライン番号、失敗時はnull
   */
  public addToQueue(baseId: string, itemType: ProductionItemType, quantity: number): number | null {
    // 拠点の初期化チェック
    if (!this.productionLines.has(baseId)) {
      this.initializeBase(baseId);
    }

    const lines = this.productionLines.get(baseId)!;

    // 空きラインを探す
    const availableIndex = lines.findIndex((line) => line === null);
    if (availableIndex === -1) {
      console.warn(`No available production lines for base ${baseId}`);
      return null;
    }

    // 数量チェック（1-99）
    if (quantity < 1 || quantity > 99) {
      console.warn(`Invalid quantity: ${quantity}. Must be between 1 and 99.`);
      return null;
    }

    // アイテム定義の確認
    const itemDef = this.productionItems.get(itemType);
    if (!itemDef) {
      console.warn(`Unknown item type: ${itemType}`);
      return null;
    }

    // 新しいキューを作成（初期状態：0/指定数）
    const newQueue: ProductionQueue = {
      itemType,
      totalQuantity: quantity,
      completedQuantity: 0, // 初期値は0
      lineIndex: availableIndex,
      status: 'queued',
      elapsedTime: 0,
    };

    // ラインに追加
    lines[availableIndex] = newQueue;

    console.log(`Added production to line ${availableIndex + 1}: ${itemDef.name} 0/${quantity}`);

    return availableIndex;
  }

  /**
   * 空きラインがあるか確認
   */
  public hasAvailableSlot(baseId: string): boolean {
    if (!this.productionLines.has(baseId)) {
      this.initializeBase(baseId);
    }

    const lines = this.productionLines.get(baseId)!;
    return lines.some((line) => line === null);
  }

  /**
   * 利用可能なライン番号を取得
   */
  public getAvailableSlotIndex(baseId: string): number {
    if (!this.productionLines.has(baseId)) {
      this.initializeBase(baseId);
    }

    const lines = this.productionLines.get(baseId)!;
    const index = lines.findIndex((line) => line === null);
    return index;
  }

  /**
   * 生産キューを取得
   */
  public getProductionQueues(baseId: string): (ProductionQueue | null)[] {
    if (!this.productionLines.has(baseId)) {
      this.initializeBase(baseId);
    }

    return this.productionLines.get(baseId)!;
  }

  /**
   * 特定のキューを取得
   */
  public getQueue(baseId: string, lineIndex: number): ProductionQueue | null {
    const queues = this.getProductionQueues(baseId);
    if (lineIndex < 0 || lineIndex >= queues.length) {
      return null;
    }
    return queues[lineIndex];
  }

  /**
   * 生産キューの進捗情報を取得（表示用）
   */
  public getProgressData(baseId: string): (ProductionProgress | null)[] {
    const queues = this.getProductionQueues(baseId);

    return queues.map((queue) => {
      if (!queue) return null;

      const itemDef = this.productionItems.get(queue.itemType)!;
      const currentProgress = queue.elapsedTime / itemDef.productionTime;
      const remainingItems = queue.totalQuantity - queue.completedQuantity;
      const remainingTime = (remainingItems - currentProgress) * itemDef.productionTime;

      return {
        itemName: itemDef.name,
        completedQuantity: queue.completedQuantity,
        totalQuantity: queue.totalQuantity,
        currentItemProgress: currentProgress,
        remainingTime: Math.max(0, remainingTime),
        displayText: `${itemDef.name} ${queue.completedQuantity}/${queue.totalQuantity}`,
      };
    });
  }

  /**
   * 更新処理（task-10-2で実装）
   * GameSceneから毎フレーム呼び出される
   */
  public update(deltaTime: number): void {
    // 全拠点の生産ラインを処理
    for (const [, lines] of this.productionLines) {
      for (let i = 0; i < lines.length; i++) {
        const queue = lines[i];
        if (!queue || queue.status === 'completed' || queue.status === 'paused') {
          continue;
        }

        // 生産を開始
        if (queue.status === 'queued') {
          queue.status = 'producing';
        }

        // 経過時間を進める
        queue.elapsedTime += deltaTime;

        // アイテム定義を取得
        const itemDef = this.productionItems.get(queue.itemType);
        if (!itemDef) {
          continue;
        }

        // リードタイムに達したか確認
        if (queue.elapsedTime >= itemDef.productionTime) {
          // 資金チェック
          if (this.economyManager && this.economyManager.canAfford(itemDef.productionCost)) {
            // 費用を引き落とし
            this.economyManager.spend(itemDef.productionCost);

            // 倉庫に追加
            if (this.inventoryManager) {
              this.inventoryManager.addItem(queue.itemType, 1);
            }

            // 完成数を増やす
            queue.completedQuantity++;

            // 経過時間をリセット
            queue.elapsedTime = 0;

            console.log(
              `生産完了: ${itemDef.name} (${queue.completedQuantity}/${queue.totalQuantity})`,
            );

            // 全数完成したら削除
            if (queue.completedQuantity >= queue.totalQuantity) {
              lines[i] = null;
              console.log(`ライン${i + 1}の生産が全て完了しました`);
            }
          } else {
            // 資金不足で一時停止
            queue.status = 'paused';
            console.log(`資金不足で生産一時停止: ${itemDef.name}`);
          }
        }
      }
    }
  }

  /**
   * キャンセル処理（task-10-4で実装）
   */
  public cancelProduction(baseId: string, lineIndex: number): boolean {
    // task-10-4で実装
    console.log(`Cancel production: base=${baseId}, line=${lineIndex}`);
    return false;
  }

  /**
   * リソースのクリーンアップ
   */
  public destroy(): void {
    this.productionLines.clear();
  }
}
