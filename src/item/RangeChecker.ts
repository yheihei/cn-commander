import { IRangeChecker, IWeapon, Position } from '../types/ItemTypes';

export class RangeChecker implements IRangeChecker {
  isInRange(attackerPos: Position, targetPos: Position, weapon: IWeapon): boolean {
    const distance = this.calculateDistance(attackerPos, targetPos);
    return distance >= weapon.minRange && distance <= weapon.maxRange;
  }

  getAttackablePositions(attackerPos: Position, weapon: IWeapon): Position[] {
    const positions: Position[] = [];

    for (let x = attackerPos.x - weapon.maxRange; x <= attackerPos.x + weapon.maxRange; x++) {
      for (let y = attackerPos.y - weapon.maxRange; y <= attackerPos.y + weapon.maxRange; y++) {
        const targetPos = { x, y };
        if (this.isInRange(attackerPos, targetPos, weapon)) {
          positions.push(targetPos);
        }
      }
    }

    return positions;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return Math.max(dx, dy);
  }
}
