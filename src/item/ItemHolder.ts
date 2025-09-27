import { IItem, IWeapon, IItemHolder, ItemType } from '../types/ItemTypes';

export class ItemHolder implements IItemHolder {
  private _items: IItem[] = [];
  private _equippedWeapon: IWeapon | null = null;
  public readonly maxItems: number = 4;

  get items(): IItem[] {
    return [...this._items];
  }

  get equippedWeapon(): IWeapon | null {
    return this._equippedWeapon;
  }

  addItem(item: IItem): boolean {
    if (this._items.length >= this.maxItems) {
      return false;
    }

    this._items.push(item);

    if (item.type === ItemType.WEAPON && !this._equippedWeapon) {
      this.autoEquipBestWeapon();
    }

    return true;
  }

  removeItem(item: IItem): boolean {
    const index = this._items.indexOf(item);
    if (index === -1) {
      return false;
    }

    this._items.splice(index, 1);

    if (item === this._equippedWeapon) {
      this._equippedWeapon = null;
      this.autoEquipBestWeapon();
    }

    return true;
  }

  hasItem(itemId: string): boolean {
    return this._items.some((item) => item.id === itemId);
  }

  getItemCount(): number {
    return this._items.length;
  }

  equipWeapon(weapon: IWeapon): void {
    if (!this._items.includes(weapon)) {
      throw new Error('Cannot equip weapon that is not in inventory');
    }

    if (weapon.type !== ItemType.WEAPON) {
      throw new Error('Can only equip weapons');
    }

    // 既に装備中の武器がある場合は自動的に装備解除
    if (this._equippedWeapon && this._equippedWeapon !== weapon) {
      console.log(`[ItemHolder] 自動装備解除: ${this._equippedWeapon.name}`);
    }

    const previousWeapon = this._equippedWeapon;
    this._equippedWeapon = weapon;
    console.log(`[ItemHolder] 装備: ${weapon.name} (前の装備: ${previousWeapon ? previousWeapon.name : 'なし'})`);
  }

  unequipWeapon(): void {
    if (this._equippedWeapon) {
      console.log(`[ItemHolder] 装備解除: ${this._equippedWeapon.name}`);
      this._equippedWeapon = null;
    }
  }

  getEquippedWeapon(): IWeapon | null {
    return this._equippedWeapon;
  }

  autoEquipBestWeapon(): void {
    const weapons = this._items.filter(
      (item) => item.type === ItemType.WEAPON && (item as IWeapon).canUse(),
    ) as IWeapon[];

    if (weapons.length === 0) {
      this._equippedWeapon = null;
      return;
    }

    const bestWeapon = weapons.reduce((best, current) => {
      if (current.attackBonus > best.attackBonus) {
        return current;
      }
      if (
        current.attackBonus === best.attackBonus &&
        current.getDurabilityPercentage() > best.getDurabilityPercentage()
      ) {
        return current;
      }
      return best;
    });

    this._equippedWeapon = bestWeapon;
  }

  getWeapons(): IWeapon[] {
    return this._items.filter((item) => item.type === ItemType.WEAPON) as IWeapon[];
  }

  getConsumables(): IItem[] {
    return this._items.filter((item) => item.type === ItemType.CONSUMABLE);
  }

  getUsableWeapons(): IWeapon[] {
    return this.getWeapons().filter((weapon) => weapon.canUse());
  }
}
