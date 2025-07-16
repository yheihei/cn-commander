import { UIManager } from '../../../src/ui/UIManager';
import { createMockScene } from '../../setup';

describe('[エピック4] Movement Mode Selection Integration Tests', () => {
  let scene: any;
  let uiManager: UIManager;

  beforeEach(() => {
    scene = createMockScene();
    uiManager = new UIManager(scene);
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
      };

      // アクションメニューを表示
      uiManager.showActionMenu(mockArmy as any, jest.fn(), jest.fn());
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
      };

      uiManager.showActionMenu(mockArmy as any, jest.fn(), jest.fn());
      expect(uiManager.isAnyMenuVisible()).toBe(true);

      uiManager.hideActionMenu();
      expect(uiManager.isAnyMenuVisible()).toBe(false);
    });
  });
});
