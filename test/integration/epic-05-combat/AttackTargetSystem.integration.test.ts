import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { MapManager } from '../../../src/map/MapManager';
import { TileType } from '../../../src/types/TileTypes';
import { MapData } from '../../../src/types/MapTypes';
import { createMockScene } from '../../setup';

describe('[エピック5] 攻撃目標指定システム統合テスト', () => {
  let scene: any;
  let armyManager: ArmyManager;
  let mapManager: MapManager;

  beforeEach(() => {
    scene = createMockScene();

    // 簡易的なマップデータを作成
    const mapData: MapData = {
      name: 'testMap',
      width: 50,
      height: 50,
      tileSize: 16,
      layers: [
        {
          name: 'terrain',
          tiles: Array(50)
            .fill(null)
            .map(() => Array(50).fill(TileType.PLAIN)),
          visible: true,
        },
      ],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: 40, y: 40 },
      },
      bases: [],
    };

    mapManager = new MapManager(scene);
    mapManager.loadMap(mapData);
    armyManager = new ArmyManager(scene);
  });

  describe('攻撃目標の設定と解除', () => {
    test('軍団に攻撃目標を設定できる', () => {
      // プレイヤー軍団を作成
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);

      // 敵軍団を作成
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);

      if (!playerArmy || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 攻撃目標を設定
      playerArmy.setAttackTarget(enemyArmy);

      // 攻撃目標が設定されていることを確認
      expect(playerArmy.getAttackTarget()).toBe(enemyArmy);
      expect(playerArmy.hasAttackTarget()).toBe(true);
    });

    test('攻撃目標を解除できる', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);

      if (!playerArmy || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 攻撃目標を設定してから解除
      playerArmy.setAttackTarget(enemyArmy);
      playerArmy.clearAttackTarget();

      // 攻撃目標が解除されていることを確認
      expect(playerArmy.getAttackTarget()).toBeNull();
      expect(playerArmy.hasAttackTarget()).toBe(false);
    });

    test('攻撃目標が撃破された場合、自動的に解除される', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);

      if (!playerArmy || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 攻撃目標を設定
      playerArmy.setAttackTarget(enemyArmy);
      expect(playerArmy.hasAttackTarget()).toBe(true);

      // 敵軍団の全メンバーを撃破（軍団が非アクティブになる）
      const enemyMembers = enemyArmy.getAllMembers();
      enemyMembers.forEach((member) => {
        const stats = member.getStats();
        member.takeDamage(stats.hp);
      });

      // 敵軍団が非アクティブになったことを確認
      expect(enemyArmy.isActive()).toBe(false);

      // updateメソッドを呼び出して状態を更新
      playerArmy.update(0, 16);

      // 攻撃目標が自動的に解除されていることを確認
      expect(playerArmy.hasAttackTarget()).toBe(false);
      expect(playerArmy.getAttackTarget()).toBeNull();
    });
  });

  describe('視覚的フィードバック', () => {
    test('攻撃目標を設定するとマーカーが作成される', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);

      if (!playerArmy || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 攻撃目標を設定
      playerArmy.setAttackTarget(enemyArmy);

      // AttackTargetMarkerが作成されることを確認
      // (実際のマーカーは内部で作成されるため、モックの呼び出しを確認)
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.time.addEvent).toHaveBeenCalled();
    });
  });

  describe('複数の軍団での攻撃目標管理', () => {
    test('複数の軍団が同じ敵を攻撃目標に設定できる', () => {
      // 2つのプレイヤー軍団を作成
      const playerArmy1 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const playerArmy2 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 15, 10);

      // 敵軍団を作成
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);

      if (!playerArmy1 || !playerArmy2 || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 両方の軍団が同じ敵を攻撃目標に設定
      playerArmy1.setAttackTarget(enemyArmy);
      playerArmy2.setAttackTarget(enemyArmy);

      // 両方の軍団が同じ攻撃目標を持っていることを確認
      expect(playerArmy1.getAttackTarget()).toBe(enemyArmy);
      expect(playerArmy2.getAttackTarget()).toBe(enemyArmy);
    });

    test('軍団ごとに異なる攻撃目標を設定できる', () => {
      const playerArmy1 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
      const playerArmy2 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 15, 10);

      const enemyArmy1 = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);
      const enemyArmy2 = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 25, 20);

      if (!playerArmy1 || !playerArmy2 || !enemyArmy1 || !enemyArmy2) {
        throw new Error('Failed to create armies');
      }

      // それぞれ異なる攻撃目標を設定
      playerArmy1.setAttackTarget(enemyArmy1);
      playerArmy2.setAttackTarget(enemyArmy2);

      // それぞれ異なる攻撃目標を持っていることを確認
      expect(playerArmy1.getAttackTarget()).toBe(enemyArmy1);
      expect(playerArmy2.getAttackTarget()).toBe(enemyArmy2);
    });
  });
});
