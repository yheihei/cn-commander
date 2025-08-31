import { UIManager } from '../../../src/ui/UIManager';
import { createMockProductionManager } from '../../mocks/ProductionManagerMock';
import { createMockScene } from '../../setup';

describe('[エピック4] Action Menu Integration Tests', () => {
  let scene: any;
  let uiManager: UIManager;

  beforeEach(() => {
    scene = createMockScene();
    const productionManager = createMockProductionManager();
    uiManager = new UIManager(scene, productionManager, {});
  });

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy();
    }
  });

  describe('基本的なUIマネージャーの動作', () => {
    test('UIManagerを作成できる', () => {
      expect(uiManager).toBeDefined();
    });
  });

  describe('UIManager統合テスト', () => {
    test('UIManagerを通じてアクションメニューを表示できる', () => {
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

      const onMove = jest.fn();
      const onCancel = jest.fn();

      uiManager.showActionMenu(
        mockArmy as any,
        onMove,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        onCancel,
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      expect(uiManager.isActionMenuVisible()).toBe(true);
      expect(uiManager.getCurrentSelectedArmy()).toBe(mockArmy);
    });

    test('アクションメニューを非表示にできる', () => {
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
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );
      expect(uiManager.isActionMenuVisible()).toBe(true);

      uiManager.hideActionMenu();
      expect(uiManager.isActionMenuVisible()).toBe(false);
      expect(uiManager.getCurrentSelectedArmy()).toBeNull();
    });
  });
});
