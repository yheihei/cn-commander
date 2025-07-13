import { Item } from './Item';
import { IConsumable, ItemType, ConsumableData } from '../types/ItemTypes';

export class Consumable extends Item implements IConsumable {
  public uses: number;

  constructor(private readonly data: ConsumableData) {
    super(data.id, data.name, ItemType.CONSUMABLE, true);
    this.uses = data.maxUses;
  }

  get effect(): string {
    return this.data.effect;
  }

  get maxUses(): number {
    return this.data.maxUses;
  }

  get price(): number {
    return this.data.price;
  }

  use(): boolean {
    if (this.canUse()) {
      this.uses--;
      return true;
    }
    return false;
  }

  canUse(): boolean {
    return this.uses > 0;
  }

  protected getDescription(): string {
    return this.data.description;
  }
}
