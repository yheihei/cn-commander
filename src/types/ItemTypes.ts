export enum ItemType {
  WEAPON = 'weapon',
  CONSUMABLE = 'consumable',
}

export enum WeaponType {
  SWORD = 'sword',
  PROJECTILE = 'projectile',
}

export interface ItemDisplayInfo {
  name: string;
  icon?: string;
  description: string;
}

export interface IItem {
  id: string;
  name: string;
  type: ItemType;
  stackable: boolean;
  getDisplayInfo(): ItemDisplayInfo;
}

export interface IWeapon extends IItem {
  weaponType: WeaponType;
  attackBonus: number;
  minRange: number;
  maxRange: number;
  durability: number;
  maxDurability: number;
  price: number;

  use(): void;
  canUse(): boolean;
  getDurabilityPercentage(): number;
  repair(amount?: number): void;
}

export interface IConsumable extends IItem {
  effect: string;
  uses: number;
  maxUses: number;
  price: number;

  use(): boolean;
  canUse(): boolean;
}

export interface IItemHolder {
  items: IItem[];
  maxItems: number;
  equippedWeapon: IWeapon | null;

  addItem(item: IItem): boolean;
  removeItem(item: IItem): boolean;
  hasItem(itemId: string): boolean;
  getItemCount(): number;

  equipWeapon(weapon: IWeapon): void;
  getEquippedWeapon(): IWeapon | null;
  autoEquipBestWeapon(): void;
  getWeapons(): IWeapon[];
  getConsumables(): IItem[];
  getUsableWeapons(): IWeapon[];
}

export interface WeaponData {
  id: string;
  name: string;
  weaponType: WeaponType;
  attackBonus: number;
  minRange: number;
  maxRange: number;
  maxDurability: number;
  price: number;
  description: string;
}

export interface ConsumableData {
  id: string;
  name: string;
  effect: string;
  maxUses: number;
  price: number;
  description: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface IRangeChecker {
  isInRange(attackerPos: Position, targetPos: Position, weapon: IWeapon): boolean;
  getAttackablePositions(attackerPos: Position, weapon: IWeapon): Position[];
}
