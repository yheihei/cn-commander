import { UIManager } from '../../../src/ui/UIManager';
import { WarehouseSubMenu } from '../../../src/ui/WarehouseSubMenu';
import { InventoryManager } from '../../../src/item/InventoryManager';
import { EconomyManager } from '../../../src/economy/EconomyManager';
import { Base } from '../../../src/base/Base';
import { BaseManager } from '../../../src/base/BaseManager';
import { ProductionManager, ProductionItemType } from '../../../src/production/ProductionManager';
import { MapManager } from '../../../src/map/MapManager';
import { BaseType } from '../../../src/types/MapTypes';

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
        setText: jest.fn(),
        destroy: jest.fn(),
      })),
      container: jest.fn(() => ({
        add: jest.fn(),
        getData: jest.fn(),
        setData: jest.fn(),
        removeAll: jest.fn(),
      })),
      group: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn(),
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
      delayedCall: jest.fn((_delay, callback) => {
        if (callback) callback();
      }),
    },
  };
  return mockScene;
};

// createMockItemは不要（Map形式のInventoryManagerを使用）

describe('[エピック7] Warehouse UI Integration Tests', () => {
  let scene: any;
  let uiManager: UIManager;
  let baseManager: BaseManager;
  let productionManager: ProductionManager;
  let inventoryManager: InventoryManager;
  let mapManager: MapManager;

  beforeEach(() => {
    scene = createMockScene();
    mapManager = {} as MapManager; // モック
    baseManager = new BaseManager(scene, mapManager);
    productionManager = new ProductionManager(scene);

    // ProductionManagerが使用するInventoryManagerを作成
    inventoryManager = new InventoryManager(scene);
    inventoryManager.initialize();

    // ProductionManagerにInventoryManagerを設定
    productionManager.setInventoryManager(inventoryManager);

    // sceneにproductionManagerを設定（WarehouseSubMenuがアクセスできるように）
    scene.productionManager = productionManager;

    const economyManager = new EconomyManager(scene);

    try {
      uiManager = new UIManager(scene, productionManager, economyManager, baseManager);
    } catch (e) {
      console.error('UIManager initialization error:', e);
    }
  });

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy();
    }
    // InventoryManagerのクリーンアップは不要（インスタンスごとに作成）
  });

  describe('WarehouseSubMenuの表示', () => {
    test('拠点の倉庫ボタンから倉庫UIが表示される', () => {
      // 味方拠点を作成
      const baseData = {
        id: 'base-1',
        name: '本拠地',
        type: BaseType.PLAYER_HQ,
        x: 100,
        y: 100,
        maxHp: 200,
        hp: 200,
        income: 200,
        owner: 'player' as const,
      };
      const base = new Base(scene, baseData);
      baseManager.addBase(baseData);

      // BaseActionMenuを表示
      uiManager.showBaseActionMenu(base);
      expect(uiManager.isBaseActionMenuVisible()).toBe(true);

      // 倉庫機能を呼び出す（UIManagerのshowWarehouseSubMenuを直接呼び出す）
      uiManager.showWarehouseSubMenu();

      // WarehouseSubMenuが表示される
      expect(uiManager.isWarehouseSubMenuVisible()).toBe(true);
      // BaseActionMenuは自動的に非表示になるはず
      expect(uiManager.isBaseActionMenuVisible()).toBe(false);
    });

    test('倉庫UIにアイテムリストが表示される', () => {
      // テストアイテムを追加（Map形式のInventoryManagerに対応）
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 1);
      inventoryManager.addItem(ProductionItemType.SHURIKEN, 2);
      inventoryManager.addItem(ProductionItemType.FOOD_PILL, 1);

      // WarehouseSubMenuを表示
      uiManager.showWarehouseSubMenu();

      // コンテナにアイテムが追加されているか確認
      const containerCalls = scene.add.container.mock.calls;
      const inventoryListContainer = containerCalls.find((call: any) => {
        // inventoryListコンテナを探す（左側のリスト）
        const args = call[0];
        return args === ((-1280 / 2.25) * 0.9) / 4; // 左側の位置
      });

      expect(inventoryListContainer).toBeDefined();
    });
  });

  describe('アイテム選択と詳細表示', () => {
    test('アイテムを選択すると詳細が表示される', () => {
      // アイテムを追加
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 1);

      // WarehouseSubMenuを直接作成
      new WarehouseSubMenu({
        scene,
        onCancel: jest.fn(),
      });

      // アイテムの背景rectangleのクリックハンドラを探して実行
      const rectangleCalls = scene.add.rectangle.mock.calls;
      // アイテムの背景を見つける（幅200、高さ35のもの）
      let clickHandlerExecuted = false;

      for (let i = rectangleCalls.length - 1; i >= 0; i--) {
        const call = rectangleCalls[i];
        if (call[2] === 200 && call[3] === 35) {
          // このrectangleのモックオブジェクトを取得
          const rectMock = scene.add.rectangle.mock.results[i].value;
          // onメソッドの呼び出しから pointerdown ハンドラを探す
          const onCalls = rectMock.on.mock.calls;
          const pointerdownCall = onCalls.find((c: any) => c[0] === 'pointerdown');

          if (pointerdownCall && pointerdownCall[1]) {
            // クリックイベントハンドラを実行
            pointerdownCall[1]();
            clickHandlerExecuted = true;
            break;
          }
        }
      }

      // クリックハンドラが実行されたことを確認
      expect(clickHandlerExecuted).toBe(true);

      // 詳細テキストが作成されているか確認
      // 最新のテキスト呼び出しをチェック
      const textCalls = scene.add.text.mock.calls;
      const hasNinjaSwordText = textCalls.some((call: any) => call[2] === '忍者刀');
      const hasDescriptionText = textCalls.some(
        (call: any) => call[2] === '近距離武器' || call[2].includes('近距離'),
      );

      expect(hasNinjaSwordText).toBe(true);
      expect(hasDescriptionText).toBe(true);
    });

    test('消耗品を選択すると効果が表示される', () => {
      // 消耗品を追加
      inventoryManager.addItem(ProductionItemType.FOOD_PILL, 1);

      new WarehouseSubMenu({
        scene,
        onCancel: jest.fn(),
      });

      // アイテムをクリック
      const rectangleCalls = scene.add.rectangle.mock.calls;
      let clickHandlerExecuted = false;

      for (let i = rectangleCalls.length - 1; i >= 0; i--) {
        const call = rectangleCalls[i];
        if (call[2] === 200 && call[3] === 35) {
          const rectMock = scene.add.rectangle.mock.results[i].value;
          const onCalls = rectMock.on.mock.calls;
          const pointerdownCall = onCalls.find((c: any) => c[0] === 'pointerdown');

          if (pointerdownCall && pointerdownCall[1]) {
            pointerdownCall[1]();
            clickHandlerExecuted = true;
            break;
          }
        }
      }

      expect(clickHandlerExecuted).toBe(true);

      // 効果テキストが表示されているか確認
      const textCalls = scene.add.text.mock.calls;
      const hasEffectText = textCalls.some(
        (call: any) => call[2] === 'HP全快' || call[2].includes('HP'),
      );

      expect(hasEffectText).toBe(true);
    });
  });

  describe('倉庫UIの閉じる操作', () => {
    test('閉じるボタンで倉庫UIが閉じる', () => {
      uiManager.showWarehouseSubMenu();
      expect(uiManager.isWarehouseSubMenuVisible()).toBe(true);

      // 閉じるボタンのクリック
      // ボタンの背景rectangle（幅100、高さ35）を探す
      const rectangleCalls = scene.add.rectangle.mock.calls;

      // 後ろから探す（最後に作成されたボタンが閉じるボタンの可能性が高い）
      for (let i = rectangleCalls.length - 1; i >= 0; i--) {
        const call = rectangleCalls[i];
        if (call[2] === 100 && call[3] === 35) {
          const rectMock = scene.add.rectangle.mock.results[i].value;
          const onCalls = rectMock.on.mock.calls;
          const pointerdownCall = onCalls.find((c: any) => c[0] === 'pointerdown');

          if (pointerdownCall && pointerdownCall[1]) {
            // クリックハンドラを実行
            pointerdownCall[1]();
            // 閉じるボタンが見つかったら最初の1つだけ実行
            break;
          }
        }
      }

      // ハンドラが実行されたか、または hideWarehouseSubMenu が呼ばれたかを確認
      expect(uiManager.isWarehouseSubMenuVisible()).toBe(false);
    });

    test('右クリックで倉庫UIが閉じる', () => {
      uiManager.showWarehouseSubMenu();
      expect(uiManager.isWarehouseSubMenuVisible()).toBe(true);

      // 右クリックイベントをシミュレート
      const inputOnCalls = scene.input.on.mock.calls;
      const rightClickHandler = inputOnCalls.find((call: any) => call[0] === 'pointerdown');

      if (rightClickHandler) {
        const mockPointer = {
          rightButtonDown: () => true,
        };
        rightClickHandler[1](mockPointer);
      }

      expect(uiManager.isWarehouseSubMenuVisible()).toBe(false);
    });

    test('パネル外クリックで倉庫UIが閉じる', () => {
      uiManager.showWarehouseSubMenu();
      expect(uiManager.isWarehouseSubMenuVisible()).toBe(true);

      // モーダル背景のクリックをシミュレート
      const rectangleCalls = scene.add.rectangle.mock.calls;

      // モーダル背景を探す（画面全体サイズ）
      for (let i = 0; i < rectangleCalls.length; i++) {
        const call = rectangleCalls[i];
        // モーダル背景は画面全体のサイズで、通常最初の方に作成される
        if (call[2] === 1280 / 2.25 && call[3] === 720 / 2.25) {
          const rectMock = scene.add.rectangle.mock.results[i].value;
          const onCalls = rectMock.on.mock.calls;
          const pointerdownCall = onCalls.find((c: any) => c[0] === 'pointerdown');

          if (pointerdownCall && pointerdownCall[1]) {
            // パネル外の座標でクリック
            const mockPointer = {
              x: -1000,
              y: -1000,
              event: { stopPropagation: jest.fn() },
            };
            pointerdownCall[1](mockPointer);
            break;
          }
        }
      }

      expect(uiManager.isWarehouseSubMenuVisible()).toBe(false);
    });
  });

  describe('複数アイテムの表示', () => {
    test('同じアイテムが複数ある場合、数量がまとめて表示される', () => {
      // 同じアイテムを複数追加（Map形式では自動的にまとめられる）
      inventoryManager.addItem(ProductionItemType.SHURIKEN, 3);

      new WarehouseSubMenu({
        scene,
        onCancel: jest.fn(),
      });

      // テキストに「手裏剣 x3」が表示されているか確認
      const textCalls = scene.add.text.mock.calls;
      const itemText = textCalls.find((call: any) => call[2] === '手裏剣 x3');

      expect(itemText).toBeDefined();
    });

    test('異なるアイテムは別々に表示される', () => {
      // 異なるアイテムを追加
      inventoryManager.addItem(ProductionItemType.NINJA_SWORD, 1);
      inventoryManager.addItem(ProductionItemType.SHURIKEN, 1);
      inventoryManager.addItem(ProductionItemType.FOOD_PILL, 1);

      new WarehouseSubMenu({
        scene,
        onCancel: jest.fn(),
      });

      // 各アイテムが個別に表示されているか確認
      const textCalls = scene.add.text.mock.calls;
      const swordText = textCalls.find((call: any) => call[2] === '忍者刀 x1');
      const shurikenText = textCalls.find((call: any) => call[2] === '手裏剣 x1');
      const riceBallText = textCalls.find((call: any) => call[2] === '兵糧丸 x1');

      expect(swordText).toBeDefined();
      expect(shurikenText).toBeDefined();
      expect(riceBallText).toBeDefined();
    });
  });
});
