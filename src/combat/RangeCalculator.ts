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
    shuriken: { min: 1, max: 6 },
  };

  constructor(private mapManager: MapManager) {}

  isInRange(attacker: Character, target: Character): boolean {
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (!weapon) {
      console.log(`[RangeCalculator] ${attacker.getName()} has no weapon`);
      return false;
    }

    const distance = this.calculateDistance(attacker, target);
    const range = this.getWeaponRange(weapon);
    const inRange = distance >= range.min && distance <= range.max;
    return inRange;
  }

  getTargetsInRange(attacker: Character, potentialTargets: Character[]): Character[] {
    return potentialTargets.filter((target) => this.isInRange(attacker, target));
  }

  getNearestTarget(attacker: Character, targets: Character[]): Character | null {
    if (targets.length === 0) return null;

    // 各ターゲットまでの距離を計算
    const targetDistances = targets.map((target) => ({
      target,
      distance: this.calculateDistance(attacker, target),
    }));

    // 最小距離を見つける
    const minDistance = Math.min(...targetDistances.map((td) => td.distance));

    // 最小距離のターゲットをすべて取得
    const nearestTargets = targetDistances
      .filter((td) => td.distance === minDistance)
      .map((td) => td.target);

    // 同距離の場合はランダムに選択
    if (nearestTargets.length === 1) {
      return nearestTargets[0];
    } else {
      const randomIndex = Math.floor(Math.random() * nearestTargets.length);
      return nearestTargets[randomIndex];
    }
  }

  sortByDistance(attacker: Character, targets: Character[]): Character[] {
    // 各ターゲットまでの距離を計算してソート
    const targetDistances = targets.map((target) => ({
      target,
      distance: this.calculateDistance(attacker, target),
    }));

    // 距離順にソート（昇順）
    targetDistances.sort((a, b) => a.distance - b.distance);

    return targetDistances.map((td) => td.target);
  }

  getWeaponRange(weapon: IWeapon): WeaponRange {
    const weaponType = this.getWeaponType(weapon);
    return RangeCalculator.WEAPON_RANGES[weaponType] || { min: 1, max: 1 };
  }

  private calculateDistance(char1: Character, char2: Character): number {
    let x1: number, y1: number, x2: number, y2: number;
    
    // ワールド座標を取得（本番環境）
    if (typeof char1.getWorldTransformMatrix === 'function') {
      const worldPos1 = char1.getWorldTransformMatrix();
      const worldPos2 = char2.getWorldTransformMatrix();
      x1 = worldPos1.tx;
      y1 = worldPos1.ty;
      x2 = worldPos2.tx;
      y2 = worldPos2.ty;
    } else {
      // テスト環境では通常の座標を使用
      x1 = char1.x;
      y1 = char1.y;
      x2 = char2.x;
      y2 = char2.y;
    }
    
    const pos1 = this.mapManager.pixelToGrid(x1, y1);
    const pos2 = this.mapManager.pixelToGrid(x2, y2);
    
    const distance = Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    return distance;
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
