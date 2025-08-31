import { ArmyManager } from '../../../src/army/ArmyManager';
import { BaseManager } from '../../../src/base/BaseManager';
import { BaseType } from '../../../src/types/BaseTypes';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { createMockScene } from '../../setup';

// CharacterFactoryのモック
jest.mock('../../../src/character/CharacterFactory');

describe('[エピック7] 拠点占領システム統合テスト', () => {
  let scene: any;
  let baseManager: BaseManager;
  let armyManager: ArmyManager;
  let mapManager: any;

  beforeAll(() => {
    // CharacterFactory.createCharacterのモック実装
    (CharacterFactory.createCharacter as jest.Mock).mockImplementation(
      (scene, x, y, jobType, name, customStats, isCommander) => {
        const character = {
          x,
          y,
          scene,
          setVisible: jest.fn(),
          setPosition: jest.fn(),
          destroy: jest.fn(),
          getStats: jest.fn(() => ({
            hp: customStats?.hp || 20,
            attack: customStats?.attack || 10,
            defense: customStats?.defense || 10,
            speed: customStats?.speed || 10,
            moveSpeed: 10,
            sight: 5,
          })),
          getName: jest.fn(() => name || 'TestCharacter'),
          getId: jest.fn(() => `char_${Math.random()}`),
          getJobType: jest.fn(() => jobType),
          getIsCommander: jest.fn(() => isCommander || false),
          getCommanderMarker: jest.fn(() => null),
          getPosition: jest.fn(() => ({ x, y })),
          isAlive: jest.fn(() => true),
          takeDamage: jest.fn(),
          getItemHolder: jest.fn(() => ({
            getEquippedWeapon: jest.fn(() => null),
          })),
        };
        return character;
      },
    );
  });

  beforeEach(() => {
    scene = createMockScene();

    // MapManagerのモック
    mapManager = {
      pixelToGrid: jest.fn((x: number, y: number) => ({
        x: Math.floor(x / 16),
        y: Math.floor(y / 16),
      })),
    };

    baseManager = new BaseManager(scene, mapManager);
    armyManager = new ArmyManager(scene);
    armyManager.setBaseManager(baseManager);
  });

  afterEach(() => {
    if (baseManager) {
      baseManager.destroy();
    }
  });

  describe('占領条件の確認', () => {
    test('拠点のHPが0かつ3マス以内にいる場合のみ占領可能', () => {
      // 中立拠点を追加
      const neutralBase = baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 0, // HPを0に設定
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成（拠点から1マスの位置に配置）
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16, // 1マス離れた位置（3マス以内）
        10 * 16,
        'shadow',
        '咲耶',
        { hp: 30, attack: 25, defense: 20 },
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領可能な拠点を確認
      const occupiableBase = armyManager.getOccupiableBase(army);
      expect(occupiableBase).toBe(neutralBase);
    });

    test('拠点のHPが残っている場合は占領不可', () => {
      // 中立拠点を追加（HPあり）
      baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 50, // HPが残っている
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成（拠点の隣に配置）
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        undefined,
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領可能な拠点を確認（nullになるはず）
      const occupiableBase = armyManager.getOccupiableBase(army);
      expect(occupiableBase).toBeNull();
    });

    test('3マスより離れている場合は占領不可', () => {
      // 中立拠点を追加
      baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 0,
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成（拠点から4マス以上離れた位置）
      const commander = CharacterFactory.createCharacter(
        scene,
        15 * 16, // 5マス離れた位置（3マスを超える）
        15 * 16,
        'shadow',
        '咲耶',
        undefined,
        true,
      );

      const army = armyManager.createArmy(commander, 15 * 16, 15 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領可能な拠点を確認（nullになるはず）
      const occupiableBase = armyManager.getOccupiableBase(army);
      expect(occupiableBase).toBeNull();
    });

    test('既に味方の拠点は占領不可', () => {
      // 味方拠点を追加
      baseManager.addBase({
        id: 'player-base',
        name: '味方拠点',
        type: BaseType.PLAYER_OCCUPIED,
        x: 10,
        y: 10,
        hp: 0, // HPが0でも味方拠点
        maxHp: 80,
        owner: 'player',
        income: 100,
      });

      // 軍団を作成（拠点の隣に配置）
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        undefined,
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領可能な拠点を確認（nullになるはず）
      const occupiableBase = armyManager.getOccupiableBase(army);
      expect(occupiableBase).toBeNull();
    });
  });

  describe('占領処理の実行', () => {
    test('中立拠点を占領すると味方拠点になる', () => {
      // 中立拠点を追加
      const neutralBase = baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 0,
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        { hp: 30 },
        true,
      );

      const member1 = CharacterFactory.createCharacter(scene, 11 * 16, 10 * 16, 'wind', '風忍A', {
        hp: 20,
      });

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      army.addSoldier(member1);

      // 占領実行
      baseManager.occupyBase(neutralBase, army);

      // 拠点の状態を確認
      expect(neutralBase.getOwner()).toBe('player');
      expect(neutralBase.getType()).toBe(BaseType.PLAYER_OCCUPIED);
      expect(neutralBase.getCurrentHp()).toBe(50); // 軍団の合計HP（30+20）
    });

    test('敵拠点を占領すると味方拠点になる', () => {
      // 敵拠点を追加
      const enemyBase = baseManager.addBase({
        id: 'enemy-base',
        name: '敵拠点',
        type: BaseType.ENEMY_OCCUPIED,
        x: 10,
        y: 10,
        hp: 0,
        maxHp: 80,
        owner: 'enemy',
        income: 100,
      });

      // 軍団を作成
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        { hp: 30 },
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領実行
      baseManager.occupyBase(enemyBase, army);

      // 拠点の状態を確認
      expect(enemyBase.getOwner()).toBe('player');
      expect(enemyBase.getType()).toBe(BaseType.PLAYER_OCCUPIED);
    });
  });

  describe('占領後の軍団駐留', () => {
    test('占領した軍団は自動的に駐留状態になる', () => {
      // 中立拠点を追加
      const neutralBase = baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 0,
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        undefined,
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領実行（ここで軍団が駐留状態になるはず）
      baseManager.occupyBase(neutralBase, army);
      armyManager.garrisonArmy(army, neutralBase.getId());

      // 軍団が駐留状態になっていることを確認
      expect(army.getIsGarrisoned()).toBe(true);
      expect(armyManager.getGarrisonedArmies(neutralBase.getId())).toContain(army);
    });

    test('駐留した軍団は拠点から出撃可能', () => {
      // 中立拠点を追加
      const neutralBase = baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 0,
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        undefined,
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領実行
      baseManager.occupyBase(neutralBase, army);
      armyManager.garrisonArmy(army, neutralBase.getId());

      // 駐留状態を確認
      expect(army.getIsGarrisoned()).toBe(true);

      // 出撃（駐留解除）
      const newPosition = { x: 12 * 16, y: 10 * 16 };
      armyManager.ungarrisonArmy(army, newPosition);

      // 駐留が解除されていることを確認
      expect(army.getIsGarrisoned()).toBe(false);
      expect(armyManager.getGarrisonedArmies(neutralBase.getId())).not.toContain(army);
    });
  });

  describe('実使用シナリオ', () => {
    test('中立拠点を攻撃して占領する一連の流れ', () => {
      // 中立拠点を追加（初期HP付き）
      const neutralBase = baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 10, // 初期HP
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 軍団を作成
      const commander = CharacterFactory.createCharacter(
        scene,
        11 * 16,
        10 * 16,
        'shadow',
        '咲耶',
        { hp: 30 },
        true,
      );

      const army = armyManager.createArmy(commander, 11 * 16, 10 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 最初は占領不可（HPが残っている）
      expect(armyManager.getOccupiableBase(army)).toBeNull();

      // 拠点を攻撃してHPを0にする
      for (let i = 0; i < 10; i++) {
        neutralBase.takeDamage(1);
      }
      expect(neutralBase.getCurrentHp()).toBe(0);

      // HPが0になったので占領可能
      expect(armyManager.getOccupiableBase(army)).toBe(neutralBase);

      // 占領実行
      baseManager.occupyBase(neutralBase, army);
      armyManager.garrisonArmy(army, neutralBase.getId());

      // 占領結果を確認
      expect(neutralBase.getOwner()).toBe('player');
      expect(neutralBase.getType()).toBe(BaseType.PLAYER_OCCUPIED);
      expect(neutralBase.getCurrentHp()).toBe(30); // 軍団のHP
      expect(army.getIsGarrisoned()).toBe(true);

      // 収入計算に反映されることを確認
      const income = baseManager.calculateIncome('player');
      expect(income).toBe(100); // 占領した拠点の収入
    });

    test('敵本拠地を占領して勝利条件を満たす', () => {
      // 敵本拠地を追加
      const enemyHQ = baseManager.addBase({
        id: 'enemy-hq',
        name: '風魔の砦',
        type: BaseType.ENEMY_HQ,
        x: 40,
        y: 40,
        hp: 0, // 攻撃でHPを0にした状態
        maxHp: 200,
        owner: 'enemy',
        income: 200,
      });

      // 味方軍団を作成（本拠地の隣に配置）
      const commander = CharacterFactory.createCharacter(
        scene,
        41 * 16,
        40 * 16,
        'shadow',
        '咲耶',
        { hp: 50 },
        true,
      );

      const army = armyManager.createArmy(commander, 41 * 16, 40 * 16, 'player');

      if (!army) {
        throw new Error('Failed to create army');
      }

      // 占領可能であることを確認
      expect(armyManager.getOccupiableBase(army)).toBe(enemyHQ);

      // 占領実行
      baseManager.occupyBase(enemyHQ, army);

      // 本拠地が味方のものになったことを確認
      expect(enemyHQ.getOwner()).toBe('player');
      // 注：本拠地タイプは変更されない（勝利判定用）
      expect(enemyHQ.getType()).toBe(BaseType.ENEMY_HQ);

      // 勝利条件の確認（敵本拠地を味方が所有）
      const isVictory = enemyHQ.getType() === BaseType.ENEMY_HQ && enemyHQ.getOwner() === 'player';
      expect(isVictory).toBe(true);
    });
  });
});
