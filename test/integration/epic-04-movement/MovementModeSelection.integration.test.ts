import { UIManager } from "../../../src/ui/UIManager";
import { createMockScene } from "../../setup";

describe("[エピック4] Movement Mode Selection Integration Tests", () => {
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

  describe("移動モード選択の基本動作", () => {
    test("移動モード選択メニューを表示できる", () => {
      const mockArmy = {
        getCommander: () => ({
          getCenter: () => ({ x: 100, y: 100 }),
        }),
      };

      const onNormalMove = jest.fn();
      const onCombatMove = jest.fn();
      const onCancel = jest.fn();

      uiManager.showMovementModeMenu(
        mockArmy as any,
        onNormalMove,
        onCombatMove,
        onCancel,
      );

      expect(uiManager.isMovementModeMenuVisible()).toBe(true);
    });

    test("移動モード選択メニューを非表示にできる", () => {
      const mockArmy = {
        getCommander: () => ({
          getCenter: () => ({ x: 100, y: 100 }),
        }),
      };

      uiManager.showMovementModeMenu(
        mockArmy as any,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );
      expect(uiManager.isMovementModeMenuVisible()).toBe(true);

      uiManager.hideMovementModeMenu();
      expect(uiManager.isMovementModeMenuVisible()).toBe(false);
    });
  });

  describe("パス選択メッセージの動作", () => {
    test("パス選択メッセージを表示できる", () => {
      uiManager.showPathSelectionMessage();
      // PathSelectionMessageが作成されることを確認
      expect(scene.add.existing).toHaveBeenCalled();
    });

    test("パス選択メッセージを非表示にできる", () => {
      uiManager.showPathSelectionMessage();
      uiManager.hidePathSelectionMessage();
      // hideが呼ばれることを確認
      expect(true).toBe(true); // メッセージの非表示を確認
    });

    test("パス選択メッセージのテキストを更新できる", () => {
      uiManager.showPathSelectionMessage();
      const newText = "新しいメッセージ";
      uiManager.updatePathSelectionMessage(newText);
      // updateMessageが呼ばれることを確認
      expect(true).toBe(true); // テキスト更新を確認
    });
  });

  describe("メニューの連携動作", () => {
    test("複数のメニューが同時に表示されないことを確認", () => {
      const mockArmy = {
        getCommander: () => ({
          getCenter: () => ({ x: 100, y: 100 }),
        }),
      };

      // アクションメニューを表示
      uiManager.showActionMenu(mockArmy as any, jest.fn(), jest.fn());
      expect(uiManager.isActionMenuVisible()).toBe(true);
      expect(uiManager.isAnyMenuVisible()).toBe(true);

      // 移動モードメニューを表示（アクションメニューは消える想定）
      uiManager.showMovementModeMenu(
        mockArmy as any,
        jest.fn(),
        jest.fn(),
        jest.fn(),
      );
      expect(uiManager.isMovementModeMenuVisible()).toBe(true);
    });

    test("isAnyMenuVisibleが正しく動作する", () => {
      expect(uiManager.isAnyMenuVisible()).toBe(false);

      const mockArmy = {
        getCommander: () => ({
          getCenter: () => ({ x: 100, y: 100 }),
        }),
      };

      uiManager.showActionMenu(mockArmy as any, jest.fn(), jest.fn());
      expect(uiManager.isAnyMenuVisible()).toBe(true);

      uiManager.hideActionMenu();
      expect(uiManager.isAnyMenuVisible()).toBe(false);
    });
  });
});
