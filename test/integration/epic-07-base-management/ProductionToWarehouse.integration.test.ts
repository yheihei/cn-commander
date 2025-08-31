import { ProductionManager } from '../../../src/production/ProductionManager';
import { InventoryManager } from '../../../src/item/InventoryManager';
import { WarehouseSubMenu } from '../../../src/ui/WarehouseSubMenu';
import { ProductionItemType } from '../../../src/production/ProductionManager';

// モックセットアップ
jest.mock('phaser');

const createMockScene = () => {
  const mockScene = {
    add: {
      existing: jest.fn(),
      rectangle: jest.fn(() => ({
        setStrokeStyle: jest.fn(),
        setOrigin: jest.fn(),
        setInteractive: jest.fn(),
        setFillStyle: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
      })),
      text: jest.fn(() => ({
        setOrigin: jest.fn(),
        setPosition: jest.fn(),
        setColor: jest.fn(),
        destroy: jest.fn(),
      })),
      container: jest.fn(() => ({
        add: jest.fn(),
        getData: jest.fn(),
        setData: jest.fn(),
        removeAll: jest.fn(),
        setDepth: jest.fn(),
      })),
    },
    cameras: {
      main: {
        zoom: 2.25,
        worldView: {
          x: 0,
          y: 0,
          right: 1280 / 2.25,
          bottom: 720 / 2.25,
        },
      },
    },
    input: {
      on: jest.fn(),
      off: jest.fn(),
    },
    time: {
      now: Date.now(),
    },
  };
  return mockScene;
};

describe('[エピック7/10] 生産から倉庫への統合テスト', () => {
  let scene: any;
  let productionManager: ProductionManager;
  let inventoryManager: InventoryManager;

  beforeEach(() => {
    scene = createMockScene();

    // 共通のInventoryManagerを作成
    inventoryManager = new InventoryManager(scene);
    inventoryManager.initialize();

    // ProductionManagerを作成し、InventoryManagerを設定
    productionManager = new ProductionManager(scene);
    productionManager.setInventoryManager(inventoryManager);

    // sceneにproductionManagerを設定（WarehouseSubMenuがアクセス可能に）
    scene.productionManager = productionManager;
  });

  describe('生産アイテムが倉庫に表示される', () => {
    test('生産工場で追加したアイテムが倉庫UIで表示される', () => {
      // 生産工場でアイテムを追加（実際の生産フローをシミュレート）
      const baseId = 'base-1';
      productionManager.initializeBase(baseId);

      // 忍者刀を1つ追加
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 1);

      // 手裏剣を3つ追加
      inventoryManager.addItem(ProductionItemType.SHURIKEN, 3);

      // 兵糧丸を2つ追加
      inventoryManager.addItem(ProductionItemType.FOOD_PILL, 2);

      // 倉庫UIを作成
      new WarehouseSubMenu({
        scene,
        onCancel: jest.fn(),
      });

      // getAllItemsを呼び出して、正しいアイテムが返されることを確認
      const items = inventoryManager.getAllItems();
      expect(items.get(ProductionItemType.NINJA_SWORD)).toBe(1);
      expect(items.get(ProductionItemType.SHURIKEN)).toBe(3);
      expect(items.get(ProductionItemType.FOOD_PILL)).toBe(2);

      // WarehouseSubMenuが正しく表示されることを確認
      // （UIの詳細なテストは省略し、データの流れを確認）
      const containerCalls = scene.add.container.mock.calls;
      expect(containerCalls.length).toBeGreaterThan(0);

      // テキスト要素が作成されていることを確認
      const textCalls = scene.add.text.mock.calls;

      // タイトルが表示されている
      const titleText = textCalls.find((call: any) => call[2] === '倉庫');
      expect(titleText).toBeDefined();

      // アイテム在庫タイトルが表示されている
      const inventoryTitle = textCalls.find((call: any) => call[2] === 'アイテム在庫');
      expect(inventoryTitle).toBeDefined();
    });

    test('複数の同じアイテムが正しくカウントされる', () => {
      // 忍者刀を複数回追加
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 1);
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 2);
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 3);

      // 合計6個になっているはず
      const items = inventoryManager.getAllItems();
      expect(items.get(ProductionItemType.NINJA_SWORD)).toBe(6);
    });

    test('アイテムが存在しない場合は「アイテムがありません」と表示される', () => {
      // アイテムを追加しない状態で倉庫UIを作成
      new WarehouseSubMenu({
        scene,
        onCancel: jest.fn(),
      });

      // 「アイテムがありません」というテキストが表示される
      const textCalls = scene.add.text.mock.calls;
      const noItemText = textCalls.find((call: any) => call[2] === 'アイテムがありません');
      expect(noItemText).toBeDefined();
    });

    test('生産マネージャーから取得したInventoryManagerが正しく機能する', () => {
      // ProductionManagerから同じInventoryManagerが取得できることを確認
      const retrievedInventoryManager = productionManager.getInventoryManager();
      expect(retrievedInventoryManager).toBe(inventoryManager);

      // 取得したInventoryManagerにアイテムを追加
      if (retrievedInventoryManager) {
        retrievedInventoryManager.addItem(ProductionItemType.BOW, 5);

        // 元のInventoryManagerでも同じデータが見える
        const items = inventoryManager.getAllItems();
        expect(items.get(ProductionItemType.BOW)).toBe(5);
      }
    });
  });
});
