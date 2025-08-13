import { ProductionManager, ProductionItemType } from '../../../src/production/ProductionManager';
import { InventoryManager } from '../../../src/item/InventoryManager';
import { EconomyManager } from '../../../src/economy/EconomyManager';

/**
 * エピック10 task-10-3: 進捗管理と完了処理統合テスト
 */
describe('[エピック10] 進捗管理と完了処理統合テスト', () => {
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
    economyManager.setMoney(10000); // 十分な資金を設定
  });

  afterEach(() => {
    productionManager.destroy();
    inventoryManager.clear();
  });

  describe('進捗データの取得', () => {
    test('生産開始時の進捗データが正しく取得できる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀3個の生産を開始
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 3);

      const progressData = productionManager.getProgressData(baseId);

      expect(progressData[0]).toBeDefined();
      expect(progressData[0]!.itemName).toBe('忍者刀');
      expect(progressData[0]!.completedQuantity).toBe(0);
      expect(progressData[0]!.totalQuantity).toBe(3);
      expect(progressData[0]!.currentItemProgress).toBe(0);
      expect(progressData[0]!.displayText).toBe('忍者刀 0/3');
      expect(progressData[0]!.remainingTime).toBeGreaterThan(0);
    });

    test('生産進行中の進捗データが正しく更新される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀2個の生産を開始
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 2);

      // 30秒経過（50%進捗）
      productionManager.update(30);

      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBeCloseTo(0.5, 2);
      expect(progressData[0]!.completedQuantity).toBe(0);
      expect(progressData[0]!.displayText).toBe('忍者刀 0/2');

      // さらに30秒経過（1個完成）
      productionManager.update(30);

      const progressData2 = productionManager.getProgressData(baseId);
      expect(progressData2[0]!.currentItemProgress).toBe(0);
      expect(progressData2[0]!.completedQuantity).toBe(1);
      expect(progressData2[0]!.displayText).toBe('忍者刀 1/2');
    });

    test('複数ラインの進捗データが個別に管理される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 複数アイテムを並行生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 2);
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 3);
      productionManager.addToQueue(baseId, ProductionItemType.FOOD_PILL, 1);

      const progressData = productionManager.getProgressData(baseId);

      // ライン1: 忍者刀
      expect(progressData[0]!.itemName).toBe('忍者刀');
      expect(progressData[0]!.totalQuantity).toBe(2);

      // ライン2: 手裏剣
      expect(progressData[1]!.itemName).toBe('手裏剣');
      expect(progressData[1]!.totalQuantity).toBe(3);

      // ライン3: 兵糧丸
      expect(progressData[2]!.itemName).toBe('兵糧丸');
      expect(progressData[2]!.totalQuantity).toBe(1);

      // ライン4-6: 空き
      expect(progressData[3]).toBeNull();
      expect(progressData[4]).toBeNull();
      expect(progressData[5]).toBeNull();
    });
  });

  describe('残り時間の計算', () => {
    test('単一アイテムの残り時間が正しく計算される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀1個（60秒）
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);

      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.remainingTime).toBeCloseTo(60, 0);

      // 30秒経過
      productionManager.update(30);

      const progressData2 = productionManager.getProgressData(baseId);
      expect(progressData2[0]!.remainingTime).toBeCloseTo(30, 0);
    });

    test('複数個生産時の残り時間が正しく計算される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 手裏剣3個（80秒×3=240秒）
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 3);

      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.remainingTime).toBeCloseTo(240, 0);

      // 80秒経過（1個完成）
      productionManager.update(80);

      const progressData2 = productionManager.getProgressData(baseId);
      expect(progressData2[0]!.remainingTime).toBeCloseTo(160, 0);

      // さらに80秒経過（2個目完成）
      productionManager.update(80);

      const progressData3 = productionManager.getProgressData(baseId);
      expect(progressData3[0]!.remainingTime).toBeCloseTo(80, 0);
    });
  });

  describe('完了時の自動削除', () => {
    test('生産完了時にキューから自動削除される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 忍者刀1個の生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);

      const queue = productionManager.getQueue(baseId, 0);
      expect(queue).toBeDefined();
      expect(queue!.status).toBe('queued');

      // 60秒経過で完成
      productionManager.update(60);

      // キューから削除される
      const queueAfter = productionManager.getQueue(baseId, 0);
      expect(queueAfter).toBeNull();

      // 進捗データも空になる
      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]).toBeNull();
    });

    test('複数個生産の最後の1個が完成時に削除される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 兵糧丸2個の生産
      productionManager.addToQueue(baseId, ProductionItemType.FOOD_PILL, 2);

      // 120秒経過（1個目完成）
      productionManager.update(120);

      const queue = productionManager.getQueue(baseId, 0);
      expect(queue).toBeDefined();
      expect(queue!.completedQuantity).toBe(1);

      // さらに120秒経過（2個目完成）
      productionManager.update(120);

      // キューから削除される
      const queueAfter = productionManager.getQueue(baseId, 0);
      expect(queueAfter).toBeNull();
    });

    test('複数ラインが独立して削除される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // ライン1: 忍者刀1個（60秒）
      // ライン2: 手裏剣1個（80秒）
      // ライン3: 兵糧丸1個（120秒）
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 1);
      productionManager.addToQueue(baseId, ProductionItemType.FOOD_PILL, 1);

      // 60秒経過：ライン1完了
      productionManager.update(60);

      const queues1 = productionManager.getProductionQueues(baseId);
      expect(queues1[0]).toBeNull(); // ライン1削除
      expect(queues1[1]).toBeDefined(); // ライン2残存
      expect(queues1[2]).toBeDefined(); // ライン3残存

      // さらに20秒経過：ライン2完了
      productionManager.update(20);

      const queues2 = productionManager.getProductionQueues(baseId);
      expect(queues2[0]).toBeNull(); // ライン1削除済み
      expect(queues2[1]).toBeNull(); // ライン2削除
      expect(queues2[2]).toBeDefined(); // ライン3残存

      // さらに40秒経過：ライン3完了
      productionManager.update(40);

      const queues3 = productionManager.getProductionQueues(baseId);
      expect(queues3[0]).toBeNull(); // ライン1削除済み
      expect(queues3[1]).toBeNull(); // ライン2削除済み
      expect(queues3[2]).toBeNull(); // ライン3削除
    });
  });

  describe('表示テキストの生成', () => {
    test('displayTextが正しいフォーマットで生成される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 各種アイテムの生産
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 5);
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 10);
      productionManager.addToQueue(baseId, ProductionItemType.BOW, 99);

      const progressData = productionManager.getProgressData(baseId);

      expect(progressData[0]!.displayText).toBe('忍者刀 0/5');
      expect(progressData[1]!.displayText).toBe('手裏剣 0/10');
      expect(progressData[2]!.displayText).toBe('弓 0/99');
    });

    test('生産進行に応じてdisplayTextが更新される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 3);

      // 初期状態
      let progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.displayText).toBe('忍者刀 0/3');

      // 1個完成
      productionManager.update(60);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.displayText).toBe('忍者刀 1/3');

      // 2個完成
      productionManager.update(60);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.displayText).toBe('忍者刀 2/3');

      // 3個完成（削除される直前）
      productionManager.update(60);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]).toBeNull();
    });
  });

  describe('進捗バーの値', () => {
    test('currentItemProgressが0から1の範囲で正しく計算される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 2);

      // 0%
      let progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBe(0);

      // 25%（15秒/60秒）
      productionManager.update(15);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBeCloseTo(0.25, 2);

      // 50%（30秒/60秒）
      productionManager.update(15);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBeCloseTo(0.5, 2);

      // 75%（45秒/60秒）
      productionManager.update(15);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBeCloseTo(0.75, 2);

      // 100%完成後、次のアイテムは0%から開始
      productionManager.update(15);
      progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBe(0);
      expect(progressData[0]!.completedQuantity).toBe(1);
    });

    test('異なる生産時間のアイテムでも正しく計算される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 手裏剣（80秒）
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 1);

      // 40秒経過（50%）
      productionManager.update(40);
      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]!.currentItemProgress).toBeCloseTo(0.5, 2);
    });
  });

  describe('空きスロットの処理', () => {
    test('空きラインはnullとして返される', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // ライン1のみ使用
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);

      const progressData = productionManager.getProgressData(baseId);
      expect(progressData.length).toBe(6); // 6ライン分
      expect(progressData[0]).toBeDefined(); // ライン1使用中
      expect(progressData[1]).toBeNull(); // ライン2空き
      expect(progressData[2]).toBeNull(); // ライン3空き
      expect(progressData[3]).toBeNull(); // ライン4空き
      expect(progressData[4]).toBeNull(); // ライン5空き
      expect(progressData[5]).toBeNull(); // ライン6空き
    });

    test('完了後のラインは空きになる', () => {
      const baseId = 'base_001';
      productionManager.initializeBase(baseId);

      // 2ラインを使用
      productionManager.addToQueue(baseId, ProductionItemType.NINJA_SWORD, 1);
      productionManager.addToQueue(baseId, ProductionItemType.SHURIKEN, 1);

      // ライン1完了
      productionManager.update(60);

      const progressData = productionManager.getProgressData(baseId);
      expect(progressData[0]).toBeNull(); // ライン1が空きになった
      expect(progressData[1]).toBeDefined(); // ライン2はまだ生産中
    });
  });
});
