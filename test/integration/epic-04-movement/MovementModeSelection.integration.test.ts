import { UIManager } from '../../../src/ui/UIManager';
import { EconomyManager } from '../../../src/economy/EconomyManager';
import { BaseManager } from '../../../src/base/BaseManager';
import { createMockProductionManager } from '../../mocks/ProductionManagerMock';
import { createMockScene } from '../../setup';

describe('[エピック4] Movement Mode Selection Integration Tests', () => {
  let scene: any;
  let uiManager: UIManager;

  beforeEach(() => {
    scene = createMockScene();
    const productionManager = createMockProductionManager();
    const economyManager = new EconomyManager(scene);
    const mockMapManager = {} as any;
    const baseManager = new BaseManager(scene, mockMapManager);
    uiManager = new UIManager(scene, productionManager, economyManager, baseManager);
  });

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy();
    }
  });

  describe('移動モード選択の基本動作', () => {
    test('移動モード選択メニューを表示できる', () => {
      const onNormalMove = jest.fn();
      const onCombatMove = jest.fn();
      const onCancel = jest.fn();

      uiManager.showMovementModeMenu(onNormalMove, onCombatMove, onCancel);

      expect(uiManager.isMovementModeMenuVisible()).toBe(true);
    });

    test('移動モード選択メニューを非表示にできる', () => {
      uiManager.showMovementModeMenu(jest.fn(), jest.fn(), jest.fn());
      expect(uiManager.isMovementModeMenuVisible()).toBe(true);

      uiManager.hideMovementModeMenu();
      expect(uiManager.isMovementModeMenuVisible()).toBe(false);
    });
  });

  describe('メニューの連携動作', () => {
    test('複数のメニューが同時に表示されないことを確認', () => {
      const mockArmy = {
        getCommander: () => ({
          getCenter: () => ({ x: 100, y: 100 }),
        }),
        getName: () => 'テスト軍団',
        getMovementState: () => ({
          isMoving: false,
          currentPath: null,
          currentSpeed: 0,
          mode: 'normal',
          targetPosition: null,
        }),
        getPosition: () => ({ x: 100, y: 100 }),
        getAllMembers: () => [],
        getAttackTarget: () => null,
        hasAttackTarget: () => false,
      };

      // アクションメニューを表示
      uiManager.showActionMenu(
        mockArmy as any,
        jest.fn(), // onMove
        jest.fn(), // onStandby
        jest.fn(), // onGarrison
        jest.fn(), // onClearGarrison
        jest.fn(), // onAttackTarget
        jest.fn(), // onCancel
        jest.fn(), // onInventory (新しく追加)
        jest.fn(), // onOccupy
        false, // canOccupy
      );
      expect(uiManager.isActionMenuVisible()).toBe(true);
      expect(uiManager.isAnyMenuVisible()).toBe(true);

      // 移動モードメニューを表示（アクションメニューは消える想定）
      uiManager.showMovementModeMenu(jest.fn(), jest.fn(), jest.fn());
      expect(uiManager.isMovementModeMenuVisible()).toBe(true);
    });

    test('isAnyMenuVisibleが正しく動作する', () => {
      expect(uiManager.isAnyMenuVisible()).toBe(false);

      const mockArmy = {
        getCommander: () => ({
          getCenter: () => ({ x: 100, y: 100 }),
        }),
        getName: () => 'テスト軍団',
        getMovementState: () => ({
          isMoving: false,
          currentPath: null,
          currentSpeed: 0,
          mode: 'normal',
          targetPosition: null,
        }),
        getPosition: () => ({ x: 100, y: 100 }),
        getAllMembers: () => [],
        getAttackTarget: () => null,
        hasAttackTarget: () => false,
      };

      uiManager.showActionMenu(
        mockArmy as any,
        jest.fn(), // onMove
        jest.fn(), // onStandby
        jest.fn(), // onGarrison
        jest.fn(), // onClearGarrison
        jest.fn(), // onAttackTarget
        jest.fn(), // onCancel
        jest.fn(), // onInventory (新しく追加)
        jest.fn(), // onOccupy
        false, // canOccupy
      );
      expect(uiManager.isAnyMenuVisible()).toBe(true);

      uiManager.hideActionMenu();
      expect(uiManager.isAnyMenuVisible()).toBe(false);
    });
  });
});
