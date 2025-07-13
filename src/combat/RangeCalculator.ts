import { Character } from '../character/Character';
import { IWeapon, WeaponType } from '../types/ItemTypes';
import { MapManager } from '../map/MapManager';

interface GridPosition {
  x: number;
  y: number;
}

export interface WeaponRange {
  min: number;
  max: number;
}

export class RangeCalculator {
  private static readonly WEAPON_RANGES: Record<string, WeaponRange> = {
    sword: { min: 1, max: 3 },
    shuriken: { min: 2, max: 6 },
  };

  constructor(private mapManager: MapManager) {}

  isInRange(attacker: Character, target: Character): boolean {
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (!weapon) return false;

    const distance = this.calculateDistance(attacker, target);
    const range = this.getWeaponRange(weapon);

    return distance >= range.min && distance <= range.max;
  }

  getTargetsInRange(attacker: Character, potentialTargets: Character[]): Character[] {
    return potentialTargets.filter((target) => this.isInRange(attacker, target));
  }

  getNearestTarget(attacker: Character, targets: Character[]): Character | null {
    if (targets.length === 0) return null;

    let nearestTarget: Character | null = null;
    let minDistance = Infinity;

    for (const target of targets) {
      const distance = this.calculateDistance(attacker, target);
      if (distance < minDistance) {
        minDistance = distance;
        nearestTarget = target;
      }
    }

    return nearestTarget;
  }

  getWeaponRange(weapon: IWeapon): WeaponRange {
    const weaponType = this.getWeaponType(weapon);
    return RangeCalculator.WEAPON_RANGES[weaponType] || { min: 1, max: 1 };
  }

  private calculateDistance(char1: Character, char2: Character): number {
    const pos1 = this.mapManager.pixelToGrid(char1.x, char1.y);
    const pos2 = this.mapManager.pixelToGrid(char2.x, char2.y);

    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  private getWeaponType(weapon: IWeapon): string {
    if (weapon.weaponType === WeaponType.SWORD) {
      return 'sword';
    } else if (weapon.weaponType === WeaponType.PROJECTILE) {
      return 'shuriken';
    }
    return 'unknown';
  }

  calculateGridDistance(pos1: GridPosition, pos2: GridPosition): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }
}
