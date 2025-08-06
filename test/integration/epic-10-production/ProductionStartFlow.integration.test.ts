import { ProductionManager, ProductionItemType } from '../../../src/production/ProductionManager';
import { InventoryManager } from '../../../src/item/InventoryManager';

/**
 * エピック10 task-10-1: 生産開始フロー統合テスト
 */
describe('[エピック10] 生産開始フロー統合テスト', () => {
  let productionManager: ProductionManager;
  let inventoryManager: InventoryManager;
  const mockScene = {
    add: {
      existing: jest.fn(),
    },
    registry: {
      get: jest.fn(),
      set: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    productionManager = new ProductionManager(mockScene);
    inventoryManager = new InventoryManager(mockScene);
    productionManager.setInventoryManager(inventoryManager);
  });

  afterEach(() => {
    productionManager.destroy();
  });

  describe('生産アイテムの取得', () => {
    test('生産可能アイテムリストを取得できる', () => {
      const items = productionManager.getProductionItems();
      
      expect(items).toHaveLength(4);
      
      // 忍者刀の確認
      const ninjaSword = items.find(item => item.type === ProductionItemType.NINJA_SWORD);
      expect(ninjaSword).toBeDefined();
      expect(ninjaSword!.name).toBe('忍者刀');
      expect(ninjaSword!.productionCost).toBe(300);
      expect(ninjaSword!.productionTime).toBe(60);
      
      // 手裏剣の確認
      const shuriken = items.find(item => item.type === ProductionItemType.SHURIKEN);
      expect(shuriken).toBeDefined();
      expect(shuriken!.name).toBe('手裏剣');
      expect(shuriken!.productionCost).toBe(200);
      
      // 弓の確認
      const bow = items.find(item => item.type === ProductionItemType.BOW);
      expect(bow).toBeDefined();
      expect(bow!.name).toBe('弓');
      expect(bow!.productionCost).toBe(400);
      
      // 兵糧丸の確認
      const foodPill = items.find(item => item.type === ProductionItemType.FOOD_PILL);
      expect(foodPill).toBeDefined();
      expect(foodPill!.name).toBe('兵糧丸');
      expect(foodPill!.productionCost).toBe(50);
    });
  });

  describe('拠点の初期化', () => {
    test('拠点を初期化すると6つの空きラインが作成される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      const queues = productionManager.getProductionQueues(baseId);
      expect(queues).toHaveLength(6);
      
      // 全てのラインが空きであることを確認
      queues.forEach(queue => {
        expect(queue).toBeNull();
      });
    });

    test('空きラインの確認ができる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      expect(productionManager.hasAvailableSlot(baseId)).toBe(true);
      expect(productionManager.getAvailableSlotIndex(baseId)).toBe(0);
    });
  });

  describe('キューへの追加（0/指定数形式）', () => {
    test('アイテムをキューに追加できる（初期状態は0/指定数）', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      // 忍者刀20個の生産を追加
      const lineIndex = productionManager.addToQueue(
        baseId,
        ProductionItemType.NINJA_SWORD,
        20
      );
      
      expect(lineIndex).toBe(0);
      
      // キューの確認
      const queue = productionManager.getQueue(baseId, 0);
      expect(queue).toBeDefined();
      expect(queue!.itemType).toBe(ProductionItemType.NINJA_SWORD);
      expect(queue!.totalQuantity).toBe(20);
      expect(queue!.completedQuantity).toBe(0); // 初期値は0
      expect(queue!.status).toBe('queued');
    });

    test('複数のアイテムを異なるラインに追加できる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      // 1つ目：忍者刀10個
      const line1 = productionManager.addToQueue(
        baseId,
        ProductionItemType.NINJA_SWORD,
        10
      );
      expect(line1).toBe(0);
      
      // 2つ目：手裏剣5個
      const line2 = productionManager.addToQueue(
        baseId,
        ProductionItemType.SHURIKEN,
        5
      );
      expect(line2).toBe(1);
      
      // 3つ目：兵糧丸99個（最大数）
      const line3 = productionManager.addToQueue(
        baseId,
        ProductionItemType.FOOD_PILL,
        99
      );
      expect(line3).toBe(2);
      
      // 各キューの確認
      const queues = productionManager.getProductionQueues(baseId);
      expect(queues[0]!.completedQuantity).toBe(0);
      expect(queues[0]!.totalQuantity).toBe(10);
      expect(queues[1]!.completedQuantity).toBe(0);
      expect(queues[1]!.totalQuantity).toBe(5);
      expect(queues[2]!.completedQuantity).toBe(0);
      expect(queues[2]!.totalQuantity).toBe(99);
    });

    test('6ライン全て使用した場合は追加できない', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      // 6つのラインを全て使用
      for (let i = 0; i < 6; i++) {
        const result = productionManager.addToQueue(
          baseId,
          ProductionItemType.NINJA_SWORD,
          1
        );
        expect(result).toBe(i);
      }
      
      // 7つ目は追加できない
      const result = productionManager.addToQueue(
        baseId,
        ProductionItemType.SHURIKEN,
        1
      );
      expect(result).toBeNull();
      expect(productionManager.hasAvailableSlot(baseId)).toBe(false);
    });

    test('数量が範囲外の場合は追加できない', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      // 0個は無効
      let result = productionManager.addToQueue(
        baseId,
        ProductionItemType.NINJA_SWORD,
        0
      );
      expect(result).toBeNull();
      
      // 100個は無効（最大99）
      result = productionManager.addToQueue(
        baseId,
        ProductionItemType.NINJA_SWORD,
        100
      );
      expect(result).toBeNull();
      
      // 負数は無効
      result = productionManager.addToQueue(
        baseId,
        ProductionItemType.NINJA_SWORD,
        -1
      );
      expect(result).toBeNull();
    });
  });

  describe('進捗表示データの取得', () => {
    test('キューの進捗データを「アイテム名 0/数量」形式で取得できる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      
      // 忍者刀20個と手裏剣10個を追加
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 20);
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 10);
      
      const progressData = productionManager.getProgressData(baseId);
      
      expect(progressData).toHaveLength(6);
      
      // 1つ目のライン
      expect(progressData[0]).toBeDefined();
      expect(progressData[0]!.itemName).toBe('忍者刀');
      expect(progressData[0]!.completedQuantity).toBe(0);
      expect(progressData[0]!.totalQuantity).toBe(20);
      expect(progressData[0]!.displayText).toBe('忍者刀 0/20');
      
      // 2つ目のライン
      expect(progressData[1]).toBeDefined();
      expect(progressData[1]!.itemName).toBe('手裏剣');
      expect(progressData[1]!.completedQuantity).toBe(0);
      expect(progressData[1]!.totalQuantity).toBe(10);
      expect(progressData[1]!.displayText).toBe('手裏剣 0/10');
      
      // 残りは空き
      for (let i = 2; i < 6; i++) {
        expect(progressData[i]).toBeNull();
      }
    });
  });

  describe('複数拠点の管理', () => {
    test('複数の拠点で独立した生産ラインを管理できる', () => {
      const base1 = 'base_001';
      const base2 = 'base_002';
      
      productionManager.initializeBase(base1);
      productionManager.initializeBase(base2);
      
      // 拠点1に忍者刀を追加
      productionManager.addToQueue(base1, ProductionItemType.NINJA_SWORD, 10);
      
      // 拠点2に手裏剣を追加
      productionManager.addToQueue(base2, ProductionItemType.SHURIKEN, 5);
      
      // それぞれ独立していることを確認
      const queues1 = productionManager.getProductionQueues(base1);
      const queues2 = productionManager.getProductionQueues(base2);
      
      expect(queues1[0]!.itemType).toBe(ProductionItemType.NINJA_SWORD);
      expect(queues2[0]!.itemType).toBe(ProductionItemType.SHURIKEN);
      
      // 拠点1は1ライン使用、拠点2も1ライン使用
      expect(productionManager.hasAvailableSlot(base1)).toBe(true);
      expect(productionManager.hasAvailableSlot(base2)).toBe(true);
      expect(productionManager.getAvailableSlotIndex(base1)).toBe(1);
      expect(productionManager.getAvailableSlotIndex(base2)).toBe(1);
    });
  });
});