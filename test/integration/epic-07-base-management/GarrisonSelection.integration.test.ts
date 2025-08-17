import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Base } from '../../../src/base/Base';
import { BaseManager } from '../../../src/base/BaseManager';
import { GarrisonSelectionInputHandler } from '../../../src/input/GarrisonSelectionInputHandler';
import { UIManager } from '../../../src/ui/UIManager';

// Phaserのモック
const createMockScene = () => {
  const mockScene = {
    add: {
      graphics: jest.fn(() => ({
        clear: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn(),
        destroy: jest.fn(),
      })),
      text: jest.fn(() => ({
        setOrigin: jest.fn(),
        setPosition: jest.fn(),
        setVisible: jest.fn(),
      })),
      sprite: jest.fn(() => ({
        setDisplaySize: jest.fn(),
        setFrame: jest.fn(),
        setTint: jest.fn(),
      })),
      existing: jest.fn(),
      container: jest.fn(() => ({
        add: jest.fn(),
        setDepth: jest.fn(),
        setPosition: jest.fn(),
        destroy: jest.fn(),
      })),
      group: jest.fn(() => ({
        add: jest.fn(),
        destroy: jest.fn(),
      })),
    },
    input: {
      on: jest.fn(),
      off: jest.fn(),
      setDefaultCursor: jest.fn(),
    },
    cameras: {
      main: {
        worldView: {
          x: 0,
          y: 0,
          width: 1280,
          height: 720,
        },
        zoom: 2.25,
      },
    },
    time: {
      now: 0,
      delayedCall: jest.fn((_delay: number, callback: () => void) => {
        // テストでは即座に実行
        callback();
        return { destroy: jest.fn() };
      }),
    },
    events: {
      emit: jest.fn(),
    },
  };
  return mockScene as any;
};

const createMockBase = (id: string, name: string, x: number, y: number, owner: string) => {
  const mockBase = {
    getId: jest.fn(() => id),
    getName: jest.fn(() => name),
    getPosition: jest.fn(() => ({ x, y })),
    getOwner: jest.fn(() => owner),
    setHighlighted: jest.fn(),
    setHovered: jest.fn(),
    x: x * 16,
    y: y * 16,
  };
  return mockBase as unknown as Base;
};

// モックUIManagerを作成
const createMockUIManager = () => {
  return {
    showGuideMessage: jest.fn(),
    hideGuideMessage: jest.fn(),
  } as unknown as UIManager;
};

