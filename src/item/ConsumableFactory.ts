import { Consumable } from './Consumable';
import { ConsumableData } from '../types/ItemTypes';

export class ConsumableFactory {
  private static readonly CONSUMABLE_DATA: Record<string, ConsumableData> = {
    healing_pill: {
      id: 'healing_pill',
      name: '兵糧丸',
      effect: 'heal_full',
      maxUses: 1,
      price: 50,
      description: 'HP全快の回復アイテム。使い切り。',
    },
  };

  static createConsumable(consumableId: string): Consumable {
    const data = this.getConsumableData(consumableId);
    return new Consumable(data);
  }

  static getConsumableData(consumableId: string): ConsumableData {
    const data = this.CONSUMABLE_DATA[consumableId];
    if (!data) {
      throw new Error(`Unknown consumable ID: ${consumableId}`);
    }
    return data;
  }

  static getAllConsumableIds(): string[] {
    return Object.keys(this.CONSUMABLE_DATA);
  }
}
