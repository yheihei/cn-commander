import { ArmyManager } from '../../../src/army/ArmyManager';
import { MapManager } from '../../../src/map/MapManager';
import { MovementManager } from '../../../src/movement/MovementManager';
import { MovementInputHandler } from '../../../src/input/MovementInputHandler';
import { UIManager } from '../../../src/ui/UIManager';
import { MovementCommandSystem } from '../../../src/movement/MovementCommand';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { MovementMode } from '../../../src/types/MovementTypes';
import { createMockScene } from '../../setup';
import { VisionSystem } from '../../../src/vision/VisionSystem';
import { BaseManager } from '../../../src/base/BaseManager';

describe('[エピック4] Movement Execution Integration Tests', () => {
  let scene: any;
  let armyManager: ArmyManager;
  let mapManager: MapManager;
  let baseManager: BaseManager;
  let movementManager: MovementManager;
  let commandSystem: MovementCommandSystem;
  let inputHandler: MovementInputHandler;
  let uiManager: UIManager;
  let visionSystem: VisionSystem;

  beforeEach(() => {
    scene = createMockScene();
    armyManager = new ArmyManager(scene);
    mapManager = new MapManager(scene);
    baseManager = new BaseManager(scene, mapManager);
    commandSystem = new MovementCommandSystem();
    movementManager = new MovementManager(scene, armyManager, mapManager, commandSystem);
    uiManager = new UIManager(scene);
    visionSystem = new VisionSystem(mapManager);
    inputHandler = new MovementInputHandler(
      scene,
      armyManager,
      mapManager,
      baseManager,
      commandSystem,
      uiManager,
      visionSystem,
    );

    // テスト用のマップを設定
    const mapData = {
      name: 'testMap',
      width: 50,
      height: 50,
      tileSize: 16,
      layers: [
        {
          name: 'terrain',
          tiles: Array(50)
            .fill(null)
            .map(() => Array(50).fill(0)),
          visible: true,
        },
      ],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: 40, y: 40 },
      },
      bases: [],
    };
    mapManager.loadMap(mapData as any);
  });

  afterEach(() => {
    inputHandler.destroy();
    uiManager.destroy();
  });

  describe('移動開始処理', () => {
    test('経路設定後に軍団が移動を開始する', () => {
      // 軍団を作成
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      expect(army).not.toBeNull();
      if (!army) return;

      // 経路を設定
      const waypoints = [
        { x: 160, y: 160 }, // 10,10 in pixels
        { x: 176, y: 160 }, // 11,10 in pixels
        { x: 192, y: 160 }, // 12,10 in pixels
      ];

      // 移動コマンドを設定
      commandSystem.setPath(army, waypoints, MovementMode.NORMAL);

      // 移動が開始されているか確認
      expect(army.isMoving()).toBe(true);
      expect(commandSystem.getCommand(army.getId())).toBeDefined();
      expect(commandSystem.getCurrentTarget(army.getId())).toEqual(waypoints[0]);
    });

    test('×マークが経路選択完了後に消去される', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      // 別の方法: 軍団を直接選択する
      const showActionMenu = jest.spyOn(uiManager, 'showActionMenu');

      // 直接showActionMenuを呼び出す（統合テストでは内部動作を直接テストする）
      const inputHandler_any = inputHandler as any;
      inputHandler_any.showActionMenu(army);
      expect(showActionMenu).toHaveBeenCalled();

      // 移動プロセスを開始
      const startMovementProcess = (inputHandler as any).startMovementProcess.bind(inputHandler);
      (inputHandler as any).selectedArmy = army;
      startMovementProcess();

      // 経路設定を開始
      const startPathSetting = (inputHandler as any).startPathSetting.bind(inputHandler);
      startPathSetting();

      // 経路点を追加
      const addWaypoint = (inputHandler as any).addWaypoint.bind(inputHandler);
      addWaypoint(176, 160);
      addWaypoint(192, 160);

      // waypointMarkersが作成されているか確認
      expect((inputHandler as any).waypointMarkers.length).toBe(2);

      // 移動を確定
      const confirmMovement = (inputHandler as any).confirmMovement.bind(inputHandler);
      confirmMovement();

      // ×マークが消去されているか確認
      expect((inputHandler as any).waypointMarkers.length).toBe(0);
      expect((inputHandler as any).waypointBuffer.length).toBe(0);
    });

    test('移動システムが軍団を実際に移動させる', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;
      const initialX = army.x;
      const initialY = army.y;

      // 移動先を設定
      const target = { x: initialX + 32, y: initialY }; // 2マス右
      commandSystem.setPath(army, [target], MovementMode.NORMAL);

      // 移動更新を実行（1秒分）
      movementManager.update(1000, 1000);

      // 軍団が移動したか確認
      expect(army.x).not.toBe(initialX);
      expect(army.x).toBeGreaterThan(initialX);
    });

    test('経路の全地点を順番に通過する', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      const waypoints = [
        { x: 176, y: 160 }, // 1マス右
        { x: 176, y: 176 }, // 1マス下
        { x: 160, y: 176 }, // 1マス左
      ];

      commandSystem.setPath(army, waypoints, MovementMode.NORMAL);

      // 最初の目標地点を確認
      expect(commandSystem.getCurrentTarget(army.getId())).toEqual(waypoints[0]);

      // 十分な時間経過させて最初の地点に到達
      for (let i = 0; i < 10; i++) {
        movementManager.update(i * 1000, 1000);
      }

      // 次の地点に進んでいるか、または移動が完了しているか確認
      const currentTarget = commandSystem.getCurrentTarget(army.getId());
      if (currentTarget) {
        // まだ移動中の場合
        expect(waypoints).toContainEqual(currentTarget);
      } else {
        // 移動完了の場合
        expect(army.isMoving()).toBe(false);
      }
    });

    test('戦闘移動モードで移動速度が変わる', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;
      const initialX = army.x;

      const target = { x: initialX + 160, y: army.y }; // 10マス右

      // 通常移動
      commandSystem.setPath(army, [target], MovementMode.NORMAL);
      movementManager.update(0, 1000);
      const normalMoveDistance = army.x - initialX;

      // リセット
      army.setPosition(initialX, army.y);

      // 戦闘移動（60%の速度）
      commandSystem.setPath(army, [target], MovementMode.COMBAT);
      movementManager.update(0, 1000);
      const combatMoveDistance = army.x - initialX;

      // 戦闘移動の方が遅いことを確認
      expect(combatMoveDistance).toBeLessThan(normalMoveDistance);
      expect(combatMoveDistance).toBeCloseTo(normalMoveDistance * 0.6, 1);
    });
  });

  describe('エラーケース', () => {
    test('経路点なしで移動開始した場合', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      // 空の経路で移動コマンドを設定
      commandSystem.setPath(army, [], MovementMode.NORMAL);

      // 移動が開始されないことを確認
      expect(army.isMoving()).toBe(false);
      expect(commandSystem.getCommand(army.getId())).toBeNull();
    });

    test('移動中に新しい経路を設定した場合', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      // 最初の経路
      const firstPath = [{ x: 200, y: 160 }];
      commandSystem.setPath(army, firstPath, MovementMode.NORMAL);

      // 新しい経路を設定
      const secondPath = [{ x: 160, y: 200 }];
      commandSystem.setPath(army, secondPath, MovementMode.NORMAL);

      // 新しい経路が設定されていることを確認
      expect(commandSystem.getCurrentTarget(army.getId())).toEqual(secondPath[0]);
    });
  });

  describe('経路指定中のキャンセル処理', () => {
    test('経路点が1つ以上設定されている状態でキャンセルした場合、移動が開始される', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      // 軍団を選択して経路設定モードにする
      const inputHandler_any = inputHandler as any;
      inputHandler_any.selectedArmy = army;
      inputHandler_any.isSettingPath = true;
      inputHandler_any.currentMode = MovementMode.NORMAL;

      // 経路点を追加
      const addWaypoint = inputHandler_any.addWaypoint.bind(inputHandler);
      addWaypoint(176, 160); // 1マス右
      addWaypoint(192, 160); // 2マス右

      // waypointBufferに経路点が追加されていることを確認
      expect(inputHandler_any.waypointBuffer.length).toBe(2);

      // キャンセル処理を実行
      const cancelPathSetting = inputHandler_any.cancelPathSetting.bind(inputHandler);
      cancelPathSetting();

      // 移動が開始されたことを確認
      expect(army.isMoving()).toBe(true);
      expect(commandSystem.getCommand(army.getId())).toBeDefined();
      expect(inputHandler_any.waypointBuffer.length).toBe(0);
      expect(inputHandler_any.waypointMarkers.length).toBe(0);
    });

    test('経路点が設定されていない状態でキャンセルした場合、軍団の選択が解除される', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      // 軍団を選択して経路設定モードにする
      const inputHandler_any = inputHandler as any;
      inputHandler_any.selectedArmy = army;
      inputHandler_any.isSettingPath = true;
      inputHandler_any.currentMode = MovementMode.NORMAL;

      // 経路点を追加せずにキャンセル
      expect(inputHandler_any.waypointBuffer.length).toBe(0);

      // キャンセル処理を実行
      const cancelPathSetting = inputHandler_any.cancelPathSetting.bind(inputHandler);
      cancelPathSetting();

      // 軍団の選択が解除されたことを確認
      expect(inputHandler_any.selectedArmy).toBeNull();
      expect(inputHandler_any.isSettingPath).toBe(false);
      expect(army.isMoving()).toBe(false);
      expect(commandSystem.getCommand(army.getId())).toBeNull();
    });

    test('右クリックで経路指定がキャンセルされる', () => {
      const army = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      if (!army) return;

      // 軍団を選択して経路設定モードにする
      const inputHandler_any = inputHandler as any;
      inputHandler_any.selectedArmy = army;
      inputHandler_any.isSettingPath = true;
      inputHandler_any.currentMode = MovementMode.NORMAL;

      // 経路点を1つ追加
      const addWaypoint = inputHandler_any.addWaypoint.bind(inputHandler);
      addWaypoint(176, 160);

      // 右クリックをシミュレート
      const handleRightClick = inputHandler_any.handleRightClick.bind(inputHandler);
      handleRightClick();

      // 経路点が1つあるので移動が開始されたことを確認
      expect(army.isMoving()).toBe(true);
      expect(commandSystem.getCommand(army.getId())).toBeDefined();
    });
  });
});