describe('[エピック7] GarrisonSelection Integration Tests', () => {
  let scene: any;
  let baseManager: BaseManager;
  let uiManager: UIManager;

  beforeEach(() => {
    scene = createMockScene();
    const mockMapManager = {} as any;
    baseManager = new BaseManager(scene, mockMapManager);
    uiManager = createMockUIManager();
  });

  describe('拠点選択モード', () => {
    test('選択可能な拠点がハイライトされること', () => {
      // Arrange
      const base1 = createMockBase('base1', '味方拠点1', 10, 10, 'player');
      const base2 = createMockBase('base2', '味方拠点2', 15, 15, 'player');
      const selectableBases = [base1, base2];

      const onBaseSelected = jest.fn();
      const onCancel = jest.fn();

      // Act
      new GarrisonSelectionInputHandler(
        scene,
        baseManager,
        selectableBases,
        onBaseSelected,
        onCancel,
        uiManager,
      );

      // Assert
      expect(base1.setHighlighted).toHaveBeenCalledWith(true, 0xffff00);
      expect(base2.setHighlighted).toHaveBeenCalledWith(true, 0xffff00);
      expect(scene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(scene.input.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
    });

    test('マウスホバー時に拠点のホバー状態が更新されること', () => {
      // Arrange
      const base1 = createMockBase('base1', '味方拠点1', 10, 10, 'player');
      const selectableBases = [base1];
      jest.spyOn(baseManager, 'getBaseAtPosition').mockReturnValue(base1);

      const onBaseSelected = jest.fn();
      const onCancel = jest.fn();

      new GarrisonSelectionInputHandler(
        scene,
        baseManager,
        selectableBases,
        onBaseSelected,
        onCancel,
        uiManager,
      );

      // ポインタ移動ハンドラを取得
      const pointermoveHandler = (scene.input.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'pointermove',
      )?.[1] as any;

      // Act
      const pointer = {
        positionToCamera: jest.fn(() => ({ x: 160, y: 160 })),
      };
      pointermoveHandler(pointer);

      // Assert
      expect(base1.setHovered).toHaveBeenCalledWith(true);
      expect(scene.input.setDefaultCursor).toHaveBeenCalledWith('pointer');
    });

    test('左クリックで拠点が選択されること', () => {
      // Arrange
      const base1 = createMockBase('base1', '味方拠点1', 10, 10, 'player');
      const selectableBases = [base1];
      jest.spyOn(baseManager, 'getBaseAtPosition').mockReturnValue(base1);

      const onBaseSelected = jest.fn();
      const onCancel = jest.fn();

      new GarrisonSelectionInputHandler(
        scene,
        baseManager,
        selectableBases,
        onBaseSelected,
        onCancel,
        uiManager,
      );

      // ポインタダウンハンドラを取得
      const pointerdownHandler = (scene.input.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'pointerdown',
      )?.[1] as any;

      // Act
      const pointer = {
        leftButtonDown: jest.fn(() => true),
        rightButtonDown: jest.fn(() => false),
        positionToCamera: jest.fn(() => ({ x: 160, y: 160 })),
      };
      pointerdownHandler(pointer);

      // Assert
      expect(onBaseSelected).toHaveBeenCalledWith(base1);
      expect(uiManager.showGuideMessage).toHaveBeenCalledWith('軍団を味方拠点1に駐留させました');
      expect(base1.setHighlighted).toHaveBeenCalledWith(false);
      expect(scene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(scene.input.off).toHaveBeenCalledWith('pointermove', expect.any(Function));
    });

    test('右クリックでキャンセルされること', () => {
      // Arrange
      const base1 = createMockBase('base1', '味方拠点1', 10, 10, 'player');
      const selectableBases = [base1];

      const onBaseSelected = jest.fn();
      const onCancel = jest.fn();

      new GarrisonSelectionInputHandler(
        scene,
        baseManager,
        selectableBases,
        onBaseSelected,
        onCancel,
        uiManager,
      );

      // ポインタダウンハンドラを取得
      const pointerdownHandler = (scene.input.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'pointerdown',
      )?.[1] as any;

      // Act
      const pointer = {
        leftButtonDown: jest.fn(() => false),
        rightButtonDown: jest.fn(() => true),
        positionToCamera: jest.fn(() => ({ x: 100, y: 100 })),
      };
      pointerdownHandler(pointer);

      // Assert
      expect(onCancel).toHaveBeenCalled();
      expect(onBaseSelected).not.toHaveBeenCalled();
      expect(uiManager.hideGuideMessage).toHaveBeenCalled();
      expect(base1.setHighlighted).toHaveBeenCalledWith(false);
      expect(scene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(scene.input.off).toHaveBeenCalledWith('pointermove', expect.any(Function));
    });

    test('選択不可能な拠点はクリックしても選択されないこと', () => {
      // Arrange
      const base1 = createMockBase('base1', '味方拠点1', 10, 10, 'player');
      const base2 = createMockBase('base2', '敵拠点', 20, 20, 'enemy');
      const selectableBases = [base1]; // base2は選択不可
      jest.spyOn(baseManager, 'getBaseAtPosition').mockReturnValue(base2);

      const onBaseSelected = jest.fn();
      const onCancel = jest.fn();

      new GarrisonSelectionInputHandler(
        scene,
        baseManager,
        selectableBases,
        onBaseSelected,
        onCancel,
        uiManager,
      );

      // ポインタダウンハンドラを取得
      const pointerdownHandler = (scene.input.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'pointerdown',
      )?.[1] as any;

      // Act
      const pointer = {
        leftButtonDown: jest.fn(() => true),
        rightButtonDown: jest.fn(() => false),
        positionToCamera: jest.fn(() => ({ x: 320, y: 320 })),
      };
      pointerdownHandler(pointer);

      // Assert
      expect(onBaseSelected).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      // ハンドラはまだアクティブ
      expect(scene.input.off).not.toHaveBeenCalled();
    });
  });

  describe('タイル座標変換', () => {
    test('ワールド座標からタイル座標への変換が正しく行われること', () => {
      // Arrange
      const base1 = createMockBase('base1', '味方拠点1', 10, 10, 'player');
      jest.spyOn(baseManager, 'getBaseAtPosition').mockReturnValue(base1);

      const selectableBases = [base1];
      const onBaseSelected = jest.fn();
      const onCancel = jest.fn();

      new GarrisonSelectionInputHandler(
        scene,
        baseManager,
        selectableBases,
        onBaseSelected,
        onCancel,
        uiManager,
      );

      // ポインタダウンハンドラを取得
      const pointerdownHandler = (scene.input.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'pointerdown',
      )?.[1] as any;

      // Act
      const pointer = {
        leftButtonDown: jest.fn(() => true),
        rightButtonDown: jest.fn(() => false),
        positionToCamera: jest.fn(() => ({ x: 165, y: 165 })), // 10.3125タイル -> 10タイル
      };
      pointerdownHandler(pointer);

      // Assert
      // getBaseAtPositionが適切な座標で呼ばれていることを確認
      expect(baseManager.getBaseAtPosition).toHaveBeenCalledWith(10, 10);
    });
  });
});
