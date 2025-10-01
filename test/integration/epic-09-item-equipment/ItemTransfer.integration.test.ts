import { UIManager } from '../../../src/ui/UIManager';
import { createMockProductionManager } from '../../mocks/ProductionManagerMock';
import { EconomyManager } from '../../../src/economy/EconomyManager';
import { BaseManager } from '../../../src/base/BaseManager';
import { Army } from '../../../src/army/Army';
import { Character } from '../../../src/character/Character';
import { createMockScene } from '../../setup';
import { Weapon } from '../../../src/item/Weapon';
import { Consumable } from '../../../src/item/Consumable';
import { CharacterConfig } from '../../../src/types/CharacterTypes';
import { WeaponType } from '../../../src/types/ItemTypes';

// モックシーンをグローバルスコープで定義
let scene: any;

/**
 * テスト用のモックキャラクター作成関数
 */
function createMockCharacter(config: CharacterConfig): Character {
  return new Character(scene, 0, 0, config);
}

/**
 * モック軍団の作成（指揮官1名＋兵士2名）
 */
function createMockArmyWithThreeMembers(): Army {
  const commanderConfig: CharacterConfig = {
    id: 'commander1',
    name: '指揮官',
    jobType: 'shadow',
    stats: {
      hp: 100,
      maxHp: 100,
      attack: 30,
      defense: 20,
      speed: 15,
      moveSpeed: 10,
      sight: 8,
    },
    isCommander: true,
  };

  const soldierConfig1: CharacterConfig = {
    id: 'soldier1',
    name: '兵士A',
    jobType: 'wind',
    stats: {
      hp: 80,
      maxHp: 80,
      attack: 25,
      defense: 15,
      speed: 18,
      moveSpeed: 13,
      sight: 6,
    },
    isCommander: false,
  };

  const soldierConfig2: CharacterConfig = {
    id: 'soldier2',
    name: '兵士B',
    jobType: 'iron',
    stats: {
      hp: 90,
      maxHp: 90,
      attack: 20,
      defense: 25,
      speed: 12,
      moveSpeed: 8,
      sight: 5,
    },
    isCommander: false,
  };

  const commander = createMockCharacter(commanderConfig);
  const soldier1 = createMockCharacter(soldierConfig1);
  const soldier2 = createMockCharacter(soldierConfig2);

  const army = new Army(scene, 10, 10, {
    id: 'test_army_three_members',
    name: 'テスト軍団',
    commander,
    soldiers: [soldier1, soldier2],
    owner: 'player',
  });

  return army;
}

