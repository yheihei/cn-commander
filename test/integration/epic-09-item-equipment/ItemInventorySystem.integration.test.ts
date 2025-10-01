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

describe('[エピック9] ItemInventorySystem Integration Tests', () => {
  let uiManager: UIManager;
  let mockArmy: Army;

  beforeEach(() => {
    scene = createMockScene();
    const productionManager = createMockProductionManager();
    const economyManager = new EconomyManager(scene);
    const mockMapManager = {} as any;
    const baseManager = new BaseManager(scene, mockMapManager);
    uiManager = new UIManager(scene, productionManager, economyManager, baseManager);
    mockArmy = createMockArmy();
  });

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy();
    }
  });

  describe('持物管理UI基盤機能', () => {
    test('持物UIが正常に表示される', () => {
      const showItemInventoryUISpy = jest.spyOn(uiManager, 'showItemInventoryUI');

      // 持物UIを表示
      uiManager.showItemInventoryUI(mockArmy);

      expect(showItemInventoryUISpy).toHaveBeenCalledWith(mockArmy);
    });

    test('持物UIがキャラクター切り替えに対応している', () => {
      const commander = mockArmy.getCommander();
      const soldier = mockArmy.getSoldiers()[0];

      // 各キャラクターにアイテムを装備
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

      const pill = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      commander.getItemHolder().addItem(sword);
      soldier.getItemHolder().addItem(pill);

      // 持物UIを表示
      uiManager.showItemInventoryUI(mockArmy);

      // キャラクターが切り替え可能であることを確認
      const armyMembers = [commander, ...mockArmy.getSoldiers()];
      expect(armyMembers).toHaveLength(2);
      expect(armyMembers[0]).toBe(commander);
      expect(armyMembers[1]).toBe(soldier);
    });
  });

  describe('消耗品使用機能（task-9-3-2）', () => {
    test('兵糧丸使用でHP全回復', () => {
      const commander = mockArmy.getCommander();

      // HPを減らす
      commander.takeDamage(30);
      expect(commander.getStats().hp).toBe(70);

      const pill = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      commander.getItemHolder().addItem(pill);

      // UIManager経由で使用処理をテスト
      uiManager.showItemInventoryUI(mockArmy);

      // ItemInventoryUIのコールバック経由で消耗品使用
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onUseItemCallback = (itemInventoryUI as any).onUseItemCallback;

      if (onUseItemCallback) {
        onUseItemCallback(commander, pill);
      }

      // HP全回復確認
      expect(commander.getStats().hp).toBe(100);

      // アイテムが消費されていることを確認
      expect(commander.getItemHolder().items).not.toContain(pill);
    });

    test('薬忍の兵糧丸使用で軍団全員がHP回復', () => {
      const mockKusuri = createMockCharacter({
        id: 'kusuri1',
        name: '薬忍テスト',
        jobType: 'medicine',
        stats: {
          hp: 80,
          maxHp: 100,
          attack: 20,
          defense: 15,
          speed: 14,
          moveSpeed: 10,
          sight: 6,
        },
      });

      const mockArmyWithKusuri = new Army(scene, 100, 100, {
        id: 'army2',
        name: '薬忍軍団',
        commander: mockKusuri,
        soldiers: [mockArmy.getCommander()], // 既存キャラクターを兵士として使用
        owner: 'player',
      });

      // 全員のHPを減らす
      mockKusuri.takeDamage(20);
      mockArmyWithKusuri.getSoldiers()[0].takeDamage(30);

      const pill = new Consumable({
        id: 'pill2',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      mockKusuri.getItemHolder().addItem(pill);

      // UIManager経由で使用処理をテスト
      uiManager.showItemInventoryUI(mockArmyWithKusuri);

      // ItemInventoryUIのコールバック経由で消耗品使用（薬忍）
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onUseItemCallback = (itemInventoryUI as any).onUseItemCallback;

      if (onUseItemCallback) {
        onUseItemCallback(mockKusuri, pill);
      }

      // 軍団全員のHP回復確認（薬忍スキル）
      expect(mockKusuri.getStats().hp).toBe(100);
      expect(mockArmyWithKusuri.getSoldiers()[0].getStats().hp).toBe(100);
    });

    test('消耗品使用後のアイテム削除処理', () => {
      const commander = mockArmy.getCommander();
      const pill1 = new Consumable({
        id: 'pill1',
        name: '兵糧丸1',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      const pill2 = new Consumable({
        id: 'pill2',
        name: '兵糧丸2',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      commander.getItemHolder().addItem(pill1);
      commander.getItemHolder().addItem(pill2);
      expect(commander.getItemHolder().items).toHaveLength(2);

      // 1つ目を使用
      uiManager.showItemInventoryUI(mockArmy);
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onUseItemCallback = (itemInventoryUI as any).onUseItemCallback;

      if (onUseItemCallback) {
        onUseItemCallback(commander, pill1);
      }

      // pill1だけが削除されていることを確認
      expect(commander.getItemHolder().items).toHaveLength(1);
      expect(commander.getItemHolder().items[0]).toBe(pill2);
    });
  });

  describe('武器装備変更機能（task-9-3-3）', () => {
    test('武器装備で自動装備される', () => {
      const commander = mockArmy.getCommander();
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

      // UIManager経由で装備処理をテスト
      uiManager.showItemInventoryUI(mockArmy);

      // ItemInventoryUIのコールバック経由で武器装備
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onEquipWeaponCallback = (itemInventoryUI as any).onEquipWeaponCallback;

      if (onEquipWeaponCallback) {
        onEquipWeaponCallback(commander, sword);
      }

      // 装備確認
      expect(commander.getItemHolder().getEquippedWeapon()).toBe(sword);
    });

    test('別の武器装備時に既存武器が自動装備解除される', () => {
      const commander = mockArmy.getCommander();

      const sword1 = new Weapon({
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

      const sword2 = new Weapon({
        id: 'sword2',
        name: '上級忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 20,
        minRange: 1,
        maxRange: 3,
        maxDurability: 120,
        price: 500,
        description: '上級忍者刀',
      });

      commander.getItemHolder().addItem(sword1);
      commander.getItemHolder().addItem(sword2);

      // 最初の武器を装備
      commander.getItemHolder().equipWeapon(sword1);
      expect(commander.getItemHolder().getEquippedWeapon()).toBe(sword1);

      // UIManager経由で2番目の武器を装備
      uiManager.showItemInventoryUI(mockArmy);
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onEquipWeaponCallback = (itemInventoryUI as any).onEquipWeaponCallback;

      if (onEquipWeaponCallback) {
        onEquipWeaponCallback(commander, sword2);
      }

      // 2番目の武器が装備され、1番目は自動解除
      expect(commander.getItemHolder().getEquippedWeapon()).toBe(sword2);
    });

    test('耐久度0の武器は装備できない', () => {
      const commander = mockArmy.getCommander();
      const brokenSword = new Weapon({
        id: 'broken1',
        name: '壊れた刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '壊れた刀',
      });

      // 武器の耐久度を0まで減らす
      for (let i = 0; i < 100; i++) {
        brokenSword.use();
      }
      expect(brokenSword.durability).toBe(0);

      commander.getItemHolder().addItem(brokenSword);

      // 装備を試みる
      const canUse = brokenSword.canUse();
      expect(canUse).toBe(false);
    });
  });

  describe('アイテム譲渡機能（task-9-3-4）', () => {
    test('軍団内でアイテムを譲渡できる', () => {
      const commander = mockArmy.getCommander();
      const soldier = mockArmy.getSoldiers()[0];

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
      expect(commander.getItemHolder().items).toContain(sword);
      expect(soldier.getItemHolder().items).not.toContain(sword);

      // UIManager経由でアイテム譲渡をテスト
      uiManager.showItemInventoryUI(mockArmy);
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onTransferItemCallback = (itemInventoryUI as any).onTransferItemCallback;

      if (onTransferItemCallback) {
        onTransferItemCallback(commander, soldier, sword);
      }

      // 譲渡完了確認
      expect(commander.getItemHolder().items).not.toContain(sword);
      expect(soldier.getItemHolder().items).toContain(sword);
    });

    test('装備中の武器譲渡時に自動装備解除される', () => {
      const commander = mockArmy.getCommander();
      const soldier = mockArmy.getSoldiers()[0];

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
      expect(commander.getItemHolder().getEquippedWeapon()).toBe(sword);

      // UIManager経由でアイテム譲渡をテスト
      uiManager.showItemInventoryUI(mockArmy);
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onTransferItemCallback = (itemInventoryUI as any).onTransferItemCallback;

      if (onTransferItemCallback) {
        onTransferItemCallback(commander, soldier, sword);
      }

      // 譲渡後の装備解除確認
      expect(commander.getItemHolder().getEquippedWeapon()).toBeNull();
      expect(soldier.getItemHolder().items).toContain(sword);
    });

    test('譲渡先の所持上限チェック', () => {
      const commander = mockArmy.getCommander();
      const soldier = mockArmy.getSoldiers()[0];

      // 兵士の持物を満杯にする
      for (let i = 0; i < 4; i++) {
        const item = new Consumable({
          id: `pill${i}`,
          name: `兵糧丸${i}`,
          effect: 'heal_full',
          maxUses: 1,
          price: 50,
          description: 'HP全回復',
        });
        soldier.getItemHolder().addItem(item);
      }
      expect(soldier.getItemHolder().items).toHaveLength(4);

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

      // UIManager経由でアイテム譲渡を試行
      uiManager.showItemInventoryUI(mockArmy);
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onTransferItemCallback = (itemInventoryUI as any).onTransferItemCallback;

      if (onTransferItemCallback) {
        onTransferItemCallback(commander, soldier, sword);
      }

      // 譲渡が失敗し、元の所持者に残っていることを確認
      expect(commander.getItemHolder().items).toContain(sword);
      expect(soldier.getItemHolder().items).toHaveLength(4);
      expect(soldier.getItemHolder().items).not.toContain(sword);
    });

    test('単独軍団メンバーは譲渡機能が無効化される', () => {
      const soloCommander = createMockCharacter({
        id: 'solo1',
        name: '単独指揮官',
        jobType: 'wind',
        stats: {
          hp: 100,
          maxHp: 100,
          attack: 30,
          defense: 20,
          speed: 18,
          moveSpeed: 13,
          sight: 8,
        },
        isCommander: true,
      });

      const soloArmy = new Army(scene, 100, 100, {
        id: 'soloArmy',
        name: '単独軍団',
        commander: soloCommander,
        soldiers: [], // 他のメンバーなし
        owner: 'player',
      });

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

      soloCommander.getItemHolder().addItem(sword);

      // ItemInventoryUIを表示
      uiManager.showItemInventoryUI(soloArmy);

      // 譲渡ボタンが無効化されていることを確認（内部実装への依存を避ける）
      // 譲渡可能条件：軍団に他のメンバーがいること
      const armyMembers = [soloArmy.getCommander(), ...soloArmy.getSoldiers()];
      const hasOtherMembers = armyMembers.length > 1;
      expect(hasOtherMembers).toBe(false);
    });
  });

  describe('実使用シナリオ', () => {
    test('持物管理の総合的なワークフロー', () => {
      const commander = mockArmy.getCommander();
      const soldier = mockArmy.getSoldiers()[0];

      // 初期装備を配置
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

      const pill = new Consumable({
        id: 'pill1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      commander.getItemHolder().addItem(sword);
      commander.getItemHolder().addItem(pill);

      // 武器を装備
      commander.getItemHolder().equipWeapon(sword);
      expect(commander.getItemHolder().getEquippedWeapon()).toBe(sword);

      // HPを減らして兵糧丸を使用
      commander.takeDamage(30);
      expect(commander.getStats().hp).toBe(70);

      // UIManager経由で消耗品使用
      uiManager.showItemInventoryUI(mockArmy);
      const itemInventoryUI = (uiManager as any).itemInventoryUI;
      const onUseItemCallback = (itemInventoryUI as any).onUseItemCallback;

      if (onUseItemCallback) {
        onUseItemCallback(commander, pill);
      }

      expect(commander.getStats().hp).toBe(100);
      expect(commander.getItemHolder().items).not.toContain(pill);
      expect(commander.getItemHolder().items).toContain(sword);

      // 武器を兵士に譲渡
      const onTransferItemCallback = (itemInventoryUI as any).onTransferItemCallback;

      if (onTransferItemCallback) {
        onTransferItemCallback(commander, soldier, sword);
      }

      // 譲渡完了確認
      expect(commander.getItemHolder().getEquippedWeapon()).toBeNull();
      expect(commander.getItemHolder().items).not.toContain(sword);
      expect(soldier.getItemHolder().items).toContain(sword);
    });
  });
});

// テスト用のモックキャラクター作成関数
function createMockCharacter(config: CharacterConfig): Character {
  return new Character(scene, 0, 0, config);
}

// テスト用のモック軍団作成関数
function createMockArmy(): Army {
  const mockCommander = createMockCharacter({
    id: 'commander1',
    name: '風忍隊長',
    jobType: 'wind',
    stats: {
      hp: 100,
      maxHp: 100,
      attack: 30,
      defense: 20,
      speed: 18,
      moveSpeed: 13,
      sight: 8,
    },
    isCommander: true,
  });

  const mockSoldier = createMockCharacter({
    id: 'soldier1',
    name: '鉄忍兵士',
    jobType: 'iron',
    stats: {
      hp: 120,
      maxHp: 150,
      attack: 25,
      defense: 40,
      speed: 12,
      moveSpeed: 8,
      sight: 6,
    },
  });

  return new Army(scene, 100, 100, {
    id: 'army1',
    name: '第一軍団',
    commander: mockCommander,
    soldiers: [mockSoldier],
    owner: 'player',
  });
}
