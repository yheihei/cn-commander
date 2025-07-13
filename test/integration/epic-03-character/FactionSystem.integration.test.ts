import { ArmyManager } from '../../../src/army/ArmyManager';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { createMockScene } from '../../setup';

describe('[エピック3] FactionSystem Integration Tests', () => {
  let scene: any;
  let armyManager: ArmyManager;

  beforeEach(() => {
    scene = createMockScene();
    armyManager = new ArmyManager(scene);
  });

  afterEach(() => {
    armyManager.destroy();
  });

  describe('軍団所属識別システム', () => {
    test('プレイヤー軍団の所属が正しく設定される', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);

      expect(playerArmy).toBeTruthy();
      expect(playerArmy!.getOwner()).toBe('player');
      expect(playerArmy!.isPlayerArmy()).toBe(true);
      expect(playerArmy!.isEnemyArmy()).toBe(false);
      expect(playerArmy!.isNeutralArmy()).toBe(false);
    });

    test('敵軍団の所属が正しく設定される', () => {
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20, 'normal');

      expect(enemyArmy).toBeTruthy();
      expect(enemyArmy!.getOwner()).toBe('enemy');
      expect(enemyArmy!.isPlayerArmy()).toBe(false);
      expect(enemyArmy!.isEnemyArmy()).toBe(true);
      expect(enemyArmy!.isNeutralArmy()).toBe(false);
    });

    test('テスト軍団（中立）の所属が正しく設定される', () => {
      const neutralArmy = ArmyFactory.createTestArmyAtGrid(
        scene,
        armyManager,
        15,
        15,
        'balanced',
      );

      expect(neutralArmy).toBeTruthy();
      expect(neutralArmy!.getOwner()).toBe('neutral');
      expect(neutralArmy!.isPlayerArmy()).toBe(false);
      expect(neutralArmy!.isEnemyArmy()).toBe(false);
      expect(neutralArmy!.isNeutralArmy()).toBe(true);
    });
  });

  describe('敵味方判定メソッド', () => {
    test('敵味方関係が正しく判定される', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20, 'normal');

      expect(playerArmy).toBeTruthy();
      expect(enemyArmy).toBeTruthy();

      // プレイヤーと敵は敵対関係
      expect(playerArmy!.isHostileTo(enemyArmy!)).toBe(true);
      expect(enemyArmy!.isHostileTo(playerArmy!)).toBe(true);

      // 同陣営ではない
      expect(playerArmy!.isAlliedWith(enemyArmy!)).toBe(false);
      expect(enemyArmy!.isAlliedWith(playerArmy!)).toBe(false);
    });

    test('同盟関係が正しく判定される', () => {
      const playerArmy1 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const playerArmy2 = ArmyFactory.createPlayerArmy(scene, armyManager, 200, 200);

      expect(playerArmy1).toBeTruthy();
      expect(playerArmy2).toBeTruthy();

      // 同じプレイヤー陣営は同盟関係
      expect(playerArmy1!.isAlliedWith(playerArmy2!)).toBe(true);
      expect(playerArmy2!.isAlliedWith(playerArmy1!)).toBe(true);

      // 敵対関係ではない
      expect(playerArmy1!.isHostileTo(playerArmy2!)).toBe(false);
      expect(playerArmy2!.isHostileTo(playerArmy1!)).toBe(false);
    });

    test('中立軍団は誰とも敵対しない', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20, 'normal');
      const neutralArmy = ArmyFactory.createTestArmyAtGrid(
        scene,
        armyManager,
        15,
        15,
        'balanced',
      );

      expect(playerArmy).toBeTruthy();
      expect(enemyArmy).toBeTruthy();
      expect(neutralArmy).toBeTruthy();

      // 中立軍団は誰とも敵対しない
      expect(neutralArmy!.isHostileTo(playerArmy!)).toBe(false);
      expect(neutralArmy!.isHostileTo(enemyArmy!)).toBe(false);
      expect(playerArmy!.isHostileTo(neutralArmy!)).toBe(false);
      expect(enemyArmy!.isHostileTo(neutralArmy!)).toBe(false);

      // 中立軍団同士は同盟関係
      const neutralArmy2 = ArmyFactory.createTestArmy(scene, armyManager, 100, 100, 'speed');
      expect(neutralArmy2).toBeTruthy();
      expect(neutralArmy!.isAlliedWith(neutralArmy2!)).toBe(true);
    });
  });

  describe('複数軍団の管理', () => {
    test('異なる所属の軍団が混在して管理できる', () => {
      ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20, 'normal');
      ArmyFactory.createTestArmyAtGrid(scene, armyManager, 15, 15, 'balanced');

      const allArmies = armyManager.getAllArmies();
      expect(allArmies.length).toBe(3);

      // 各軍団の所属が正しく保持されている
      const owners = allArmies.map((army) => army.getOwner());
      expect(owners).toContain('player');
      expect(owners).toContain('enemy');
      expect(owners).toContain('neutral');
    });
  });
});