import { Army } from './Army';
import { Character } from '../character/Character';
import { ARMY_CONSTRAINTS, FactionType } from '../types/ArmyTypes';

export class ArmyManager {
  private armies: Map<string, Army> = new Map();
  private scene: Phaser.Scene;
  private nextArmyId: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * グリッド座標に軍団を作成（2x2グリッドの中心に配置）
   * @param commander 指揮官
   * @param gridX 左上のグリッドX座標
   * @param gridY 左上のグリッドY座標
   * @param owner 軍団の所属
   */
  createArmyAtGrid(
    commander: Character,
    gridX: number,
    gridY: number,
    owner: FactionType = 'neutral',
  ): Army | null {
    // 2x2グリッドの中心に配置
    // 各メンバーがグリッドの中央に来るように調整
    const tileSize = 16;
    const pixelX = gridX * tileSize + tileSize; // グリッドの交点
    const pixelY = gridY * tileSize + tileSize;
    return this.createArmy(commander, pixelX, pixelY, owner);
  }

  createArmy(
    commander: Character,
    x: number = 0,
    y: number = 0,
    owner: FactionType = 'neutral',
  ): Army | null {
    if (this.armies.size >= ARMY_CONSTRAINTS.maxArmies) {
      console.warn(`Cannot create more than ${ARMY_CONSTRAINTS.maxArmies} armies`);
      return null;
    }

    const armyId = `army_${this.nextArmyId++}`;
    const army = new Army(this.scene, x, y, {
      id: armyId,
      name: `${commander.getName()}の軍団`,
      commander,
      owner,
    });

    this.armies.set(armyId, army);
    return army;
  }

  getArmy(armyId: string): Army | undefined {
    return this.armies.get(armyId);
  }

  getActiveArmies(): Army[] {
    return Array.from(this.armies.values()).filter((army) => army.isActive());
  }

  getAllArmies(): Army[] {
    return Array.from(this.armies.values());
  }

  disbandArmy(armyId: string): void {
    const army = this.armies.get(armyId);
    if (army) {
      army.destroy();
      this.armies.delete(armyId);
    }
  }

  update(time: number, delta: number): void {
    this.armies.forEach((army) => {
      army.update(time, delta);

      if (!army.isActive()) {
        this.disbandArmy(army.getId());
      }
    });
  }

  getArmyAt(x: number, y: number, threshold: number = 32): Army | null {
    for (const army of this.armies.values()) {
      const distance = Phaser.Math.Distance.Between(army.x, army.y, x, y);
      if (distance <= threshold) {
        return army;
      }
    }
    return null;
  }

  getEnemyArmies(): Army[] {
    return Array.from(this.armies.values()).filter((army) => army.getOwner() !== 'player');
  }

  getArmyByMember(character: Character): Army | null {
    for (const army of this.armies.values()) {
      const allMembers = [army.getCommander(), ...army.getSoldiers()];
      if (allMembers.includes(character)) {
        return army;
      }
    }
    return null;
  }

  destroy(): void {
    this.armies.forEach((army) => army.destroy());
    this.armies.clear();
  }
}
