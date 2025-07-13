import { Item } from './Item';
import { IWeapon, ItemType, WeaponType, WeaponData } from '../types/ItemTypes';

export class Weapon extends Item implements IWeapon {
  public durability: number;

  constructor(private readonly data: WeaponData) {
    super(data.id, data.name, ItemType.WEAPON, false);
    this.durability = data.maxDurability;
  }

  get weaponType(): WeaponType {
    return this.data.weaponType;
  }

  get attackBonus(): number {
    return this.data.attackBonus;
  }

  get minRange(): number {
    return this.data.minRange;
  }

  get maxRange(): number {
    return this.data.maxRange;
  }

  get maxDurability(): number {
    return this.data.maxDurability;
  }

  get price(): number {
    return this.data.price;
  }

  use(): void {
    if (this.canUse()) {
      this.durability--;
    }
  }

  canUse(): boolean {
    return this.durability > 0;
  }

  getDurabilityPercentage(): number {
    return (this.durability / this.maxDurability) * 100;
  }

  repair(amount?: number): void {
    if (amount === undefined) {
      this.durability = this.maxDurability;
    } else {
      this.durability = Math.min(this.durability + amount, this.maxDurability);
    }
  }

  protected getDescription(): string {
    return this.data.description;
  }
}