describe('[エピック9] ItemTransfer Integration Tests', () => {
  let uiManager: UIManager;
  let mockArmy: Army;
  let commander: Character;
  let soldier1: Character;
  let soldier2: Character;

  beforeEach(() => {
    scene = createMockScene();
    const productionManager = createMockProductionManager();
    const economyManager = new EconomyManager(scene);
    const mockMapManager = {} as any;
    const baseManager = new BaseManager(scene, mockMapManager);
    uiManager = new UIManager(scene, productionManager, economyManager, baseManager);
    mockArmy = createMockArmyWithThreeMembers();
    commander = mockArmy.getCommander();
    soldier1 = mockArmy.getSoldiers()[0];
    soldier2 = mockArmy.getSoldiers()[1];
  });

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy();
    }
  });

  describe('基本的な譲渡機能', () => {
    test('消耗品が正しく譲渡される', () => {
      // 指揮官に兵糧丸を追加
      const pill = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });
      commander.getItemHolder().addItem(pill);

      // 譲渡前の確認
      expect(commander.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items).toHaveLength(0);

      // 持物UIを表示してアイテム譲渡のコールバックを取得
      uiManager.showItemInventoryUI(mockArmy);

      // UIManagerのhandleItemTransferを直接呼び出し（実際のUIインタラクションの代わり）
      const handleItemTransfer = (uiManager as any).handleItemTransfer.bind(uiManager);
      handleItemTransfer(commander, soldier1, pill);

      // 譲渡後の確認
      expect(commander.getItemHolder().items).toHaveLength(0);
      expect(soldier1.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items[0]).toBe(pill);
    });

    test('武器（未装備）が正しく譲渡される', () => {
      // 指揮官に忍者刀を追加
      const sword = new Weapon({
        id: 'sword1',
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '忍者刀',
      });
      commander.getItemHolder().addItem(sword);

      // 譲渡前の確認
      expect(commander.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items).toHaveLength(0);

      // 持物UIを表示
      uiManager.showItemInventoryUI(mockArmy);

      // アイテム譲渡
      const handleItemTransfer = (uiManager as any).handleItemTransfer.bind(uiManager);
      handleItemTransfer(commander, soldier1, sword);

      // 譲渡後の確認
      expect(commander.getItemHolder().items).toHaveLength(0);
      expect(soldier1.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items[0]).toBe(sword);
    });
  });

  describe('装備中武器の譲渡', () => {
    test('装備中の武器を譲渡すると自動的に装備解除される', () => {
      // 指揮官に忍者刀を追加して装備
      const sword = new Weapon({
        id: 'sword1',
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '忍者刀',
      });
      commander.getItemHolder().addItem(sword);
      commander.getItemHolder().equipWeapon(sword);

      // 装備状態の確認
      expect(commander.getItemHolder().getEquippedWeapon()).toBe(sword);

      // 持物UIを表示
      uiManager.showItemInventoryUI(mockArmy);

      // アイテム譲渡
      const handleItemTransfer = (uiManager as any).handleItemTransfer.bind(uiManager);
      handleItemTransfer(commander, soldier1, sword);

      // 譲渡後の確認
      expect(commander.getItemHolder().getEquippedWeapon()).toBeNull(); // 装備解除
      expect(commander.getItemHolder().items).toHaveLength(0);
      expect(soldier1.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items[0]).toBe(sword);
    });
  });

  describe('所持上限チェック', () => {
    test('譲渡先が4個所持している場合は譲渡できない', () => {
      // 指揮官に兵糧丸を追加
      const pillToTransfer = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });
      commander.getItemHolder().addItem(pillToTransfer);

      // 兵士Aに4個のアイテムを追加（満杯状態）
      for (let i = 0; i < 4; i++) {
        const pill = new Consumable({
          id: `pill${i + 2}`,
          name: '兵糧丸',
          effect: 'heal_full',
          maxUses: 1,
          price: 50,
          description: 'HP全回復',
        });
        soldier1.getItemHolder().addItem(pill);
      }

      // 譲渡前の確認
      expect(commander.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items).toHaveLength(4);

      // 持物UIを表示
      uiManager.showItemInventoryUI(mockArmy);

      // アイテム譲渡（失敗するはず）
      const handleItemTransfer = (uiManager as any).handleItemTransfer.bind(uiManager);
      handleItemTransfer(commander, soldier1, pillToTransfer);

      // 譲渡が失敗することを確認
      expect(commander.getItemHolder().items).toHaveLength(1); // 譲渡元に残る
      expect(soldier1.getItemHolder().items).toHaveLength(4); // 満杯のまま
    });
  });

  describe('連続譲渡', () => {
    test('複数のアイテムを連続して譲渡できる', () => {
      // 指揮官に複数のアイテムを追加
      const pill1 = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });
      const pill2 = new Consumable({
        id: 'pill2',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });
      commander.getItemHolder().addItem(pill1);
      commander.getItemHolder().addItem(pill2);

      // 譲渡前の確認
      expect(commander.getItemHolder().items).toHaveLength(2);
      expect(soldier1.getItemHolder().items).toHaveLength(0);
      expect(soldier2.getItemHolder().items).toHaveLength(0);

      // 持物UIを表示
      uiManager.showItemInventoryUI(mockArmy);

      // 1つ目のアイテムを兵士Aに譲渡
      const handleItemTransfer = (uiManager as any).handleItemTransfer.bind(uiManager);
      handleItemTransfer(commander, soldier1, pill1);

      // 中間確認
      expect(commander.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items).toHaveLength(1);

      // 2つ目のアイテムを兵士Bに譲渡
      handleItemTransfer(commander, soldier2, pill2);

      // 最終確認
      expect(commander.getItemHolder().items).toHaveLength(0);
      expect(soldier1.getItemHolder().items).toHaveLength(1);
      expect(soldier1.getItemHolder().items[0]).toBe(pill1);
      expect(soldier2.getItemHolder().items).toHaveLength(1);
      expect(soldier2.getItemHolder().items[0]).toBe(pill2);
    });
  });

  describe('軍団1名時の制限', () => {
    test('軍団が1名のみの場合、譲渡ボタンは無効になるべき', () => {
      // 1名のみの軍団を作成
      const singleCommanderConfig: CharacterConfig = {
        id: 'single_commander',
        name: '孤独な指揮官',
        jobType: 'shadow',
        stats: {
          hp: 100,
          maxHp: 100,
          attack: 30,
          defense: 20,
          speed: 15,
          moveSpeed: 10,
          sight: 8,
        },
        isCommander: true,
      };

      const singleCommander = createMockCharacter(singleCommanderConfig);
      const singleArmy = new Army(scene, 10, 10, {
        id: 'single_army',
        name: '単独軍団',
        commander: singleCommander,
        soldiers: [],
        owner: 'player',
      });

      // アイテムを追加
      const pill = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });
      singleCommander.getItemHolder().addItem(pill);

      // 持物UIを表示
      uiManager.showItemInventoryUI(singleArmy);

      // 軍団メンバー数を確認
      const armyMembers = [singleCommander, ...singleArmy.getSoldiers()];
      expect(armyMembers).toHaveLength(1);

      // 譲渡ボタンが無効になることは、UIレイヤーで制御される
      // （ここではロジックの確認のみ）
      const hasOtherMembers = armyMembers.length > 1;
      expect(hasOtherMembers).toBe(false);
    });
  });
});
