/**
 * [エピック8] 経済システム統合テスト
 */
import { EconomyManager } from '../../../src/economy/EconomyManager';
import { BaseManager } from '../../../src/base/BaseManager';
import { BaseType } from '../../../src/types/BaseTypes';

describe('[エピック8] EconomySystem Integration Tests', () => {
  let economyManager: EconomyManager;
  let baseManager: BaseManager;
  let mockScene: any;

  beforeEach(() => {
    // モックシーンを作成
    mockScene = {
      add: {
        existing: jest.fn(),
        sprite: jest.fn().mockReturnValue({
          setDisplaySize: jest.fn(),
          destroy: jest.fn(),
        }),
        rectangle: jest.fn().mockReturnValue({
          destroy: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
          destroy: jest.fn(),
        }),
        container: jest.fn().mockReturnValue({
          destroy: jest.fn(),
        }),
        group: jest.fn().mockReturnValue({
          destroy: jest.fn(),
        }),
      },
      cameras: {
        main: {
          width: 1280,
          height: 720,
          setBounds: jest.fn(),
        },
      },
      input: {
        on: jest.fn(),
      },
    };

    // モックMapManagerを作成
    const mockMapManager = {
      getWidth: jest.fn().mockReturnValue(100),
      getHeight: jest.fn().mockReturnValue(100),
      getTileAt: jest.fn().mockReturnValue({ terrainType: 'plains', movementCost: 1.0 }),
    } as any;

    economyManager = new EconomyManager(mockScene);
    baseManager = new BaseManager(mockScene, mockMapManager);
  });

  afterEach(() => {
    if (baseManager) {
      baseManager.destroy();
    }
  });

  describe('収入計算', () => {
    test('本拠地1つの収入計算（200両/分）', () => {
      // 本拠地を追加
      const baseData = {
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      };
      baseManager.addBase(baseData);

      // 収入計算
      const playerBases = baseManager.getBasesByOwner('player');
      const income = economyManager.calculateIncomePerMinute(playerBases);

      expect(income).toBe(200);
    });

    test('本拠地1つ + 占領拠点2つの収入計算（400両/分）', () => {
      // 本拠地
      baseManager.addBase({
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      });

      // 占領拠点1
      baseManager.addBase({
        id: 'occupied-1',
        name: '占領拠点1',
        type: BaseType.PLAYER_OCCUPIED,
        x: 20,
        y: 20,
        maxHp: 80,
        hp: 80,
        income: 100,
        owner: 'player' as const,
      });

      // 占領拠点2
      baseManager.addBase({
        id: 'occupied-2',
        name: '占領拠点2',
        type: BaseType.PLAYER_OCCUPIED,
        x: 30,
        y: 30,
        maxHp: 80,
        hp: 80,
        income: 100,
        owner: 'player' as const,
      });

      const playerBases = baseManager.getBasesByOwner('player');
      const income = economyManager.calculateIncomePerMinute(playerBases);

      expect(income).toBe(400);
    });

    test('拠点なしの収入計算（0両/分）', () => {
      const playerBases = baseManager.getBasesByOwner('player');
      const income = economyManager.calculateIncomePerMinute(playerBases);

      expect(income).toBe(0);
    });
  });

  describe('定期収入処理', () => {
    test('60秒経過で収入が加算される', () => {
      // 本拠地を追加（200両/分）
      baseManager.addBase({
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      });

      // 初期資金は3000両
      expect(economyManager.getMoney()).toBe(3000);

      // 59秒経過
      economyManager.update(59000, baseManager);
      expect(economyManager.getMoney()).toBe(3000);

      // さらに1秒経過（合計60秒）
      economyManager.update(1000, baseManager);
      expect(economyManager.getMoney()).toBe(3200);
    });

    test('120秒経過で2回の収入が加算される', () => {
      // 本拠地を追加（200両/分）
      baseManager.addBase({
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      });

      // 初期資金は3000両
      expect(economyManager.getMoney()).toBe(3000);

      // 120秒経過
      economyManager.update(120000, baseManager);
      expect(economyManager.getMoney()).toBe(3400); // 3000 + 200 + 200
    });

    test('時間累積の正確性（余剰時間の繰り越し）', () => {
      baseManager.addBase({
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      });

      // 70秒経過（60秒 + 余剰10秒）
      economyManager.update(70000, baseManager);
      expect(economyManager.getMoney()).toBe(3200); // 1回目の収入

      // さらに50秒経過（累積60秒で2回目）
      economyManager.update(50000, baseManager);
      expect(economyManager.getMoney()).toBe(3400); // 2回目の収入
    });
  });

  describe('資金管理', () => {
    test('支出処理が正しく動作する', () => {
      economyManager.setMoney(1000);

      const success = economyManager.spend(500);
      expect(success).toBe(true);
      expect(economyManager.getMoney()).toBe(500);
    });

    test('資金不足時は支出失敗', () => {
      economyManager.setMoney(100);

      const success = economyManager.spend(500);
      expect(success).toBe(false);
      expect(economyManager.getMoney()).toBe(100); // 変化なし
    });

    test('収入追加が正しく動作する', () => {
      economyManager.setMoney(1000);

      economyManager.addIncome(500);
      expect(economyManager.getMoney()).toBe(1500);
    });
  });

  describe('実使用シナリオ', () => {
    test('ゲームプレイシナリオ：拠点占領による収入増加', () => {
      // 初期状態：本拠地のみ（200両/分）
      baseManager.addBase({
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      });

      // 60秒経過（1回目の収入）
      economyManager.update(60000, baseManager);
      expect(economyManager.getMoney()).toBe(3200); // 3000 + 200

      // 拠点を占領（収入+100両/分）
      baseManager.addBase({
        id: 'occupied-1',
        name: '占領拠点1',
        type: BaseType.PLAYER_OCCUPIED,
        x: 20,
        y: 20,
        maxHp: 80,
        hp: 80,
        income: 100,
        owner: 'player' as const,
      });

      // さらに60秒経過（2回目の収入、増加後）
      economyManager.update(60000, baseManager);
      expect(economyManager.getMoney()).toBe(3500); // 3200 + 300
    });

    test('ゲームプレイシナリオ：収入と支出のバランス', () => {
      // 本拠地追加
      baseManager.addBase({
        id: 'player-hq',
        name: '味方本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      });

      // アイテム生産（600両支出）
      economyManager.spend(600);
      expect(economyManager.getMoney()).toBe(2400); // 3000 - 600

      // 60秒経過（収入200両）
      economyManager.update(60000, baseManager);
      expect(economyManager.getMoney()).toBe(2600); // 2400 + 200

      // さらにアイテム生産（400両支出）
      economyManager.spend(400);
      expect(economyManager.getMoney()).toBe(2200); // 2600 - 400
    });
  });
});
