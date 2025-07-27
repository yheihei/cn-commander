import { ItemSelectionUI } from '../../../src/ui/ItemSelectionUI';
import { FormationData } from '../../../src/ui/ArmyFormationUI';
import { Character } from '../../../src/character/Character';
import { Base } from '../../../src/base/Base';
import { BaseData, BaseType } from '../../../src/types/MapTypes';
import { IItem, WeaponType } from '../../../src/types/ItemTypes';
import { Weapon } from '../../../src/item/Weapon';
import { Consumable } from '../../../src/item/Consumable';

// Phaserモック
jest.mock('phaser', () => {
  return {
    GameObjects: {
      Container: class MockContainer {
        x: number;
        y: number;
        list: any[] = [];
        visible: boolean = false;
        depth: number = 0;
        data: Map<string, any> = new Map();

        constructor(_scene: any, x: number, y: number) {
          this.x = x;
          this.y = y;
        }

        add = jest.fn((child) => {
          this.list.push(child);
          return this;
        });
        setPosition = jest.fn((x: number, y: number) => {
          this.x = x;
          this.y = y;
          return this;
        });
        setVisible = jest.fn((visible: boolean) => {
          this.visible = visible;
          return this;
        });
        setDepth = jest.fn((depth: number) => {
          this.depth = depth;
          return this;
        });
        destroy = jest.fn();
        setData = jest.fn((key: string, value: any) => {
          this.data.set(key, value);
          return this;
        });
        getData = jest.fn((key: string) => {
          return this.data.get(key);
        });
        removeAll = jest.fn((destroy?: boolean) => {
          if (destroy) {
            this.list.forEach((child) => child.destroy?.());
          }
          this.list = [];
          return this;
        });
        removeAllListeners = jest.fn();
      },
      Rectangle: class MockRectangle {
        constructor(
          public scene: any,
          public x: number,
          public y: number,
          public width: number,
          public height: number,
          public fillColor?: number,
          public fillAlpha?: number,
        ) {}
        setOrigin = jest.fn();
        setStrokeStyle = jest.fn();
        setInteractive = jest.fn();
        setFillStyle = jest.fn();
        on = jest.fn();
        destroy = jest.fn();
        removeInteractive = jest.fn();
        disableInteractive = jest.fn();
      },
      Text: class MockText {
        constructor(
          public scene: any,
          public x: number,
          public y: number,
          public text: string,
          public style?: any,
        ) {}
        setOrigin = jest.fn();
        setText = jest.fn((text: string) => {
          this.text = text;
        });
        setColor = jest.fn();
        setAlpha = jest.fn();
        destroy = jest.fn();
        setInteractive = jest.fn();
        on = jest.fn();
      },
    },
  };
});

// モックシーンの作成
const createMockScene = (): any => {
  const mockScene: any = {
    add: {
      container: jest.fn(
        (x: number, y: number) =>
          new (jest.requireMock('phaser').GameObjects.Container)(mockScene, x, y),
      ),
      rectangle: jest.fn(
        (x: number, y: number, width: number, height: number, color?: number, alpha?: number) =>
          new (jest.requireMock('phaser').GameObjects.Rectangle)(
            mockScene,
            x,
            y,
            width,
            height,
            color,
            alpha,
          ),
      ),
      text: jest.fn(
        (x: number, y: number, text: string, style?: any) =>
          new (jest.requireMock('phaser').GameObjects.Text)(mockScene, x, y, text, style),
      ),
      existing: jest.fn(),
    },
    cameras: {
      main: {
        zoom: 2.25,
        worldView: {
          x: 0,
          y: 0,
          width: 1280 / 2.25,
          height: 720 / 2.25,
        },
      },
    },
  };
  return mockScene;
};

// モックキャラクター作成
const createMockCharacter = (id: string, name: string, jobType: string): Character => {
  const mockEquippedWeapon = jest.fn(() => null);
  const mockEquipWeapon = jest.fn();
  const mockAddItem = jest.fn(() => true);
  const mockRemoveItem = jest.fn(() => true);

  const character = {
    getId: jest.fn(() => id),
    getName: jest.fn(() => name),
    getJobType: jest.fn(() => jobType),
    getStats: jest.fn(() => ({
      hp: 30,
      maxHp: 30,
      attack: 20,
      defense: 10,
      speed: 20,
      moveSpeed: 13,
      sight: 8,
    })),
    getItemHolder: jest.fn(() => ({
      getEquippedWeapon: mockEquippedWeapon,
      equipWeapon: mockEquipWeapon,
      addItem: mockAddItem,
      removeItem: mockRemoveItem,
    })),
  } as any;

  // テスト用にモック関数への参照を保持
  (character as any)._mockEquipWeapon = mockEquipWeapon;
  (character as any)._mockAddItem = mockAddItem;

  return character;
};

// モック拠点作成
const createMockBase = (): Base => {
  const baseData: BaseData = {
    id: 'test-base',
    name: 'テスト拠点',
    type: BaseType.PLAYER_HQ,
    x: 10,
    y: 10,
    maxHp: 200,
    hp: 200,
    income: 200,
    owner: 'player',
  };
  const base = new Base(createMockScene() as any, baseData);
  return base;
};

