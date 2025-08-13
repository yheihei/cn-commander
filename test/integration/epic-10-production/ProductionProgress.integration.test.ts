import { ProductionManager, ProductionItemType } from '../../../src/production/ProductionManager';
import { InventoryManager } from '../../../src/item/InventoryManager';
import { EconomyManager } from '../../../src/economy/EconomyManager';

/**
 * エピック10 task-10-2: 生産進行システム統合テスト
 */
describe('[エピック10] 生産進行システム統合テスト', () => {
  let productionManager: ProductionManager;
  let inventoryManager: InventoryManager;
  let economyManager: EconomyManager;

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
    economyManager = new EconomyManager(mockScene);

    productionManager.setInventoryManager(inventoryManager);
    productionManager.setEconomyManager(economyManager);
  });

  afterEach(() => {
    productionManager.destroy();
    inventoryManager.clear();
  });

  describe('リアルタイム生産進行', () => {
    test('時間経過で生産が進行する', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀1個の生産を開始
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);

      // 30秒経過（半分）
      productionManager.update(30);

      const queue = productionManager.getQueue(baseId, 0);
      expect(queue).toBeDefined();
      expect(queue!.elapsedTime).toBe(30);
      expect(queue!.completedQuantity).toBe(0);
      expect(queue!.status).toBe('producing');

      // さらに30秒経過（合計60秒 = 完成）
      productionManager.update(30);

      expect(queue!.completedQuantity).toBe(1);
      expect(queue!.elapsedTime).toBe(0);
    });

    test('アイテムごとに異なる生産時間で完成する', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 各アイテムを1個ずつ生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1); // 60秒
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 1); // 80秒
      productionManager.addToQueue(baseId, ProductionItemType.BOW, 1); // 100秒
      productionManager.addToQueue(baseId, ProductionItemType.FOOD_PILL, 1); // 120秒

      const queues = productionManager.getProductionQueues(baseId);

      // 60秒経過 - 忍者刀完成
      productionManager.update(60);
      expect(queues[0]).toBeNull(); // 完成して削除
      expect(queues[1]!.completedQuantity).toBe(0); // 手裏剣未完成
      expect(queues[2]!.completedQuantity).toBe(0); // 弓未完成
      expect(queues[3]!.completedQuantity).toBe(0); // 兵糧丸未完成

      // さらに20秒（合計80秒） - 手裏剣完成
      productionManager.update(20);
      expect(queues[1]).toBeNull(); // 完成して削除
      expect(queues[2]!.completedQuantity).toBe(0); // 弓未完成
      expect(queues[3]!.completedQuantity).toBe(0); // 兵糧丸未完成

      // さらに20秒（合計100秒） - 弓完成
      productionManager.update(20);
      expect(queues[2]).toBeNull(); // 完成して削除
      expect(queues[3]!.completedQuantity).toBe(0); // 兵糧丸未完成

      // さらに20秒（合計120秒） - 兵糧丸完成
      productionManager.update(20);
      expect(queues[3]).toBeNull(); // 完成して削除
    });

    test('複数個の生産が順次完成する', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀3個の生産を開始
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 3);

      const queue = productionManager.getQueue(baseId, 0);

      // 60秒経過 - 1個目完成
      productionManager.update(60);
      expect(queue!.completedQuantity).toBe(1);
      expect(queue!.totalQuantity).toBe(3);

      // さらに60秒 - 2個目完成
      productionManager.update(60);
      expect(queue!.completedQuantity).toBe(2);

      // さらに60秒 - 3個目完成、キューから削除
      productionManager.update(60);
      expect(productionManager.getQueue(baseId, 0)).toBeNull();
    });
  });

  describe('資金管理との連携', () => {
    test('アイテム完成時に費用が引き落とされる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      economyManager.setMoney(1000);

      // 忍者刀（300両）を生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);

      // 完成前は資金が減らない
      expect(economyManager.getMoney()).toBe(1000);

      // 60秒経過で完成
      productionManager.update(60);

      // 300両引き落とされる
      expect(economyManager.getMoney()).toBe(700);
    });

    test('資金不足時は生産が一時停止する', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      economyManager.setMoney(100); // 300両必要だが100両しかない

      // 忍者刀（300両）を生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 2);

      const queue = productionManager.getQueue(baseId, 0);

      // 60秒経過
      productionManager.update(60);

      // 資金不足で生産停止
      expect(queue!.completedQuantity).toBe(0);
      expect(queue!.status).toBe('paused');
      expect(economyManager.getMoney()).toBe(100); // 資金は減らない

      // 資金を追加
      economyManager.addIncome(500);
      expect(economyManager.getMoney()).toBe(600);

      // statusをproducingに戻す（手動で再開）
      queue!.status = 'producing';
      queue!.elapsedTime = 0;

      // 60秒経過で1個目完成
      productionManager.update(60);
      expect(queue!.completedQuantity).toBe(1);
      expect(economyManager.getMoney()).toBe(300);

      // さらに60秒で2個目完成
      productionManager.update(60);
      expect(queue!.completedQuantity).toBe(2);
      expect(economyManager.getMoney()).toBe(0);
    });

    test('各アイテムの生産費用が正しく引き落とされる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);
      economyManager.setMoney(2000);

      // 各アイテムを1個ずつ生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1); // 300両
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 1); // 200両
      productionManager.addToQueue(baseId, ProductionItemType.BOW, 1); // 400両
      productionManager.addToQueue(baseId, ProductionItemType.FOOD_PILL, 1); // 50両

      // 忍者刀完成（60秒）
      productionManager.update(60);
      expect(economyManager.getMoney()).toBe(1700); // 2000 - 300

      // 手裏剣完成（+20秒）
      productionManager.update(20);
      expect(economyManager.getMoney()).toBe(1500); // 1700 - 200

      // 弓完成（+20秒）
      productionManager.update(20);
      expect(economyManager.getMoney()).toBe(1100); // 1500 - 400

      // 兵糧丸完成（+20秒）
      productionManager.update(20);
      expect(economyManager.getMoney()).toBe(1050); // 1100 - 50
    });
  });

  describe('倉庫への格納', () => {
    test('完成品が倉庫に格納される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 初期状態の確認
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(0);

      // 忍者刀3個の生産を開始
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 3);

      // 60秒で1個目完成
      productionManager.update(60);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(1);

      // さらに60秒で2個目完成
      productionManager.update(60);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(2);

      // さらに60秒で3個目完成
      productionManager.update(60);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(3);
    });

    test('複数アイテムが並行して生産・格納される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 複数アイテムを並行生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 2);
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 2);

      // 60秒経過
      productionManager.update(60);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(1);
      expect(inventoryManager.getItemCount(ProductionItemType.SHURIKEN)).toBe(0);

      // さらに20秒（合計80秒）
      productionManager.update(20);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(1);
      expect(inventoryManager.getItemCount(ProductionItemType.SHURIKEN)).toBe(1);

      // さらに40秒（合計120秒）
      productionManager.update(40);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(2);
      expect(inventoryManager.getItemCount(ProductionItemType.SHURIKEN)).toBe(1);

      // さらに40秒（合計160秒）
      productionManager.update(40);
      expect(inventoryManager.getItemCount(ProductionItemType.NINJA_SWORD)).toBe(2);
      expect(inventoryManager.getItemCount(ProductionItemType.SHURIKEN)).toBe(2);
    });
  });

  describe('複数拠点での並行生産', () => {
    test('複数拠点で独立して生産が進行する', () => {
      const base1 = 'base_001';
      const base2 = 'base_002';

      productionManager.initializeBase(base1);
      productionManager.initializeBase(base2);

      // 拠点1：忍者刀
      productionManager.addToQueue(base1, ProductionItemType.NINJA_SWORD, 1);

      // 拠点2：手裏剣
      productionManager.addToQueue(base2, ProductionItemType.SHURIKEN, 1);

      // 60秒経過
      productionManager.update(60);

      // 拠点1の忍者刀は完成（60秒）
      const queue1 = productionManager.getQueue(base1, 0);
      expect(queue1).toBeNull(); // 完成して削除

      // 拠点2の手裏剣はまだ（80秒必要）
      const queue2 = productionManager.getQueue(base2, 0);
      expect(queue2!.completedQuantity).toBe(0);
      expect(queue2!.elapsedTime).toBe(60);

      // さらに20秒で拠点2も完成
      productionManager.update(20);
      expect(productionManager.getQueue(base2, 0)).toBeNull();
    });
  });

  describe('進捗データの取得', () => {
    test('生産進捗が正しく計算される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀2個の生産を開始
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 2);

      // 30秒経過（50%進捗）
      productionManager.update(30);

      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]).toBeDefined();
      expect(progressData[0]!.currentItemProgress).toBeCloseTo(0.5, 2);
      expect(progressData[0]!.completedQuantity).toBe(0);
      expect(progressData[0]!.totalQuantity).toBe(2);
      expect(progressData[0]!.displayText).toBe('忍者刀 0/2');

      // 60秒経過で1個完成
      productionManager.update(30);

      const progressData2 = productionManager.getProgressData(baseId);
      expect(progressData2[0]!.currentItemProgress).toBe(0);
      expect(progressData2[0]!.completedQuantity).toBe(1);
      expect(progressData2[0]!.displayText).toBe('忍者刀 1/2');
    });
  });
});
