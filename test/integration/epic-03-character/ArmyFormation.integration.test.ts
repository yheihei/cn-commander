import { createMockScene } from '../../setup';
import { BaseManager } from '../../../src/base/BaseManager';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { Base } from '../../../src/base/Base';
import { BaseType } from '../../../src/types/MapTypes';
import { ArmyFormationData } from '../../../src/types/ArmyFormationTypes';
import { MapManager } from '../../../src/map/MapManager';

type MockScene = ReturnType<typeof createMockScene>;

describe('[エピック3] Army Formation Integration Tests', () => {
  let scene: MockScene;
  let baseManager: BaseManager;
  let armyManager: ArmyManager;
  let mapManager: MapManager;
  let playerBase: Base;

  beforeEach(() => {
    scene = createMockScene() as MockScene;
    mapManager = new MapManager(scene as any);
    baseManager = new BaseManager(scene as any, mapManager);
    armyManager = new ArmyManager(scene as any);

    // GameSceneに必要なプロパティを追加
    (scene as any).baseManager = baseManager;
    (scene as any).armyManager = armyManager;
    (scene as any).mapManager = mapManager;

    // プレイヤー拠点を作成
    playerBase = baseManager.addBase({
      id: 'player_hq',
      name: '甲賀の里',
      type: BaseType.PLAYER_HQ,
      x: 10,
      y: 10,
      maxHp: 200,
      hp: 200,
      income: 200,
      owner: 'player',
    });
  });

  afterEach(() => {
    baseManager.destroy();
    armyManager.destroy();
    mapManager.destroy();
  });

  describe('待機兵士管理', () => {
    test('拠点に待機兵士を追加できる', () => {
      // Arrange
      const soldier1 = CharacterFactory.createCharacter(scene as any, 0, 0, 'wind', '風忍太郎', {
        hp: 30,
        maxHp: 30,
        attack: 20,
        defense: 10,
        speed: 20,
        moveSpeed: 13,
        sight: 8,
      });

      // Act
      baseManager.addWaitingSoldier('player_hq', soldier1);
      const waitingSoldiers = baseManager.getWaitingSoldiers('player_hq');

      // Assert
      expect(waitingSoldiers).toHaveLength(1);
      expect(waitingSoldiers[0]).toBe(soldier1);
    });

    test('複数の待機兵士を削除できる', () => {
      // Arrange
      const soldiers = Array.from({ length: 3 }, (_, i) =>
        CharacterFactory.createCharacter(scene as any, 0, 0, 'wind', `兵士${i}`, {
          hp: 30,
          maxHp: 30,
          attack: 20,
          defense: 10,
          speed: 20,
          moveSpeed: 13,
          sight: 8,
        }),
      );
      soldiers.forEach((s) => baseManager.addWaitingSoldier('player_hq', s));

      // Act
      baseManager.removeWaitingSoldiers('player_hq', [soldiers[0], soldiers[2]]);
      const remaining = baseManager.getWaitingSoldiers('player_hq');

      // Assert
      expect(remaining).toHaveLength(1);
      expect(remaining[0]).toBe(soldiers[1]);
    });
  });

  describe('軍団編成と出撃', () => {
    test('拠点から軍団を出撃させることができる', () => {
      // Arrange
      const commander = CharacterFactory.createCharacter(
        scene as any,
        0,
        0,
        'wind',
        '咲耶',
        {
          hp: 40,
          maxHp: 40,
          attack: 25,
          defense: 15,
          speed: 22,
          moveSpeed: 15,
          sight: 10,
        },
        true,
      );

      const soldiers = Array.from({ length: 3 }, (_, i) =>
        CharacterFactory.createCharacter(scene as any, 0, 0, 'iron', `兵士${i}`, {
          hp: 50,
          maxHp: 50,
          attack: 20,
          defense: 25,
          speed: 15,
          moveSpeed: 8,
          sight: 6,
        }),
      );

      const formationData: ArmyFormationData = {
        commander,
        soldiers,
        items: new Map(),
        deployPosition: { x: 11, y: 11 }, // 拠点の隣
      };

      // Act
      const army = armyManager.createArmyFromBase(formationData, playerBase);

      // Assert
      expect(army).toBeTruthy();
      expect(army!.getCommander()).toBe(commander);
      expect(army!.getSoldiers()).toEqual(soldiers);
      expect(army!.getOwner()).toBe('player');
      expect(army!.getMemberCount()).toBe(4);
    });

    test('最大軍団数を超えて出撃できない', () => {
      // Arrange - 最大数まで軍団を作成
      for (let i = 0; i < 6; i++) {
        const commander = CharacterFactory.createCharacter(
          scene as any,
          0,
          0,
          'wind',
          `指揮官${i}`,
          {
            hp: 30,
            maxHp: 30,
            attack: 20,
            defense: 10,
            speed: 20,
            moveSpeed: 13,
            sight: 8,
          },
          true,
        );
        armyManager.createArmy(commander, i * 32, i * 32, 'player');
      }

      const newCommander = CharacterFactory.createCharacter(
        scene as any,
        0,
        0,
        'wind',
        '新指揮官',
        {
          hp: 30,
          maxHp: 30,
          attack: 20,
          defense: 10,
          speed: 20,
          moveSpeed: 13,
          sight: 8,
        },
        true,
      );

      const formationData: ArmyFormationData = {
        commander: newCommander,
        soldiers: [],
        items: new Map(),
        deployPosition: { x: 11, y: 11 },
      };

      // Act
      const army = armyManager.createArmyFromBase(formationData, playerBase);

      // Assert
      expect(army).toBeNull();
      expect(armyManager.getAllArmies()).toHaveLength(6);
    });
  });

  describe('出撃位置の検証', () => {
    test('有効な出撃位置を取得できる', () => {
      // Act
      const validPositions = armyManager.getValidDeployPositions(playerBase);

      // Assert
      // 5x5の範囲（25マス）から拠点の2x2（4マス）を除いた21マス
      expect(validPositions.length).toBeGreaterThan(0);
      expect(validPositions.length).toBeLessThanOrEqual(21);

      // すべての位置が拠点から2マス以内であることを確認
      validPositions.forEach((pos: { x: number; y: number }) => {
        const dx = Math.abs(pos.x - 11); // 拠点の中心座標
        const dy = Math.abs(pos.y - 11);
        expect(Math.max(dx, dy)).toBeLessThanOrEqual(2);
      });
    });

    test('拠点から3マス以上離れた位置は無効', () => {
      // Act
      const isValid = armyManager.validateDeployPosition({ x: 14, y: 14 }, playerBase);

      // Assert
      expect(isValid).toBe(false);
    });

    test('他の軍団がいる位置は無効', () => {
      // Arrange
      const commander = CharacterFactory.createCharacter(
        scene as any,
        0,
        0,
        'wind',
        '既存指揮官',
        {
          hp: 30,
          maxHp: 30,
          attack: 20,
          defense: 10,
          speed: 20,
          moveSpeed: 13,
          sight: 8,
        },
        true,
      );
      armyManager.createArmyAtGrid(commander, 11, 11, 'player');

      // Act
      const isValid = armyManager.validateDeployPosition({ x: 11, y: 11 }, playerBase);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('軍団編成フロー', () => {
    test('完全な軍団編成と出撃フロー', () => {
      // Arrange
      // 待機兵士を拠点に追加
      const commander = CharacterFactory.createCharacter(
        scene as any,
        0,
        0,
        'shadow',
        '咲耶',
        {
          hp: 35,
          maxHp: 35,
          attack: 30,
          defense: 12,
          speed: 25,
          moveSpeed: 12,
          sight: 11,
        },
        true,
      );

      const soldiers = Array.from({ length: 5 }, (_, i) =>
        CharacterFactory.createCharacter(
          scene as any,
          0,
          0,
          i % 2 === 0 ? 'wind' : 'medicine',
          `忍者${i}`,
          {
            hp: 30,
            maxHp: 30,
            attack: 20,
            defense: 10,
            speed: 20,
            moveSpeed: 10,
            sight: 8,
          },
        ),
      );

      // すべての兵士を待機リストに追加
      baseManager.addWaitingSoldier('player_hq', commander);
      soldiers.forEach((s) => baseManager.addWaitingSoldier('player_hq', s));

      // 軍団編成データを作成（3名を選択）
      const selectedSoldiers = soldiers.slice(0, 3);
      const formationData: ArmyFormationData = {
        commander,
        soldiers: selectedSoldiers,
        items: new Map(), // アイテムは別タスクで実装
        deployPosition: { x: 12, y: 10 }, // 拠点の右側
      };

      // Act
      // 軍団を作成
      const army = armyManager.createArmyFromBase(formationData, playerBase);

      // 待機兵士から削除
      if (army) {
        const soldiersToRemove = [commander, ...selectedSoldiers];
        baseManager.removeWaitingSoldiers('player_hq', soldiersToRemove);
      }

      // Assert
      expect(army).toBeTruthy();
      expect(army!.getName()).toBe('咲耶の軍団');
      expect(army!.getMemberCount()).toBe(4);

      // 待機兵士リストから削除されていることを確認
      const remainingWaitingSoldiers = baseManager.getWaitingSoldiers('player_hq');
      expect(remainingWaitingSoldiers).toHaveLength(2);
      expect(remainingWaitingSoldiers).toEqual(soldiers.slice(3));

      // 軍団の位置が正しいことを確認
      const expectedX = 12 * 16 + 8; // タイル座標からピクセル座標への変換
      const expectedY = 10 * 16 + 8;
      expect(army!.x).toBe(expectedX);
      expect(army!.y).toBe(expectedY);
    });
  });
});