describe('[エピック3] ItemSelectionUI Integration Tests', () => {
  let scene: any;
  let itemSelectionUI: ItemSelectionUI;
  let mockBase: Base;
  let formationData: FormationData;
  let onProceedToDeploymentCallback: jest.Mock;
  let onBackCallback: jest.Mock;
  let onCancelledCallback: jest.Mock;

  beforeEach(() => {
    scene = createMockScene();
    mockBase = createMockBase();

    // フォーメーションデータの作成
    formationData = {
      commander: createMockCharacter('commander-1', '咲耶', 'wind'),
      soldiers: [
        createMockCharacter('soldier-1', '風太郎', 'wind'),
        createMockCharacter('soldier-2', '鉄子', 'iron'),
        createMockCharacter('soldier-3', '影丸', 'shadow'),
      ],
    };

    // コールバック関数のモック
    onProceedToDeploymentCallback = jest.fn();
    onBackCallback = jest.fn();
    onCancelledCallback = jest.fn();

    // ItemSelectionUIの作成
    itemSelectionUI = new ItemSelectionUI({
      scene,
      base: mockBase,
      formationData,
      onProceedToDeployment: onProceedToDeploymentCallback,
      onBack: onBackCallback,
      onCancelled: onCancelledCallback,
    });
  });

  afterEach(() => {
    if (itemSelectionUI) {
      itemSelectionUI.destroy();
    }
  });

  describe('基本機能', () => {
    test('ItemSelectionUIが正しく初期化される', () => {
      expect(itemSelectionUI).toBeDefined();
      expect(itemSelectionUI.visible).toBe(false);
    });

    test('show()で表示される', () => {
      itemSelectionUI.show();
      expect(itemSelectionUI.visible).toBe(true);
    });

    test('hide()で非表示になる', () => {
      itemSelectionUI.show();
      itemSelectionUI.hide();
      expect(itemSelectionUI.visible).toBe(false);
    });
  });

  describe('アイテム表示機能', () => {
    test('倉庫アイテムが正しく表示される', () => {
      const items: IItem[] = [
        new Weapon({
          id: 'sword-1',
          name: '忍者刀',
          weaponType: WeaponType.SWORD,
          attackBonus: 15,
          minRange: 1,
          maxRange: 3,
          maxDurability: 100,
          price: 300,
          description: '標準的な忍者刀',
        }),
        new Weapon({
          id: 'shuriken-1',
          name: '手裏剣',
          weaponType: WeaponType.PROJECTILE,
          attackBonus: 5,
          minRange: 1,
          maxRange: 6,
          maxDurability: 100,
          price: 200,
          description: '投擲武器',
        }),
        new Consumable({
          id: 'pill-1',
          name: '兵糧丸',
          effect: 'HP全快',
          maxUses: 1,
          price: 50,
          description: 'HPを全回復する',
        }),
      ];

      itemSelectionUI.updateInventory(items);

      // アイテムが倉庫に設定されているか確認
      const availableItems = (itemSelectionUI as any).availableItems;
      expect(availableItems).toHaveLength(3);
      expect(availableItems[0].name).toBe('忍者刀');
      expect(availableItems[1].name).toBe('手裏剣');
      expect(availableItems[2].name).toBe('兵糧丸');
    });

    test('同じ種類のアイテムがグループ化される', () => {
      const items: IItem[] = [
        new Weapon({
          id: 'sword-1',
          name: '忍者刀',
          weaponType: WeaponType.SWORD,
          attackBonus: 15,
          minRange: 1,
          maxRange: 3,
          maxDurability: 100,
          price: 300,
          description: '標準的な忍者刀',
        }),
        new Weapon({
          id: 'sword-2',
          name: '忍者刀',
          weaponType: WeaponType.SWORD,
          attackBonus: 15,
          minRange: 1,
          maxRange: 3,
          maxDurability: 100,
          price: 300,
          description: '標準的な忍者刀',
        }),
      ];

      itemSelectionUI.updateInventory(items);

      // updateItemListを直接呼び出してテスト
      (itemSelectionUI as any).updateItemList();

      // itemRowsのサイズでグループ化を確認
      const itemRows = (itemSelectionUI as any).itemRows;
      expect(itemRows.size).toBe(1); // 2つのアイテムが1つのグループになる
    });
  });

  describe('兵士ナビゲーション機能', () => {
    test('初期状態で最初の兵士が表示される', () => {
      const currentSoldierIndex = (itemSelectionUI as any).currentSoldierIndex;
      expect(currentSoldierIndex).toBe(0);

      const soldierNameText = (itemSelectionUI as any).soldierNameText;
      expect(soldierNameText.setText).toHaveBeenCalledWith('咲耶（風忍）');
    });

    test('次へボタンで兵士が切り替わる', () => {
      (itemSelectionUI as any).navigateToNextSoldier();

      const currentSoldierIndex = (itemSelectionUI as any).currentSoldierIndex;
      expect(currentSoldierIndex).toBe(1);

      const soldierNameText = (itemSelectionUI as any).soldierNameText;
      expect(soldierNameText.setText).toHaveBeenCalledWith('風太郎（風忍）');
    });

    test('前へボタンで兵士が切り替わる', () => {
      (itemSelectionUI as any).navigateToPreviousSoldier();

      const currentSoldierIndex = (itemSelectionUI as any).currentSoldierIndex;
      expect(currentSoldierIndex).toBe(3); // 0から-1でループして3になる

      const soldierNameText = (itemSelectionUI as any).soldierNameText;
      expect(soldierNameText.setText).toHaveBeenCalledWith('影丸（影忍）');
    });
  });

  describe('アイテム割り当て機能', () => {
    test('兵士にアイテムを追加できる', () => {
      const item = new Weapon({
        id: 'sword-1',
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '標準的な忍者刀',
      });

      itemSelectionUI.updateInventory([item]);

      const commander = formationData.commander!;
      itemSelectionUI.assignItem(commander, item);

      // 兵士のアイテムが追加されているか確認
      const soldierItems = (itemSelectionUI as any).soldierItemsMap.get(commander);
      expect(soldierItems).toHaveLength(1);
      expect(soldierItems[0]).toBe(item);

      // 倉庫から削除されているか確認
      const availableItems = (itemSelectionUI as any).availableItems;
      expect(availableItems).toHaveLength(0);
    });

    test('最初の武器は自動装備される', () => {
      const weapon = new Weapon({
        id: 'sword-1',
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '標準的な忍者刀',
      });

      itemSelectionUI.updateInventory([weapon]);

      const commander = formationData.commander!;
      itemSelectionUI.assignItem(commander, weapon);

      // addItemが呼ばれたか確認（ItemHolderが自動装備を行う）
      expect((commander as any)._mockAddItem).toHaveBeenCalledWith(weapon);
    });

    test('アイテム上限（4個）を超えて追加できない', () => {
      const items: IItem[] = [];
      for (let i = 0; i < 5; i++) {
        items.push(
          new Weapon({
            id: `sword-${i}`,
            name: '忍者刀',
            weaponType: WeaponType.SWORD,
            attackBonus: 15,
            minRange: 1,
            maxRange: 3,
            maxDurability: 100,
            price: 300,
            description: '標準的な忍者刀',
          }),
        );
      }

      itemSelectionUI.updateInventory(items);

      const commander = formationData.commander!;

      // 4個まで追加（availableItemsから取得するので常に最初のアイテムを取る）
      for (let i = 0; i < 4; i++) {
        const availableItems = (itemSelectionUI as any).availableItems;
        if (availableItems.length > 0) {
          itemSelectionUI.assignItem(commander, availableItems[0]);
        }
      }

      const soldierItemsBefore = (itemSelectionUI as any).soldierItemsMap.get(commander);
      expect(soldierItemsBefore).toHaveLength(4);

      // 5個目は追加されない（上限に達しているため）
      const availableItems = (itemSelectionUI as any).availableItems;
      if (availableItems.length > 0) {
        itemSelectionUI.assignItem(commander, availableItems[0]);
      }

      const soldierItems = (itemSelectionUI as any).soldierItemsMap.get(commander);
      expect(soldierItems).toHaveLength(4);
    });
  });

  describe('画面遷移機能', () => {
    test('決定ボタンで出撃位置選択へ遷移', () => {
      // アイテムを装備させる
      const weapon = new Weapon({
        id: 'sword-1',
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '標準的な忍者刀',
      });

      itemSelectionUI.updateInventory([weapon]);
      itemSelectionUI.assignItem(formationData.commander!, weapon);

      // onProceedを直接呼び出す
      (itemSelectionUI as any).onProceed();

      expect(onProceedToDeploymentCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          commander: formationData.commander,
          soldiers: formationData.soldiers,
          items: expect.any(Map),
        }),
      );
    });

    test('戻るボタンで兵士選択画面に戻る', () => {
      // onBackを直接呼び出す
      (itemSelectionUI as any).onBack();

      expect(onBackCallback).toHaveBeenCalled();
      expect(itemSelectionUI.destroy).toHaveBeenCalled();
    });
  });

  describe('FormationDataの更新', () => {
    test('新しいFormationDataで内容が更新される', () => {
      const newFormationData: FormationData = {
        commander: createMockCharacter('new-commander', '新指揮官', 'iron'),
        soldiers: [createMockCharacter('new-soldier-1', '新兵士1', 'medicine')],
      };

      itemSelectionUI.setFormationData(newFormationData);

      // 兵士リストが更新されているか確認
      const soldierItemsMap = (itemSelectionUI as any).soldierItemsMap as Map<Character, IItem[]>;

      expect(soldierItemsMap.has(newFormationData.commander!)).toBe(true);
      expect(soldierItemsMap.has(newFormationData.soldiers[0])).toBe(true);
      expect(soldierItemsMap.size).toBe(2); // 新しい指揮官 + 新しい兵士1名
    });
  });
});
