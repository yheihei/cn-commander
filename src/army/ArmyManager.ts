import * as Phaser from 'phaser';
import { Army } from './Army';
import { Character } from '../character/Character';
import { ARMY_CONSTRAINTS, FactionType } from '../types/ArmyTypes';
import { ArmyFormationData } from '../types/ArmyFormationTypes';
import { Base } from '../base/Base';

export class ArmyManager {
  private armies: Map<string, Army> = new Map();
  private scene: Phaser.Scene;
  private nextArmyId: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * グリッド座標に軍団を作成（指定グリッドの中心に配置）
   * @param commander 指揮官
   * @param gridX グリッドX座標
   * @param gridY グリッドY座標
   * @param owner 軍団の所属
   */
  createArmyAtGrid(
    commander: Character,
    gridX: number,
    gridY: number,
    owner: FactionType = 'neutral',
  ): Army | null {
    // 指定グリッドの中心に配置
    const tileSize = 16;
    const pixelX = gridX * tileSize + tileSize / 2; // グリッドの中心
    const pixelY = gridY * tileSize + tileSize / 2;
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

  /**
   * 拠点から軍団を出撃させる
   */
  createArmyFromBase(formationData: ArmyFormationData, base: Base): Army | null {
    if (this.armies.size >= ARMY_CONSTRAINTS.maxArmies) {
      console.warn(`Cannot create more than ${ARMY_CONSTRAINTS.maxArmies} armies`);
      return null;
    }

    // 出撃位置が有効かチェック
    if (!this.validateDeployPosition(formationData.deployPosition, base)) {
      console.warn('Invalid deploy position');
      return null;
    }

    // ピクセル座標に変換
    const tileSize = 16;
    const pixelX = formationData.deployPosition.x * tileSize + tileSize / 2;
    const pixelY = formationData.deployPosition.y * tileSize + tileSize / 2;

    // 軍団を作成
    const armyId = `army_${this.nextArmyId++}`;
    const army = new Army(this.scene, pixelX, pixelY, {
      id: armyId,
      name: `${formationData.commander.getName()}の軍団`,
      commander: formationData.commander,
      soldiers: formationData.soldiers,
      owner: base.getOwner() as FactionType,
    });

    // アイテムを配布
    formationData.items.forEach((items, character) => {
      const itemHolder = character.getItemHolder();
      if (itemHolder) {
        items.forEach((item) => {
          itemHolder.addItem(item);
        });
        itemHolder.autoEquipBestWeapon();
      }
    });

    this.armies.set(armyId, army);
    return army;
  }

  /**
   * 出撃位置が有効かチェック
   */
  validateDeployPosition(position: { x: number; y: number }, base: Base): boolean {
    const basePos = base.getPosition();

    // 拠点から2マス以内かチェック
    const dx = Math.abs(position.x - (basePos.x + 1)); // 拠点の中心座標
    const dy = Math.abs(position.y - (basePos.y + 1));

    if (dx > 2 || dy > 2) {
      return false;
    }

    // MapManagerがある場合は障害物チェック
    const mapManager = (this.scene as any).mapManager;
    if (mapManager && mapManager.getTileAt) {
      const tile = mapManager.getTileAt(position.x, position.y);
      if (tile && tile.isWalkable && !tile.isWalkable()) {
        return false;
      }
    }

    // 他の軍団との重複チェック
    const armyAtPosition = this.getArmyAtTile(position.x, position.y);
    if (armyAtPosition) {
      return false;
    }

    return true;
  }

  /**
   * 拠点周囲の有効な出撃位置を取得
   */
  getValidDeployPositions(base: Base): Array<{ x: number; y: number }> {
    const basePos = base.getPosition();
    const positions: Array<{ x: number; y: number }> = [];

    // 拠点を中心とした5x5の範囲をチェック（拠点から2マス以内）
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        // 拠点自体の位置は除外（2x2タイル）
        if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) {
          continue;
        }

        const x = basePos.x + 1 + dx; // 拠点の中心座標
        const y = basePos.y + 1 + dy;
        const position = { x, y };

        if (this.validateDeployPosition(position, base)) {
          positions.push(position);
        }
      }
    }

    return positions;
  }

  /**
   * 指定タイル座標の軍団を取得
   */
  private getArmyAtTile(tileX: number, tileY: number): Army | null {
    const tileSize = 16;
    const pixelX = tileX * tileSize + tileSize / 2;
    const pixelY = tileY * tileSize + tileSize / 2;

    for (const army of this.armies.values()) {
      const distance = Phaser.Math.Distance.Between(army.x, army.y, pixelX, pixelY);
      if (distance < tileSize) {
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
