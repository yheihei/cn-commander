import { Army } from './Army';
import { ArmyManager } from './ArmyManager';
import { CharacterFactory } from '../character/CharacterFactory';
import { JobType } from '../types/CharacterTypes';

export class ArmyFactory {
  /**
   * グリッド座標にテスト軍団を作成
   */
  static createTestArmyAtGrid(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    gridX: number,
    gridY: number,
    type: 'balanced' | 'speed' | 'defense' | 'stealth' = 'balanced',
  ): Army | null {
    let characters;

    if (type === 'balanced') {
      characters = CharacterFactory.createBalancedArmy(scene, 0, 0);
    } else {
      characters = CharacterFactory.createSpecializedArmy(scene, 0, 0, type);
    }

    const [commander, ...soldiers] = characters;
    const army = armyManager.createArmyAtGrid(commander, gridX, gridY);

    if (army) {
      soldiers.forEach((soldier) => army.addSoldier(soldier));
    }

    return army;
  }

  static createTestArmy(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    x: number,
    y: number,
    type: 'balanced' | 'speed' | 'defense' | 'stealth' = 'balanced',
  ): Army | null {
    let characters;

    if (type === 'balanced') {
      characters = CharacterFactory.createBalancedArmy(scene, x, y);
    } else {
      characters = CharacterFactory.createSpecializedArmy(scene, x, y, type);
    }

    const [commander, ...soldiers] = characters;
    const army = armyManager.createArmy(commander, x, y);

    if (army) {
      soldiers.forEach((soldier) => army.addSoldier(soldier));
    }

    return army;
  }

  static createCustomArmy(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    x: number,
    y: number,
    commanderType: JobType,
    soldierTypes: JobType[],
  ): Army | null {
    const commander = CharacterFactory.createCharacter(
      scene,
      x,
      y,
      commanderType,
      undefined,
      undefined,
      true,
    );
    const army = armyManager.createArmy(commander, x, y);

    if (army) {
      soldierTypes.slice(0, 3).forEach((type) => {
        const soldier = CharacterFactory.createCharacter(scene, x, y, type);
        army.addSoldier(soldier);
      });
    }

    return army;
  }

  /**
   * グリッド座標にプレイヤー軍団を作成
   */
  static createPlayerArmyAtGrid(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    gridX: number,
    gridY: number,
  ): Army | null {
    const commander = CharacterFactory.createCommander(scene, 0, 0, 'wind', '咲耶');
    const army = armyManager.createArmyAtGrid(commander, gridX, gridY);

    if (army) {
      const soldiers = [
        CharacterFactory.createCharacter(scene, 0, 0, 'iron', '鉄忍A'),
        CharacterFactory.createCharacter(scene, 0, 0, 'shadow', '影忍A'),
        CharacterFactory.createCharacter(scene, 0, 0, 'medicine', '薬忍A'),
      ];

      soldiers.forEach((soldier) => army.addSoldier(soldier));
    }

    return army;
  }

  static createPlayerArmy(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    x: number,
    y: number,
  ): Army | null {
    const commander = CharacterFactory.createCommander(scene, x, y, 'wind', '咲耶');
    const army = armyManager.createArmy(commander, x, y);

    if (army) {
      const soldiers = [
        CharacterFactory.createCharacter(scene, x, y, 'iron', '鉄忍A'),
        CharacterFactory.createCharacter(scene, x, y, 'shadow', '影忍A'),
        CharacterFactory.createCharacter(scene, x, y, 'medicine', '薬忍A'),
      ];

      soldiers.forEach((soldier) => army.addSoldier(soldier));
    }

    return army;
  }

  /**
   * グリッド座標に敵軍団を作成
   */
  static createEnemyArmyAtGrid(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    gridX: number,
    gridY: number,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  ): Army | null {
    let commanderType: JobType;
    let soldierTypes: JobType[];

    switch (difficulty) {
      case 'easy':
        commanderType = 'wind';
        soldierTypes = ['wind', 'medicine'];
        break;
      case 'normal':
        commanderType = 'iron';
        soldierTypes = ['iron', 'wind', 'shadow'];
        break;
      case 'hard':
        commanderType = 'shadow';
        soldierTypes = ['iron', 'iron', 'shadow'];
        break;
    }

    const commander = CharacterFactory.createCharacter(
      scene,
      0,
      0,
      commanderType,
      '敵指揮官',
      undefined,
      true,
    );
    const army = armyManager.createArmyAtGrid(commander, gridX, gridY);

    if (army) {
      soldierTypes.forEach((type, index) => {
        const soldier = CharacterFactory.createCharacter(scene, 0, 0, type, `敵兵士${index + 1}`);
        army.addSoldier(soldier);
      });
    }

    return army;
  }

  static createEnemyArmy(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    x: number,
    y: number,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  ): Army | null {
    let commanderType: JobType;
    let soldierTypes: JobType[];

    switch (difficulty) {
      case 'easy':
        commanderType = 'wind';
        soldierTypes = ['wind', 'medicine'];
        break;
      case 'normal':
        commanderType = 'iron';
        soldierTypes = ['iron', 'wind', 'shadow'];
        break;
      case 'hard':
        commanderType = 'shadow';
        soldierTypes = ['iron', 'iron', 'shadow'];
        break;
    }

    const commander = CharacterFactory.createCharacter(
      scene,
      x,
      y,
      commanderType,
      '敵指揮官',
      undefined,
      true,
    );
    const army = armyManager.createArmy(commander, x, y);

    if (army) {
      soldierTypes.forEach((type, index) => {
        const soldier = CharacterFactory.createCharacter(scene, x, y, type, `敵兵士${index + 1}`);
        army.addSoldier(soldier);
      });
    }

    return army;
  }

  static createMultipleArmies(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    positions: Array<{ x: number; y: number }>,
    types: Array<'balanced' | 'speed' | 'defense' | 'stealth'>,
  ): Army[] {
    const armies: Army[] = [];
    const count = Math.min(positions.length, types.length);

    for (let i = 0; i < count; i++) {
      const army = this.createTestArmy(
        scene,
        armyManager,
        positions[i].x,
        positions[i].y,
        types[i],
      );

      if (army) {
        armies.push(army);
      }
    }

    return armies;
  }
}
