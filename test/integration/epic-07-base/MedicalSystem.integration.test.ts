import { MedicalManager } from '../../../src/medical/MedicalManager';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { EconomyManager } from '../../../src/economy/EconomyManager';
import { UIManager } from '../../../src/ui/UIManager';
import { Army } from '../../../src/army/Army';
import { Base } from '../../../src/base/Base';
import { BaseManager } from '../../../src/base/BaseManager';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { JobType } from '../../../src/types/CharacterTypes';
import { BaseType } from '../../../src/types/BaseTypes';
import { ProductionManager } from '../../../src/production/ProductionManager';
import { GameTimeManager } from '../../../src/time/GameTimeManager';
import { createMockScene } from '../../setup';

// Phaser モックはsetup.tsで定義済み

describe('[エピック7] MedicalSystem Integration Tests', () => {
  let scene: any;
  let gameTimeManager: GameTimeManager;
  let medicalManager: MedicalManager;
  let armyManager: ArmyManager;
  let economyManager: EconomyManager;
  let uiManager: UIManager;
  let army: Army;
  let base: Base;

  beforeEach(() => {
    scene = createMockScene();

    // 各マネージャーの初期化
    gameTimeManager = new GameTimeManager();
    gameTimeManager.setScene(scene);
    medicalManager = new MedicalManager(gameTimeManager);
    armyManager = new ArmyManager(scene);
    economyManager = new EconomyManager(scene);

    // ProductionManagerとBaseManagerの作成
    const productionManager = new ProductionManager(scene);

    // MapManagerのモックを作成
    const mockMapManager = {
      getTileAt: jest.fn(),
      getMapSize: jest.fn(() => ({ width: 512, height: 512 })),
    } as any;
    const baseManager = new BaseManager(scene, mockMapManager);

    uiManager = new UIManager(scene, productionManager, economyManager, baseManager);
    uiManager.setGameTimeManager(gameTimeManager);

    // scene にarmyManagerを設定（UIManagerが参照するため）
    scene.armyManager = armyManager;

    // テスト用の軍団を作成（ダメージを受けた状態）
    const commander = CharacterFactory.createCommander(scene, 0, 0, 'wind', '咲耶');
    const member1 = CharacterFactory.createCharacter(scene, 0, 0, 'iron' as JobType, '忍者1');

    // HPをダメージ状態に設定
    // キャラクターのデフォルトHPを確認してからダメージを設定
    const commanderMaxHp = commander.getMaxHP();
    const member1MaxHp = member1.getMaxHP();

    // HPを半分に減らす
    commander.takeDamage(commanderMaxHp / 2);
    member1.takeDamage(member1MaxHp / 2);

    army = armyManager.createArmy(commander, 0, 0)!;
    army.addSoldier(member1);

    // テスト用の拠点を作成
    base = new Base(scene, {
      id: 'base-1',
      name: '本拠地',
      type: BaseType.PLAYER_HQ,
      x: 100,
      y: 100,
      hp: 200,
      maxHp: 200,
      owner: 'player',
      income: 200,
    });
  });

  afterEach(() => {
    if (medicalManager) {
      medicalManager.destroy();
    }
    if (armyManager) {
      armyManager.destroy();
    }
    if (uiManager) {
      uiManager.destroy();
    }
  });

  describe('治療システムの基本動作', () => {
    test('500両の支払い処理が正しく動作する', () => {
      const initialMoney = economyManager.getMoney();
      const treatmentCost = MedicalManager.getTreatmentCost();

      // 治療開始前の確認
      expect(treatmentCost).toBe(500);
      expect(economyManager.canAfford(treatmentCost)).toBe(true);

      // 支払い処理
      const paymentSuccess = economyManager.spend(treatmentCost);

      expect(paymentSuccess).toBe(true);
      expect(economyManager.getMoney()).toBe(initialMoney - treatmentCost);
    });

    test('資金不足時は治療が開始されない', () => {
      // 資金を0に設定
      economyManager.setMoney(0);

      const treatmentCost = MedicalManager.getTreatmentCost();
      expect(economyManager.canAfford(treatmentCost)).toBe(false);

      // 治療開始試行
      const started = medicalManager.startTreatment(army, base, economyManager.getMoney());

      expect(started).toBe(false);
      expect(medicalManager.isInTreatment(army.getId())).toBe(false);
    });

    test('治療開始時に軍団が治療中状態になる', () => {
      // 治療開始前
      expect(medicalManager.isInTreatment(army.getId())).toBe(false);

      // 治療開始
      const started = medicalManager.startTreatment(army, base, economyManager.getMoney());

      expect(started).toBe(true);
      expect(medicalManager.isInTreatment(army.getId())).toBe(true);
    });
  });

  describe('2分間のHP回復処理', () => {
    test('2分後に軍団のHPが全回復する', () => {
      // 初期HP確認
      const commander = army.getCommander();
      const members = army.getAllMembers();
      const commanderMaxHp = commander.getMaxHP();
      const member1MaxHp = members[1].getMaxHP();

      expect(commander.getCurrentHP()).toBe(commanderMaxHp / 2);
      expect(members[1].getCurrentHP()).toBe(member1MaxHp / 2);

      // 治療開始
      medicalManager.startTreatment(army, base, economyManager.getMoney());

      // 2分経過をシミュレート
      gameTimeManager.update(120000); // 120秒 = 2分

      // update処理で自動完了
      medicalManager.update(armyManager);

      // HP全回復の確認
      expect(commander.getCurrentHP()).toBe(commanderMaxHp);
      expect(members[1].getCurrentHP()).toBe(member1MaxHp);
      expect(medicalManager.isInTreatment(army.getId())).toBe(false);
    });

    test('治療時間の残り時間が正しく計算される', () => {
      // 治療開始
      medicalManager.startTreatment(army, base, economyManager.getMoney());

      // 30秒経過
      gameTimeManager.update(30000);
      let remaining = medicalManager.getRemainingTime(army.getId());
      expect(remaining).toBe(90);

      // さらに30秒経過（合計60秒）
      gameTimeManager.update(30000);
      remaining = medicalManager.getRemainingTime(army.getId());
      expect(remaining).toBe(60);

      // さらに60秒経過（合計120秒）
      gameTimeManager.update(60000);
      remaining = medicalManager.getRemainingTime(army.getId());
      expect(remaining).toBe(0);
      expect(medicalManager.isCompleted(army.getId())).toBe(true);
    });
  });

  describe('UIとバックグラウンド処理の独立性', () => {
    test('UIを閉じても治療が継続される', () => {
      // 治療開始
      medicalManager.startTreatment(army, base, economyManager.getMoney());
      expect(medicalManager.isInTreatment(army.getId())).toBe(true);

      // UIを閉じる（MedicalFacilityMenuが存在しない状態）
      // UIManagerにはmedicalFacilityMenuがnullの状態

      // 時間経過
      gameTimeManager.update(60000); // 1分経過

      // UIが閉じられていても治療は継続
      expect(medicalManager.isInTreatment(army.getId())).toBe(true);
      expect(medicalManager.getRemainingTime(army.getId())).toBe(60);

      // さらに時間経過
      gameTimeManager.update(60000); // さらに1分経過（合計2分）

      // update処理
      medicalManager.update(armyManager);

      // 治療完了
      expect(medicalManager.isInTreatment(army.getId())).toBe(false);
      expect(army.getCommander().getCurrentHP()).toBe(army.getCommander().getMaxHP());
    });

    test('複数の軍団の治療を同時に管理できる', () => {
      // 2つ目の軍団を作成
      const commander2 = CharacterFactory.createCharacter(scene, 0, 0, 'shadow' as JobType, '太郎');
      const commander2MaxHp = commander2.getMaxHP();
      commander2.takeDamage(commander2MaxHp - 40); // HPが40になるようにダメージを設定

      const army2 = armyManager.createArmy(commander2, 0, 0)!;

      // 両方の軍団の治療を開始（時間差）
      medicalManager.startTreatment(army, base, economyManager.getMoney());

      gameTimeManager.update(30000); // 30秒経過
      medicalManager.startTreatment(army2, base, economyManager.getMoney());

      expect(medicalManager.isInTreatment(army.getId())).toBe(true);
      expect(medicalManager.isInTreatment(army2.getId())).toBe(true);

      // 最初の軍団の治療が完了（合計120秒経過）
      gameTimeManager.update(90000); // さらに90秒経過（30 + 90 = 120秒）
      medicalManager.update(armyManager);

      expect(medicalManager.isInTreatment(army.getId())).toBe(false);
      expect(medicalManager.isInTreatment(army2.getId())).toBe(true);
      expect(army.getCommander().getCurrentHP()).toBe(army.getCommander().getMaxHP());
      expect(army2.getCommander().getCurrentHP()).toBe(40); // まだ治療中

      // 2つ目の軍団の治療も完了（合計150秒経過）
      gameTimeManager.update(30000); // さらに30秒経過（120 + 30 = 150秒）
      medicalManager.update(armyManager);

      expect(medicalManager.isInTreatment(army2.getId())).toBe(false);
      expect(army2.getCommander().getCurrentHP()).toBe(commander2MaxHp);
    });
  });

  describe('拠点ごとの治療管理', () => {
    test('特定の拠点で治療中の軍団リストを取得できる', () => {
      // 複数の拠点を作成
      const base2 = new Base(scene, {
        id: 'base-2',
        name: '占領拠点',
        type: BaseType.PLAYER_OCCUPIED,
        x: 200,
        y: 200,
        hp: 80,
        maxHp: 80,
        owner: 'player',
        income: 100,
      });

      // base1で治療開始
      medicalManager.startTreatment(army, base, economyManager.getMoney());

      // base1の治療リストを確認
      const treatmentsAtBase1 = medicalManager.getTreatmentsByBase(base.getId());
      const treatmentsAtBase2 = medicalManager.getTreatmentsByBase(base2.getId());

      expect(treatmentsAtBase1.length).toBe(1);
      expect(treatmentsAtBase1[0].armyId).toBe(army.getId());
      expect(treatmentsAtBase2.length).toBe(0);
    });
  });
});
