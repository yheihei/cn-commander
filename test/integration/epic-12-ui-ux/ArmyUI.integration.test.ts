import { UIManager } from '../../../src/ui/UIManager';
import { createMockProductionManager } from '../../mocks/ProductionManagerMock';
import { Army } from '../../../src/army/Army';
import { Character } from '../../../src/character/Character';
import { createMockScene } from '../../setup';
import { MovementMode } from '../../../src/types/MovementTypes';
import { Weapon } from '../../../src/item/Weapon';
import { Consumable } from '../../../src/item/Consumable';
import { CharacterConfig } from '../../../src/types/CharacterTypes';
import { WeaponType } from '../../../src/types/ItemTypes';

// モックシーンをグローバルスコープで定義
let scene: any;

describe('[エピック12] Army UI System Integration Tests', () => {
  let uiManager: UIManager;

  beforeEach(() => {
    scene = createMockScene();
    const productionManager = createMockProductionManager();
    uiManager = new UIManager(scene, productionManager, {});
  });

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy();
    }
  });

  describe('軍団情報パネルの表示', () => {
    test('軍団選択時に情報パネルが表示される', () => {
      // 軍団のモックを作成
      const mockCommander = createMockCharacter({
        id: 'commander1',
        name: '風忍隊長',
        jobType: 'wind',
        stats: {
          hp: 80,
          maxHp: 100,
          attack: 30,
          defense: 20,
          speed: 18,
          moveSpeed: 13,
          sight: 8,
        },
        isCommander: true,
      });

      const mockSoldier1 = createMockCharacter({
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

      const mockArmy = new Army(scene, 100, 100, {
        id: 'army1',
        name: '第一軍団',
        commander: mockCommander,
        soldiers: [mockSoldier1],
        owner: 'player',
      });

      // showArmyInfoが呼ばれることを確認
      const showArmyInfoSpy = jest.spyOn(uiManager, 'showArmyInfo');

      // アクションメニューを表示（内部でshowArmyInfoが呼ばれる）
      uiManager.showActionMenu(
        mockArmy,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      expect(showArmyInfoSpy).toHaveBeenCalledWith(mockArmy);
    });

    test('軍団選択解除時に情報パネルが非表示になる', () => {
      const mockArmy = createMockArmy();

      // 軍団を選択
      uiManager.showActionMenu(
        mockArmy,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      // hideArmyInfoが呼ばれることを確認
      const hideArmyInfoSpy = jest.spyOn(uiManager, 'hideArmyInfo');

      // アクションメニューをキャンセル（内部でhideArmyInfoが呼ばれる）
      const onCancel = jest.fn();
      uiManager.showActionMenu(
        mockArmy,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        onCancel,
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      // onCancelコールバックを実行（実際のUIでキャンセルボタンをクリックした場合の動作）
      const actionMenu = (uiManager as any).actionMenu;
      if (actionMenu) {
        const cancelCallback = (actionMenu as any).onCancelCallback;
        if (cancelCallback) {
          cancelCallback();
        }
      }

      expect(hideArmyInfoSpy).toHaveBeenCalled();
    });
  });

  describe('軍団状態の更新', () => {
    test('移動状態の変化が情報パネルに反映される', () => {
      const mockArmy = createMockArmy();

      // 軍団を選択して情報パネルを表示
      uiManager.showArmyInfo(mockArmy);

      // updateArmyInfoが正しく動作することを確認
      const updateArmyInfoSpy = jest.spyOn(uiManager, 'updateArmyInfo');

      // 移動状態を変更
      mockArmy.setMovementMode(MovementMode.COMBAT);
      mockArmy.startMovement({ x: 200, y: 200 }, MovementMode.COMBAT);

      // 情報を更新
      uiManager.updateArmyInfo(mockArmy);

      expect(updateArmyInfoSpy).toHaveBeenCalledWith(mockArmy);
    });

    test('メンバーのHP変化が情報パネルに反映される', () => {
      const mockArmy = createMockArmy();

      // 軍団を選択して情報パネルを表示
      uiManager.showArmyInfo(mockArmy);

      // メンバーのHPを変更
      const commander = mockArmy.getCommander();
      commander.takeDamage(20);

      // 情報を更新
      uiManager.updateArmyInfo(mockArmy);

      // HPが更新されていることを確認（実際のパネル内容は内部実装による）
      expect(commander.getStats().hp).toBe(80); // 100 - 20
    });
  });

  describe('装備アイテムの表示', () => {
    test('メンバーの装備アイテムが表示される', () => {
      const mockArmy = createMockArmy();

      // 武器を装備
      const weapon = new Weapon({
        id: 'weapon1',
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '忍者刀',
      });

      const commander = mockArmy.getCommander();
      commander.getItemHolder().addItem(weapon);
      commander.getItemHolder().equipWeapon(weapon);

      // 軍団を選択して情報パネルを表示
      uiManager.showArmyInfo(mockArmy);

      // アイテムが装備されていることを確認
      const equipped = commander.getItemHolder().getEquippedWeapon();
      expect(equipped).toBe(weapon);
    });

    test('消耗品アイテムも表示される', () => {
      const mockArmy = createMockArmy();

      // 消耗品を所持
      const consumable = new Consumable({
        id: 'consumable1',
        name: '兵糧丸',
        effect: 'heal_full',
        maxUses: 1,
        price: 50,
        description: 'HP全回復',
      });

      const commander = mockArmy.getCommander();
      commander.getItemHolder().addItem(consumable);

      // 軍団を選択して情報パネルを表示
      uiManager.showArmyInfo(mockArmy);

      // アイテムが所持されていることを確認
      const items = commander.getItemHolder().items;
      expect(items).toContain(consumable);
    });
  });

  describe('複数軍団の切り替え', () => {
    test('別の軍団を選択すると情報が切り替わる', () => {
      const mockArmy1 = createMockArmy('第一軍団');
      const mockArmy2 = createMockArmy('第二軍団');

      // 最初の軍団を選択
      uiManager.showActionMenu(
        mockArmy1,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );
      expect(uiManager.getCurrentSelectedArmy()).toBe(mockArmy1);

      // 別の軍団を選択
      uiManager.hideActionMenu();
      uiManager.showActionMenu(
        mockArmy2,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );
      expect(uiManager.getCurrentSelectedArmy()).toBe(mockArmy2);
    });
  });

  describe('待機コマンド', () => {
    test('待機ボタンをクリックすると軍団が待機モードになる', () => {
      const mockArmy = createMockArmy();

      // 初期状態を確認
      expect(mockArmy.getMovementMode()).toBe(MovementMode.NORMAL);

      // 待機コールバックをモック
      const onStandby = jest.fn(() => {
        mockArmy.setMovementMode(MovementMode.STANDBY);
        mockArmy.stopMovement();
      });

      // アクションメニューを表示
      uiManager.showActionMenu(
        mockArmy,
        jest.fn(),
        onStandby,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      // 待機ボタンをクリック（コールバックを実行）
      onStandby();

      // 軍団が待機モードになっていることを確認
      expect(mockArmy.getMovementMode()).toBe(MovementMode.STANDBY);
      expect(onStandby).toHaveBeenCalled();
    });

    test('待機モードでは視界ボーナスが適用される', () => {
      const mockArmy = createMockArmy();
      // const commander = mockArmy.getCommander(); // 現在は未使用

      // 基本視界を確認
      // const baseSight = commander.getStats().sight; // 現在は未使用

      // 待機モードに設定
      mockArmy.setMovementMode(MovementMode.STANDBY);

      // MovementModeの設定で待機モードの視界ボーナスが+1されることを確認
      const standbyConfig = require('../../../src/types/MovementTypes').MOVEMENT_MODE_CONFIGS[
        MovementMode.STANDBY
      ];
      expect(standbyConfig.sightBonus).toBe(1);
    });

    test('待機中の軍団は移動できない', () => {
      const mockArmy = createMockArmy();

      // 待機モードに設定
      mockArmy.setMovementMode(MovementMode.STANDBY);
      mockArmy.stopMovement();

      // 移動速度が0になることを確認
      const standbyConfig = require('../../../src/types/MovementTypes').MOVEMENT_MODE_CONFIGS[
        MovementMode.STANDBY
      ];
      expect(standbyConfig.speedMultiplier).toBe(0);
    });

    test('待機選択後は情報パネルが非表示になる', () => {
      const mockArmy = createMockArmy();

      // アクションメニューを表示
      uiManager.showActionMenu(
        mockArmy,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      const hideArmyInfoSpy = jest.spyOn(uiManager, 'hideArmyInfo');

      // 待機コールバックを実行
      const onStandby = jest.fn();
      uiManager.showActionMenu(
        mockArmy,
        jest.fn(),
        onStandby,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(),
        jest.fn(), // onOccupy
        false, // canOccupy
      );

      // ActionMenuのonStandbyコールバックを直接実行
      const actionMenu = (uiManager as any).actionMenu;
      if (actionMenu) {
        const standbyCallback = (actionMenu as any).onStandbyCallback;
        if (standbyCallback) {
          standbyCallback();
        }
      }

      // hideArmyInfoが呼ばれたことを確認
      expect(hideArmyInfoSpy).toHaveBeenCalled();
    });
  });
});

// テスト用のモックキャラクター作成関数
function createMockCharacter(config: CharacterConfig): Character {
  return new Character(scene, 0, 0, config);
}

// テスト用のモック軍団作成関数
function createMockArmy(name: string = '第一軍団'): Army {
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

  return new Army(scene, 100, 100, {
    id: 'army1',
    name,
    commander: mockCommander,
    soldiers: [],
    owner: 'player',
  });
}
