import { IItem, ItemType, ItemDisplayInfo } from '../types/ItemTypes';

export abstract class Item implements IItem {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: ItemType,
    public readonly stackable: boolean = false,
  ) {}

  getDisplayInfo(): ItemDisplayInfo {
    return {
      name: this.name,
      description: this.getDescription(),
    };
  }

  protected abstract getDescription(): string;
}
