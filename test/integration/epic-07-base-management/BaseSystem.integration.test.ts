import { BaseManager } from '../../../src/base/BaseManager';
import { BaseCombatSystem } from '../../../src/base/BaseCombatSystem';
import { BaseType } from '../../../src/types/MapTypes';
import { createMockScene } from '../../setup';

describe('[エピック7] 拠点システム統合テスト', () => {
  let scene: any;
  let baseManager: BaseManager;
  let mapManager: any;

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
  });

  afterEach(() => {
    if (baseManager) {
      baseManager.destroy();
    }
  });

  describe('拠点基本システム (task-7-1)', () => {
    test('拠点を作成できる', () => {
      const baseData = {
        id: 'test-base',
        name: 'テスト拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 80,
        maxHp: 80,
        owner: 'neutral' as const,
        income: 100,
      };

      const base = baseManager.addBase(baseData);

      expect(base).toBeDefined();
      expect(base.getId()).toBe('test-base');
      expect(base.getName()).toBe('テスト拠点');
      expect(base.getType()).toBe(BaseType.NEUTRAL);
      expect(base.getPosition()).toEqual({ x: 10, y: 10 });
    });

    test('拠点のHPを管理できる', () => {
      const baseData = {
        id: 'test-base',
        name: 'テスト拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 80,
        maxHp: 80,
        owner: 'neutral' as const,
      };

      const base = baseManager.addBase(baseData);

      expect(base.getCurrentHp()).toBe(80);
      expect(base.getMaxHp()).toBe(80);
      expect(base.getHpPercentage()).toBe(100);
    });

    test('拠点の所有者を変更できる', () => {
      const baseData = {
        id: 'test-base',
        name: 'テスト拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 80,
        maxHp: 80,
        owner: 'neutral' as const,
      };

      const base = baseManager.addBase(baseData);
      expect(base.getOwner()).toBe('neutral');

      base.changeOwner('player');
      expect(base.getOwner()).toBe('player');
      expect(base.getType()).toBe(BaseType.PLAYER_OCCUPIED);
    });

    test('所有者別に拠点を取得できる', () => {
      // 複数の拠点を追加
      baseManager.addBase({
        id: 'player-base',
        name: 'プレイヤー拠点',
        type: BaseType.PLAYER_HQ,
        x: 5,
        y: 5,
        hp: 200,
        maxHp: 200,
        owner: 'player',
        income: 200,
      });

      baseManager.addBase({
        id: 'enemy-base',
        name: '敵拠点',
        type: BaseType.ENEMY_HQ,
        x: 45,
        y: 45,
        hp: 200,
        maxHp: 200,
        owner: 'enemy',
        income: 200,
      });

      baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 25,
        y: 25,
        hp: 80,
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      const playerBases = baseManager.getBasesByOwner('player');
      const enemyBases = baseManager.getBasesByOwner('enemy');
      const neutralBases = baseManager.getBasesByOwner('neutral');

      expect(playerBases).toHaveLength(1);
      expect(enemyBases).toHaveLength(1);
      expect(neutralBases).toHaveLength(1);
    });

    test('収入を計算できる', () => {
      baseManager.addBase({
        id: 'player-hq',
        name: 'プレイヤー本拠地',
        type: BaseType.PLAYER_HQ,
        x: 5,
        y: 5,
        hp: 200,
        maxHp: 200,
        owner: 'player',
        income: 200,
      });

      baseManager.addBase({
        id: 'player-base-1',
        name: 'プレイヤー拠点1',
        type: BaseType.PLAYER_OCCUPIED,
        x: 15,
        y: 15,
        hp: 80,
        maxHp: 80,
        owner: 'player',
        income: 100,
      });

      const income = baseManager.calculateIncome('player');
      expect(income).toBe(300); // 200 + 100
    });
  });

  describe('拠点戦闘システム (task-7-2)', () => {
    test('拠点にダメージを与えられる', () => {
      const baseData = {
        id: 'test-base',
        name: 'テスト拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 80,
        maxHp: 80,
        owner: 'neutral' as const,
      };

      const base = baseManager.addBase(baseData);

      // ダメージを与える
      const isDestroyed = base.takeDamage(20);

      expect(base.getCurrentHp()).toBe(60);
      expect(isDestroyed).toBe(false);
      expect(base.getHpPercentage()).toBe(75);
    });

    test('拠点を破壊できる', () => {
      const baseData = {
        id: 'test-base',
        name: 'テスト拠点',
        type: BaseType.NEUTRAL,
        x: 10,
        y: 10,
        hp: 10,
        maxHp: 80,
        owner: 'neutral' as const,
      };

      const base = baseManager.addBase(baseData);

      // 残りHP以上のダメージを与える
      const isDestroyed = base.takeDamage(10);

      expect(base.getCurrentHp()).toBe(0);
      expect(isDestroyed).toBe(true);
      expect(base.isDestroyed()).toBe(true);
      expect(base.isAttackable()).toBe(false);
    });

    test('拠点の防御値が正しく設定される', () => {
      // 本拠地
      const hqBase = baseManager.addBase({
        id: 'hq',
        name: '本拠地',
        type: BaseType.PLAYER_HQ,
        x: 10,
        y: 10,
        hp: 200,
        maxHp: 200,
        owner: 'player',
      });

      // 通常拠点
      const normalBase = baseManager.addBase({
        id: 'normal',
        name: '通常拠点',
        type: BaseType.NEUTRAL,
        x: 20,
        y: 20,
        hp: 80,
        maxHp: 80,
        owner: 'neutral',
      });

      expect(hqBase.getDefenseBonus()).toBe(30);
      expect(normalBase.getDefenseBonus()).toBe(20);
    });

    test('拠点への攻撃処理', () => {
      const mockCharacter = {
        getId: jest.fn(() => 'char-1'),
        isAlive: jest.fn(() => true),
        getStats: jest.fn(() => ({ attack: 30 })),
        getItemHolder: jest.fn(() => ({
          getEquippedWeapon: () => ({
            attackBonus: 10,
            minRange: 1,
            maxRange: 6,  // 手裏剣の射程に変更
            durability: 50,
          }),
        })),
        x: 11 * 16,
        y: 11 * 16,
      };

      const baseCombatSystem = new BaseCombatSystem(scene, baseManager);

      const targetBase = baseManager.addBase({
        id: 'enemy-base',
        name: '敵拠点',
        type: BaseType.ENEMY_HQ,
        x: 12,
        y: 12,
        hp: 50,
        maxHp: 200,
        owner: 'enemy',
      });

      // 攻撃可能チェック
      const canAttack = baseCombatSystem.canAttackBase(mockCharacter as any, targetBase);
      expect(canAttack).toBe(true);

      // 距離計算
      const distance = baseCombatSystem.getDistanceToBase({ x: 11, y: 11 }, targetBase);
      expect(distance).toBe(4); // マンハッタン距離 (拠点中心(13,13)まで|13-11|+|13-11|=4)

      // 射程内チェック
      const inRange = baseCombatSystem.isBaseInRange(mockCharacter as any, targetBase);
      expect(inRange).toBe(true);
    });
  });

  describe('実使用シナリオ', () => {
    test('ゲーム開始時の拠点配置', () => {
      baseManager.setupInitialBases();

      const allBases = baseManager.getAllBases();
      expect(allBases).toHaveLength(4); // 本拠地2つ、中立拠点2つ

      const playerBases = baseManager.getBasesByOwner('player');
      expect(playerBases).toHaveLength(1);
      expect(playerBases[0].getType()).toBe(BaseType.PLAYER_HQ);

      const enemyBases = baseManager.getBasesByOwner('enemy');
      expect(enemyBases).toHaveLength(1);
      expect(enemyBases[0].getType()).toBe(BaseType.ENEMY_HQ);

      const neutralBases = baseManager.getBasesByOwner('neutral');
      expect(neutralBases).toHaveLength(2);
    });

    test('拠点占領のシナリオ', () => {
      const neutralBase = baseManager.addBase({
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 25,
        y: 25,
        hp: 80,
        maxHp: 80,
        owner: 'neutral',
        income: 100,
      });

      // 初期状態の確認
      expect(neutralBase.getOwner()).toBe('neutral');
      expect(baseManager.calculateIncome('player')).toBe(0);

      // 拠点を攻撃して破壊
      let destroyed = false;
      while (!destroyed) {
        destroyed = neutralBase.takeDamage(10);
      }
      expect(neutralBase.isDestroyed()).toBe(true);

      // 占領
      neutralBase.changeOwner('player');
      neutralBase.heal(50); // 占領時にHPを回復

      // 占領後の状態確認
      expect(neutralBase.getOwner()).toBe('player');
      expect(neutralBase.getType()).toBe(BaseType.PLAYER_OCCUPIED);
      expect(neutralBase.getCurrentHp()).toBe(50);
      expect(baseManager.calculateIncome('player')).toBe(100);
    });

    test('最も近い拠点を取得', () => {
      baseManager.setupInitialBases();

      // (15, 15)から最も近い拠点を取得
      const nearestBase = baseManager.getNearestBase(15, 15);
      expect(nearestBase).toBeDefined();
      expect(nearestBase?.getName()).toBe('甲賀の里'); // (10, 10)の味方本拠地

      // 敵拠点のみをフィルタ
      const nearestEnemyBase = baseManager.getNearestBase(
        15,
        15,
        (base) => base.getOwner() === 'enemy',
      );
      expect(nearestEnemyBase).toBeDefined();
      expect(nearestEnemyBase?.getName()).toBe('風魔の砦');
    });
  });
});
