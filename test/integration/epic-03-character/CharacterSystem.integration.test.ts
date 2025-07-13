import { Character } from '../../../src/character/Character';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { JobFactory } from '../../../src/character/jobs';
import { Army } from '../../../src/army/Army';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { CharacterStats, JobType } from '../../../src/types/CharacterTypes';
import { ARMY_CONSTRAINTS } from '../../../src/types/ArmyTypes';
import { createMockScene } from '../../setup';

describe('[エピック3] Character and Army System Integration Tests', () => {
  let scene: any;

  beforeEach(() => {
    scene = createMockScene();
  });

  describe('キャラクター基本システム', () => {
    test('キャラクターが正しく作成される', () => {
      const character = CharacterFactory.createCharacter(scene, 100, 100, 'wind', 'テスト忍者');

      expect(character).toBeInstanceOf(Character);
      expect(character.getName()).toBe('テスト忍者');
      expect(character.getJobType()).toBe('wind');
      expect(character.isAlive()).toBe(true);
    });

    test('能力値が範囲内に制限される', () => {
      const customStats: Partial<CharacterStats> = {
        hp: 150,
        attack: 120,
        defense: 0,
        speed: 100,
      };

      const character = CharacterFactory.createCharacter(
        scene,
        0,
        0,
        'iron',
        'テスト',
        customStats,
      );
      const stats = character.getStats();

      expect(stats.hp).toBeLessThanOrEqual(stats.maxHp);
      expect(stats.attack).toBeLessThanOrEqual(100);
      expect(stats.defense).toBeGreaterThanOrEqual(3);
      expect(stats.speed).toBeLessThanOrEqual(50);
    });

    test('ダメージと回復が正しく処理される', () => {
      const character = CharacterFactory.createCharacter(scene, 0, 0, 'shadow');
      const initialHp = character.getStats().hp;

      character.takeDamage(20);
      expect(character.getStats().hp).toBe(initialHp - 20);

      character.heal(10);
      expect(character.getStats().hp).toBe(initialHp - 10);

      character.heal(100);
      expect(character.getStats().hp).toBe(character.getStats().maxHp);
    });

    test('攻撃間隔が正しく計算される', () => {
      const character = CharacterFactory.createCharacter(scene, 0, 0, 'wind');
      const stats = character.getStats();
      const expectedInterval = 90 / stats.speed;

      expect(character.getAttackInterval()).toBeCloseTo(expectedInterval);
    });
  });

  describe('職業システム', () => {
    test('全ての職業が作成可能', () => {
      const jobTypes: JobType[] = ['wind', 'iron', 'shadow', 'medicine'];

      jobTypes.forEach((type) => {
        const job = JobFactory.createJob(type);
        expect(job).toBeDefined();
        expect(job.type).toBe(type);
      });
    });

    test('風忍のクラススキルが正しく適用される', () => {
      const windJob = JobFactory.createJob('wind');
      const baseStats = windJob.getBaseStats();
      const modifiedStats = windJob.applyClassSkill(baseStats);

      expect(modifiedStats.moveSpeed).toBeGreaterThan(baseStats.moveSpeed);
      expect(modifiedStats.moveSpeed).toBe(Math.round(baseStats.moveSpeed * 1.1));
    });

    test('鉄忍のクラススキルが正しく適用される', () => {
      const ironJob = JobFactory.createJob('iron');
      const baseStats = ironJob.getBaseStats();
      const modifiedStats = ironJob.applyClassSkill(baseStats);

      expect(modifiedStats.defense).toBeGreaterThan(baseStats.defense);
      expect(modifiedStats.defense).toBe(Math.round(baseStats.defense * 1.2));
    });

    test('影忍のクラススキルが正しく適用される', () => {
      const shadowJob = JobFactory.createJob('shadow');
      const baseStats = shadowJob.getBaseStats();
      const modifiedStats = shadowJob.applyClassSkill(baseStats);

      expect(modifiedStats.sight).toBeGreaterThan(baseStats.sight);
      expect(modifiedStats.sight).toBe(baseStats.sight + 3);
    });

    test('薬忍のクラススキルが能力値を変更しない', () => {
      const medicineJob = JobFactory.createJob('medicine');
      const baseStats = medicineJob.getBaseStats();
      const modifiedStats = medicineJob.applyClassSkill(baseStats);

      expect(modifiedStats).toEqual(baseStats);
    });
  });

  describe('軍団システム', () => {
    let armyManager: ArmyManager;

    beforeEach(() => {
      armyManager = new ArmyManager(scene);
    });

    test('軍団が正しく作成される', () => {
      const commander = CharacterFactory.createCommander(scene, 0, 0);
      const army = armyManager.createArmy(commander, 100, 100);

      expect(army).toBeInstanceOf(Army);
      expect(army?.getCommander()).toBe(commander);
      expect(army?.getMemberCount()).toBe(1);
    });

    test('軍団に兵士を追加できる', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 0, 0, 'balanced');

      expect(army).toBeDefined();
      expect(army?.getMemberCount()).toBe(4);
      expect(army?.getSoldiers().length).toBe(3);
    });

    test('軍団の兵士上限が守られる', () => {
      const commander = CharacterFactory.createCommander(scene, 0, 0);
      const army = armyManager.createArmy(commander, 0, 0);

      if (army) {
        for (let i = 0; i < 5; i++) {
          const soldier = CharacterFactory.createRandomCharacter(scene, 0, 0);
          const added = army.addSoldier(soldier);

          if (i < ARMY_CONSTRAINTS.maxSoldiers) {
            expect(added).toBe(true);
          } else {
            expect(added).toBe(false);
          }
        }

        expect(army.getSoldiers().length).toBe(ARMY_CONSTRAINTS.maxSoldiers);
      }
    });

    test('軍団の最大数が守られる', () => {
      const armies: Army[] = [];

      for (let i = 0; i < ARMY_CONSTRAINTS.maxArmies + 2; i++) {
        const army = ArmyFactory.createTestArmy(scene, armyManager, i * 100, 0);
        if (army) {
          armies.push(army);
        }
      }

      expect(armies.length).toBe(ARMY_CONSTRAINTS.maxArmies);
      expect(armyManager.getAllArmies().length).toBe(ARMY_CONSTRAINTS.maxArmies);
    });

    test('軍団の平均移動速度が正しく計算される', () => {
      const characters = [
        CharacterFactory.createCharacter(scene, 0, 0, 'wind'),
        CharacterFactory.createCharacter(scene, 0, 0, 'iron'),
        CharacterFactory.createCharacter(scene, 0, 0, 'shadow'),
        CharacterFactory.createCharacter(scene, 0, 0, 'medicine'),
      ];

      const [commander, ...soldiers] = characters;
      const army = armyManager.createArmy(commander, 0, 0);

      if (army) {
        soldiers.forEach((soldier) => army.addSoldier(soldier));

        const expectedSpeed =
          characters.reduce((sum, char) => sum + char.getStats().moveSpeed, 0) / characters.length;

        expect(army.getAverageMovementSpeed()).toBeCloseTo(expectedSpeed);
      }
    });

    test('生存メンバーのみが平均速度計算に含まれる', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 0, 0, 'balanced');

      if (army) {
        const initialSpeed = army.getAverageMovementSpeed();

        const soldiers = army.getSoldiers();
        soldiers[0].takeDamage(1000);

        const newSpeed = army.getAverageMovementSpeed();
        expect(newSpeed).not.toBe(initialSpeed);
        expect(army.getAliveMembers().length).toBe(3);
      }
    });

    test('軍団の視界情報が正しく取得される', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 100, 100, 'stealth');

      if (army) {
        const sightAreas = army.getTotalSight();

        expect(sightAreas.length).toBe(4);
        sightAreas.forEach((area) => {
          expect(area.character).toBeDefined();
          expect(area.range).toBeGreaterThan(0);
          expect(area.center.x).toBeDefined();
          expect(area.center.y).toBeDefined();
        });
      }
    });

    test('軍団が正方形に配置される', () => {
      const commander = CharacterFactory.createCommander(scene, 0, 0);
      const army = armyManager.createArmy(commander, 100, 100);

      if (army) {
        const newSoldiers = [
          CharacterFactory.createCharacter(scene, 0, 0, 'iron'),
          CharacterFactory.createCharacter(scene, 0, 0, 'shadow'),
          CharacterFactory.createCharacter(scene, 0, 0, 'medicine'),
        ];

        newSoldiers.forEach((soldier) => army.addSoldier(soldier));

        const members = army.getAllMembers();
        expect(members.length).toBe(4);

        // 正方形の四隅に配置されているか確認
        // Container内での相対位置を確認
        const soldiers = army.getSoldiers();

        // 指揮官は左上
        expect(commander.x).toBe(-8);
        expect(commander.y).toBe(-8);

        // 兵士1は右上
        expect(soldiers[0].x).toBe(8);
        expect(soldiers[0].y).toBe(-8);

        // 兵士2は左下
        expect(soldiers[1].x).toBe(-8);
        expect(soldiers[1].y).toBe(8);

        // 兵士3は右下
        expect(soldiers[2].x).toBe(8);
        expect(soldiers[2].y).toBe(8);
      }
    });
  });

  describe('ファクトリシステム', () => {
    let armyManager: ArmyManager;

    beforeEach(() => {
      armyManager = new ArmyManager(scene);
    });

    test('バランス型軍団が正しく作成される', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 0, 0, 'balanced');

      expect(army).toBeDefined();
      if (army) {
        const members = army.getAllMembers();
        const jobTypes = members.map((m) => m.getJobType());

        expect(jobTypes).toContain('wind');
        expect(jobTypes).toContain('iron');
        expect(jobTypes).toContain('shadow');
        expect(jobTypes).toContain('medicine');
      }
    });

    test('特化型軍団が正しく作成される', () => {
      const speedArmy = ArmyFactory.createTestArmy(scene, armyManager, 0, 0, 'speed');
      const defenseArmy = ArmyFactory.createTestArmy(scene, armyManager, 100, 0, 'defense');
      const stealthArmy = ArmyFactory.createTestArmy(scene, armyManager, 200, 0, 'stealth');

      if (speedArmy) {
        const speedMembers = speedArmy.getAllMembers();
        const windCount = speedMembers.filter((m) => m.getJobType() === 'wind').length;
        expect(windCount).toBeGreaterThanOrEqual(2);
      }

      if (defenseArmy) {
        const defenseMembers = defenseArmy.getAllMembers();
        const ironCount = defenseMembers.filter((m) => m.getJobType() === 'iron').length;
        expect(ironCount).toBeGreaterThanOrEqual(2);
      }

      if (stealthArmy) {
        const stealthMembers = stealthArmy.getAllMembers();
        const shadowCount = stealthMembers.filter((m) => m.getJobType() === 'shadow').length;
        expect(shadowCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('プレイヤー軍団と敵軍団が作成される', () => {
      const playerArmy = ArmyFactory.createPlayerArmy(scene, armyManager, 0, 0);
      const enemyArmy = ArmyFactory.createEnemyArmy(scene, armyManager, 100, 100, 'hard');

      expect(playerArmy).toBeDefined();
      expect(playerArmy?.getCommander().getName()).toBe('咲耶');

      expect(enemyArmy).toBeDefined();
      expect(enemyArmy?.getCommander().getName()).toBe('敵指揮官');
    });
  });

  describe('実使用シナリオ', () => {
    let armyManager: ArmyManager;

    beforeEach(() => {
      armyManager = new ArmyManager(scene);
    });

    test('ゲーム開始時の軍団編成', () => {
      const playerArmy = ArmyFactory.createPlayerArmy(scene, armyManager, 100, 100);
      const enemyArmies = [
        ArmyFactory.createEnemyArmy(scene, armyManager, 400, 100, 'easy'),
        ArmyFactory.createEnemyArmy(scene, armyManager, 400, 300, 'normal'),
      ];

      expect(playerArmy).toBeDefined();
      expect(enemyArmies.every((army) => army !== null)).toBe(true);
      expect(armyManager.getActiveArmies().length).toBe(3);
    });

    test('戦闘による軍団メンバーの減少', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 0, 0);

      if (army) {
        const initialCount = army.getMemberCount();

        army.getSoldiers()[0].takeDamage(1000);
        army.update(0, 16);

        expect(army.getMemberCount()).toBe(initialCount - 1);
        expect(army.isActive()).toBe(true);
      }
    });

    test('指揮官死亡時の軍団存続', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 0, 0);

      if (army) {
        army.getCommander().takeDamage(1000);
        army.update(0, 16);

        expect(army.getCommander().isAlive()).toBe(false);
        expect(army.isActive()).toBe(true);
        expect(army.getAliveMembers().length).toBe(3);
      }
    });

    test('全滅時の軍団消滅', () => {
      const army = ArmyFactory.createTestArmy(scene, armyManager, 0, 0);

      if (army) {
        const armyId = army.getId();

        army.getAllMembers().forEach((member) => member.takeDamage(1000));
        armyManager.update(0, 16);

        expect(army.isActive()).toBe(false);
        expect(armyManager.getArmy(armyId)).toBeUndefined();
      }
    });
  });
});
