import { IItem, IWeapon, IConsumable, ItemType, WeaponType } from '../types/ItemTypes';
import { ProductionItemType } from '../production/ProductionManager';

/**
 * アイテムファクトリークラス
 * ProductionItemTypeからIItemインスタンスを生成する
 */
export class ItemFactory {
  private static idCounter = 0;

  /**
   * ProductionItemTypeからIItemインスタンスを生成
   * @param itemType 生産アイテムタイプ
   * @param quantity 生成する数量
   * @returns IItemインスタンスの配列
   */
  public static createItems(itemType: ProductionItemType, quantity: number): IItem[] {
    const items: IItem[] = [];
    for (let i = 0; i < quantity; i++) {
      const item = this.createSingleItem(itemType);
      if (item) {
        items.push(item);
      }
    }
    return items;
  }

  /**
   * 単一のアイテムインスタンスを生成
   */
  private static createSingleItem(itemType: ProductionItemType): IItem | null {
    const id = `${itemType}_${++this.idCounter}`;

    switch (itemType) {
      case ProductionItemType.NINJA_SWORD:
        return this.createNinjaSword(id);
      case ProductionItemType.SHURIKEN:
        return this.createShuriken(id);
      case ProductionItemType.BOW:
        return this.createBow(id);
      case ProductionItemType.FOOD_PILL:
        return this.createFoodPill(id);
      default:
        console.warn(`Unknown item type: ${itemType}`);
        return null;
    }
  }

  /**
   * 忍者刀を生成
   */
  private static createNinjaSword(id: string): IWeapon {
    return {
      id,
      name: '忍者刀',
      type: ItemType.WEAPON,
      stackable: false,
      weaponType: WeaponType.SWORD,
      attackBonus: 15,
      minRange: 1,
      maxRange: 3,
      durability: 100,
      maxDurability: 100,
      price: 300,
      getDisplayInfo: () => ({
        name: '忍者刀',
        description: '基本的な刀剣',
      }),
      use: () => {
        // 武器使用時の処理（戦闘システムで実装）
      },
      canUse: () => true,
      getDurabilityPercentage() {
        return (this.durability / this.maxDurability) * 100;
      },
      repair(amount?: number) {
        const repairAmount = amount || this.maxDurability;
        this.durability = Math.min(this.durability + repairAmount, this.maxDurability);
      },
    };
  }

  /**
   * 手裏剣を生成
   */
  private static createShuriken(id: string): IWeapon {
    return {
      id,
      name: '手裏剣',
      type: ItemType.WEAPON,
      stackable: false,
      weaponType: WeaponType.PROJECTILE,
      attackBonus: 5,
      minRange: 1,
      maxRange: 6,
      durability: 100,
      maxDurability: 100,
      price: 200,
      getDisplayInfo: () => ({
        name: '手裏剣',
        description: '飛び道具',
      }),
      use: () => {
        // 武器使用時の処理（戦闘システムで実装）
      },
      canUse: () => true,
      getDurabilityPercentage() {
        return (this.durability / this.maxDurability) * 100;
      },
      repair(amount?: number) {
        const repairAmount = amount || this.maxDurability;
        this.durability = Math.min(this.durability + repairAmount, this.maxDurability);
      },
    };
  }

  /**
   * 弓を生成
   */
  private static createBow(id: string): IWeapon {
    return {
      id,
      name: '弓',
      type: ItemType.WEAPON,
      stackable: false,
      weaponType: WeaponType.PROJECTILE,
      attackBonus: 2,
      minRange: 4,
      maxRange: 12,
      durability: 100,
      maxDurability: 100,
      price: 400,
      getDisplayInfo: () => ({
        name: '弓',
        description: '長距離飛び道具',
      }),
      use: () => {
        // 武器使用時の処理（戦闘システムで実装）
      },
      canUse: () => true,
      getDurabilityPercentage() {
        return (this.durability / this.maxDurability) * 100;
      },
      repair(amount?: number) {
        const repairAmount = amount || this.maxDurability;
        this.durability = Math.min(this.durability + repairAmount, this.maxDurability);
      },
    };
  }

  /**
   * 兵糧丸を生成
   */
  private static createFoodPill(id: string): IConsumable {
    return {
      id,
      name: '兵糧丸',
      type: ItemType.CONSUMABLE,
      stackable: true,
      effect: 'HP全快',
      uses: 1,
      maxUses: 1,
      price: 50,
      getDisplayInfo: () => ({
        name: '兵糧丸',
        description: 'HP全快アイテム',
      }),
      use: () => {
        // アイテム使用時の処理（実装済みの場合は適切な処理を実行）
        // 現在は使用成功を返す
        return true;
      },
      canUse: () => true,
    };
  }

  /**
   * InventoryManagerのデータからIItemインスタンスを生成
   * @param inventoryData InventoryManagerから取得したMap<string, number>データ
   * @returns IItemインスタンスの配列
   */
  public static createItemsFromInventory(inventoryData: Map<string, number>): IItem[] {
    const items: IItem[] = [];

    for (const [itemTypeStr, quantity] of inventoryData) {
      // ProductionItemTypeにキャストできるか確認
      const itemType = itemTypeStr as ProductionItemType;
      if (Object.values(ProductionItemType).includes(itemType)) {
        const createdItems = this.createItems(itemType, quantity);
        items.push(...createdItems);
      } else {
        console.warn(`Unknown item type in inventory: ${itemTypeStr}`);
      }
    }

    return items;
  }
}
