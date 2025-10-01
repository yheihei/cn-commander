import { GarrisonedArmiesPanel } from '../../../src/ui/GarrisonedArmiesPanel';
import { MedicalManager } from '../../../src/medical/MedicalManager';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { Base } from '../../../src/base/Base';
import { Army } from '../../../src/army/Army';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { JobType } from '../../../src/types/CharacterTypes';
import { BaseType } from '../../../src/types/BaseTypes';
import { GameTimeManager } from '../../../src/time/GameTimeManager';
import { createMockScene } from '../../setup';

// Phaser モックはsetup.tsで定義済み

describe('[エピック7] GarrisonManagement Integration Tests', () => {
  let scene: any;
  let gameTimeManager: GameTimeManager;
  let medicalManager: MedicalManager;
  let armyManager: ArmyManager;
  let base: Base;
  let army: Army;
  let garrisonedArmiesPanel: GarrisonedArmiesPanel;

  beforeEach(() => {
    scene = createMockScene();

    // 各マネージャーの初期化
    gameTimeManager = new GameTimeManager();
    gameTimeManager.setScene(scene);
    medicalManager = new MedicalManager(gameTimeManager);
    armyManager = new ArmyManager(scene);

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

    // テスト用の軍団を作成
    const commander = CharacterFactory.createCommander(scene, 0, 0, 'wind', '咲耶');
    const member1 = CharacterFactory.createCharacter(scene, 0, 0, 'iron' as JobType, '忍者1');

    army = armyManager.createArmy(commander, 0, 0)!;
    army.addSoldier(member1);
  });

  afterEach(() => {
    if (garrisonedArmiesPanel) {
      garrisonedArmiesPanel.destroy();
    }
    if (medicalManager) {
      medicalManager.destroy();
    }
    if (armyManager) {
      armyManager.destroy();
    }
  });

  describe('治療中の軍団の表示制限', () => {
    test('治療中の軍団名に「治療中」サフィックスが表示される', () => {
      // 治療を開始
      medicalManager.startTreatment(army, base, 1000);
      expect(medicalManager.isInTreatment(army.getId())).toBe(true);

      // 駐留軍団管理パネルを作成
      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army],
        medicalManager,
        onProceedToItemSelection: jest.fn(),
        onCancel: jest.fn(),
      });

      // 軍団名テキストを取得
      const contentContainer = (garrisonedArmiesPanel as any).contentContainer;
      const armyNameText = contentContainer.list.find(
        (child: any) => child.getData && child.getData('type') === 'armyName',
      );

      expect(armyNameText).toBeDefined();
      expect(armyNameText.text).toContain('咲耶の軍団');
      expect(armyNameText.text).toContain('(治療中)');
    });

    test('治療中でない軍団名には「治療中」サフィックスが表示されない', () => {
      // 駐留軍団管理パネルを作成（治療していない状態）
      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army],
        medicalManager,
        onProceedToItemSelection: jest.fn(),
        onCancel: jest.fn(),
      });

      // 軍団名テキストを取得
      const contentContainer = (garrisonedArmiesPanel as any).contentContainer;
      const armyNameText = contentContainer.list.find(
        (child: any) => child.getData && child.getData('type') === 'armyName',
      );

      expect(armyNameText).toBeDefined();
      expect(armyNameText.text).toContain('咲耶の軍団');
      expect(armyNameText.text).not.toContain('治療中');
    });

    test('治療中の軍団の「アイテム装備へ」ボタンが無効化される', () => {
      // 治療を開始
      medicalManager.startTreatment(army, base, 1000);

      // 駐留軍団管理パネルを作成
      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army],
        medicalManager,
        onProceedToItemSelection: jest.fn(),
        onCancel: jest.fn(),
      });

      // proceedButtonを取得
      const proceedButton = (garrisonedArmiesPanel as any).proceedButton;
      expect(proceedButton).toBeDefined();

      // ボタンの状態を確認
      const buttonBg = proceedButton.list[0];
      const buttonText = proceedButton.list[1];

      // 無効化されていることを確認
      // setFillStyleが呼ばれたことを確認
      expect(buttonBg.setFillStyle).toHaveBeenCalledWith(0x444444);
      // alphaプロパティが設定されることを確認
      if (buttonBg.setAlpha) {
        expect(buttonBg.setAlpha).toHaveBeenCalledWith(0.5);
      } else if (buttonBg.alpha !== undefined) {
        expect(buttonBg.alpha).toBe(0.5);
      }
      if (buttonText.setAlpha) {
        expect(buttonText.setAlpha).toHaveBeenCalledWith(0.5);
      } else if (buttonText.alpha !== undefined) {
        expect(buttonText.alpha).toBe(0.5);
      }
      // クリック無効の確認 - buttonBgのinputプロパティを確認
      if (buttonBg.input) {
        expect(buttonBg.input.enabled).toBe(false);
      }
    });

    test('治療中でない軍団の「アイテム装備へ」ボタンが有効化される', () => {
      // 駐留軍団管理パネルを作成（治療していない状態）
      const onProceedCallback = jest.fn();
      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army],
        medicalManager,
        onProceedToItemSelection: onProceedCallback,
        onCancel: jest.fn(),
      });

      // proceedButtonを取得
      const proceedButton = (garrisonedArmiesPanel as any).proceedButton;
      expect(proceedButton).toBeDefined();

      // ボタンの状態を確認
      const buttonBg = proceedButton.list[0];
      const buttonText = proceedButton.list[1];

      // 有効化されていることを確認
      expect(buttonBg.setFillStyle).toHaveBeenCalledWith(0x007700);
      if (buttonBg.setAlpha) {
        expect(buttonBg.setAlpha).toHaveBeenCalledWith(1);
      } else if (buttonBg.alpha !== undefined) {
        expect(buttonBg.alpha).toBe(1);
      }
      if (buttonText.setAlpha) {
        expect(buttonText.setAlpha).toHaveBeenCalledWith(1);
      } else if (buttonText.alpha !== undefined) {
        expect(buttonText.alpha).toBe(1);
      }
    });

    test('複数軍団での治療状態が正しく管理される', () => {
      // 2つ目の軍団を作成
      const commander2 = CharacterFactory.createCharacter(scene, 0, 0, 'shadow' as JobType, '太郎');
      const army2 = armyManager.createArmy(commander2, 0, 0)!;

      // 最初の軍団だけ治療開始
      medicalManager.startTreatment(army, base, 1000);

      // 駐留軍団管理パネルを作成
      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army, army2],
        medicalManager,
        onProceedToItemSelection: jest.fn(),
        onCancel: jest.fn(),
      });

      // 最初の軍団（治療中）の状態を確認
      const contentContainer = (garrisonedArmiesPanel as any).contentContainer;
      const armyNameText = contentContainer.list.find(
        (child: any) => child.getData && child.getData('type') === 'armyName',
      );

      expect(armyNameText.text).toContain('(治療中)');

      // proceedButtonが無効化されていることを確認
      const proceedButton = (garrisonedArmiesPanel as any).proceedButton;
      const buttonBg = proceedButton.list[0];
      expect(buttonBg.setFillStyle).toHaveBeenCalledWith(0x444444);
      if (buttonBg.setAlpha) {
        expect(buttonBg.setAlpha).toHaveBeenCalledWith(0.5);
      } else if (buttonBg.alpha !== undefined) {
        expect(buttonBg.alpha).toBe(0.5);
      }

      // 次の軍団に切り替え
      (garrisonedArmiesPanel as any).navigateToNextArmy();

      // 2番目の軍団（治療中でない）の状態を確認
      const armyNameText2 = contentContainer.list.find(
        (child: any) => child.getData && child.getData('type') === 'armyName',
      );

      expect(armyNameText2.text).toContain('太郎の軍団');
      expect(armyNameText2.text).not.toContain('治療中');

      // proceedButtonが有効化されていることを確認
      expect(buttonBg.setFillStyle).toHaveBeenCalledWith(0x007700);
      if (buttonBg.setAlpha) {
        expect(buttonBg.setAlpha).toHaveBeenCalledWith(1);
      } else if (buttonBg.alpha !== undefined) {
        expect(buttonBg.alpha).toBe(1);
      }
    });
  });

  describe('UIを開いた時の治療状態チェック', () => {
    test('治療状態のチェックはUIを開いた時に一度だけ実行される', () => {
      // isInTreatmentをスパイ
      const isInTreatmentSpy = jest.spyOn(medicalManager, 'isInTreatment');

      // 駐留軍団管理パネルを作成
      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army],
        medicalManager,
        onProceedToItemSelection: jest.fn(),
        onCancel: jest.fn(),
      });

      // 初回表示時に一度だけチェックされていることを確認
      expect(isInTreatmentSpy).toHaveBeenCalledTimes(1);
      expect(isInTreatmentSpy).toHaveBeenCalledWith(army.getId());

      // updateやその他のメソッドを呼んでも再チェックされないことを確認
      // (GarrisonedArmiesPanelにはupdateメソッドがないため、ナビゲーションで確認)
      const commander2 = CharacterFactory.createCharacter(scene, 0, 0, 'shadow' as JobType, '太郎');
      const army2 = armyManager.createArmy(commander2, 0, 0)!;

      // パネルを再作成して複数軍団でテスト
      garrisonedArmiesPanel.destroy();
      isInTreatmentSpy.mockClear();

      garrisonedArmiesPanel = new GarrisonedArmiesPanel({
        scene,
        base,
        armies: [army, army2],
        medicalManager,
        onProceedToItemSelection: jest.fn(),
        onCancel: jest.fn(),
      });

      // 最初の軍団で一度チェック
      expect(isInTreatmentSpy).toHaveBeenCalledTimes(1);

      // ナビゲーションで次の軍団に移動
      (garrisonedArmiesPanel as any).navigateToNextArmy();

      // 次の軍団でもチェックされる（各軍団ごとに一度）
      expect(isInTreatmentSpy).toHaveBeenCalledTimes(2);
      expect(isInTreatmentSpy).toHaveBeenCalledWith(army2.getId());
    });
  });
});
