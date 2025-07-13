import { MovementCommandSystem } from '../../../src/movement/MovementCommand';
import { MovementCalculator } from '../../../src/movement/MovementCalculator';
import { MovementProcessor } from '../../../src/movement/MovementProcessor';
import { MovementMode, MOVEMENT_CONSTRAINTS } from '../../../src/types/MovementTypes';
import { TileType } from '../../../src/types/TileTypes';
import { createMockArmy, createMockMapManager } from '../../fixtures/mockFactories';

describe('[エピック4] MovementSystem Integration Tests', () => {
  let commandSystem: MovementCommandSystem;
  let calculator: MovementCalculator;
  let processor: MovementProcessor;

  beforeEach(() => {
    commandSystem = new MovementCommandSystem();
    calculator = new MovementCalculator();
    processor = new MovementProcessor(commandSystem);
  });

  describe('移動指示システム', () => {
    test('経路指定と移動コマンドの生成', () => {
      const army = createMockArmy('army1', {
        commander: { moveSpeed: 12 },
        soldiers: [{ moveSpeed: 10 }, { moveSpeed: 12 }, { moveSpeed: 13 }],
      });

      const waypoints = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
      ];

      commandSystem.setPath(army, waypoints, MovementMode.NORMAL);

      const command = commandSystem.getCommand(army.getId());
      expect(command).toBeTruthy();
      expect(command?.path.waypoints).toHaveLength(3);
      expect(command?.mode).toBe(MovementMode.NORMAL);
    });

    test('最大4地点の経路制限', () => {
      const army = createMockArmy('army1');

      const waypoints = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 200 },
        { x: 300, y: 300 }, // 5番目は無視される
      ];

      commandSystem.setPath(army, waypoints, MovementMode.NORMAL);

      const command = commandSystem.getCommand(army.getId());
      expect(command?.path.waypoints).toHaveLength(MOVEMENT_CONSTRAINTS.maxWaypoints);
    });

    test('移動のキャンセル', () => {
      const army = createMockArmy('army1');
      const waypoints = [{ x: 100, y: 100 }];

      commandSystem.setPath(army, waypoints, MovementMode.NORMAL);
      expect(commandSystem.isMoving(army.getId())).toBe(true);

      commandSystem.cancelMovement(army.getId());
      expect(commandSystem.isMoving(army.getId())).toBe(false);
    });
  });

  describe('移動速度計算', () => {
    test('軍団平均速度の計算', () => {
      const army = createMockArmy('army1', {
        commander: { moveSpeed: 13 },
        soldiers: [{ moveSpeed: 10 }, { moveSpeed: 12 }, { moveSpeed: 13 }],
      });

      const avgSpeed = calculator.calculateArmySpeed(army);
      expect(avgSpeed).toBe(12); // (13 + 10 + 12 + 13) / 4 = 12
    });

    test('通常移動での速度計算', () => {
      const army = createMockArmy('army1', {
        commander: { moveSpeed: 12 },
        soldiers: [{ moveSpeed: 12 }, { moveSpeed: 12 }, { moveSpeed: 12 }],
      });

      const timePerTile = calculator.calculateMovementTime(
        army,
        MovementMode.NORMAL,
        TileType.PLAIN,
      );

      expect(timePerTile).toBeCloseTo(3.33, 2); // (40 / 12) × 1.0 × 1.0
    });

    test('戦闘移動での速度計算', () => {
      const army = createMockArmy('army1', {
        commander: { moveSpeed: 12 },
        soldiers: [{ moveSpeed: 12 }, { moveSpeed: 12 }, { moveSpeed: 12 }],
      });

      const timePerTile = calculator.calculateMovementTime(
        army,
        MovementMode.COMBAT,
        TileType.PLAIN,
      );

      expect(timePerTile).toBeCloseTo(5.56, 2); // (40 / 12) × (1 / 0.6) × 1.0
    });

    test('地形効果の適用', () => {
      const army = createMockArmy('army1', {
        commander: { moveSpeed: 8 },
        soldiers: [{ moveSpeed: 10 }, { moveSpeed: 11 }, { moveSpeed: 12 }],
      });

      const timePerTile = calculator.calculateMovementTime(
        army,
        MovementMode.COMBAT,
        TileType.FOREST,
      );

      // 軍団速度 = (8 + 10 + 11 + 12) / 4 = 10.25
      // (40 / 10.25) × (1 / 0.6) × 1.5 = 9.76
      expect(timePerTile).toBeCloseTo(9.76, 2);
    });

    test('待機モードでの移動速度', () => {
      const army = createMockArmy('army1');

      const pixelSpeed = calculator.calculatePixelSpeed(army, MovementMode.STANDBY, TileType.PLAIN);

      expect(pixelSpeed).toBe(0); // 待機モードでは移動しない
    });
  });

  describe('移動処理', () => {
    test('目標地点への移動', () => {
      const army = createMockArmy('army1');
      const mapManager = createMockMapManager();

      // 初期位置を設定
      army.x = 0;
      army.y = 0;

      // 移動コマンドを設定
      commandSystem.setPath(army, [{ x: 100, y: 0 }], MovementMode.NORMAL);

      // 移動処理を複数フレーム実行（より長い時間）
      for (let i = 0; i < 50; i++) {
        processor.updateMovement(army, 1000, mapManager); // 1秒ずつ進める
      }

      // 目標地点に到達しているはず
      expect(army.x).toBeCloseTo(100, 0);
      expect(army.y).toBeCloseTo(0, 0);
    });

    test('複数経路点の移動', () => {
      const army = createMockArmy('army1');
      const mapManager = createMockMapManager();

      army.x = 0;
      army.y = 0;

      const waypoints = [
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];

      commandSystem.setPath(army, waypoints, MovementMode.NORMAL);

      // 十分な時間移動処理を実行
      for (let i = 0; i < 100; i++) {
        processor.updateMovement(army, 1000, mapManager);
      }

      // 最終地点に到達しているはず
      expect(army.x).toBeCloseTo(0, 0);
      expect(army.y).toBeCloseTo(100, 0);
      expect(commandSystem.isMoving(army.getId())).toBe(false);
    });

    test('地形による速度変化', () => {
      const army = createMockArmy('army1');
      const mapManager = createMockMapManager();

      // 森林地形をモック
      jest.spyOn(mapManager, 'getTileAt').mockReturnValue({
        getTileType: () => TileType.FOREST,
        isWalkable: () => true,
      } as any);

      army.x = 0;
      army.y = 0;

      commandSystem.setPath(army, [{ x: 100, y: 0 }], MovementMode.NORMAL);

      // 1秒間移動
      processor.updateMovement(army, 1000, mapManager);

      // 森林での移動は遅いので、平地より移動距離が短い
      expect(army.x).toBeLessThan(10); // 具体的な値は軍団速度に依存
    });
  });

  describe('実使用シナリオ', () => {
    test('軍団の選択から移動完了までの一連の流れ', () => {
      const army = createMockArmy('army1', {
        commander: { moveSpeed: 13 },
        soldiers: [{ moveSpeed: 10 }, { moveSpeed: 12 }, { moveSpeed: 13 }],
      });
      const mapManager = createMockMapManager();

      // 1. 軍団を配置
      army.x = 50;
      army.y = 50;

      // 2. 移動経路を設定
      const waypoints = [
        { x: 150, y: 50 },
        { x: 150, y: 150 },
        { x: 250, y: 150 },
      ];
      commandSystem.setPath(army, waypoints, MovementMode.COMBAT);

      // 3. 移動を実行
      let frameCount = 0;
      const maxFrames = 2000; // 十分なフレーム数

      while (commandSystem.isMoving(army.getId()) && frameCount < maxFrames) {
        processor.updateMovement(army, 100, mapManager); // 0.1秒ずつ
        frameCount++;
      }

      // 4. 移動完了の確認
      // 移動が完了していない場合、中間地点で止まっている可能性がある
      if (commandSystem.isMoving(army.getId())) {
        console.log(`Army still moving at position: ${army.x}, ${army.y}`);
      }
      expect(army.x).toBeCloseTo(250, -1); // 10の範囲で許容
      expect(army.y).toBeCloseTo(150, 0);
      expect(commandSystem.isMoving(army.getId())).toBe(false);
    });

    test('移動中のモード切り替え', () => {
      const army = createMockArmy('army1');
      const mapManager = createMockMapManager();

      army.x = 0;
      army.y = 0;

      // 通常移動で開始
      commandSystem.setPath(army, [{ x: 200, y: 0 }], MovementMode.NORMAL);

      // 途中で戦闘移動に切り替え
      processor.updateMovement(army, 1000, mapManager);
      commandSystem.changeMode(army.getId(), MovementMode.COMBAT);

      const command = commandSystem.getCommand(army.getId());
      expect(command?.mode).toBe(MovementMode.COMBAT);
    });
  });
});
