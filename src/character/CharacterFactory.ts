import { Character } from "./Character";
import {
  CharacterConfig,
  JobType,
  CharacterStats,
} from "../types/CharacterTypes";
import { JobFactory } from "./jobs/JobFactory";

export class CharacterFactory {
  private static nextId: number = 1;

  static createCharacter(
    scene: Phaser.Scene,
    x: number,
    y: number,
    jobType: JobType,
    name?: string,
    customStats?: Partial<CharacterStats>,
    isCommander: boolean = false,
  ): Character {
    const job = JobFactory.createJob(jobType);
    const baseStats = job.getBaseStats();
    const statsWithSkill = job.applyClassSkill(baseStats);

    const finalStats = {
      ...statsWithSkill,
      ...customStats,
    };

    const config: CharacterConfig = {
      id: `char_${this.nextId++}`,
      name: name || `${job.name}${this.nextId}`,
      jobType: jobType,
      stats: finalStats,
      isCommander: isCommander,
    };

    return new Character(scene, x, y, config);
  }

  static createCommander(
    scene: Phaser.Scene,
    x: number,
    y: number,
    jobType: JobType = "wind",
    name: string = "咲耶",
  ): Character {
    const customStats: Partial<CharacterStats> = {
      hp: 80,
      maxHp: 80,
      attack: 35,
      defense: 25,
      speed: 25,
    };

    return this.createCharacter(scene, x, y, jobType, name, customStats, true);
  }

  static createRandomCharacter(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): Character {
    const jobTypes: JobType[] = ["wind", "iron", "shadow", "medicine"];
    const randomJob = jobTypes[Math.floor(Math.random() * jobTypes.length)];

    return this.createCharacter(scene, x, y, randomJob);
  }

  static createBalancedArmy(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): Character[] {
    const commander = this.createCommander(scene, x, y);
    const soldiers = [
      this.createCharacter(scene, x, y, "iron"),
      this.createCharacter(scene, x, y, "shadow"),
      this.createCharacter(scene, x, y, "medicine"),
    ];

    return [commander, ...soldiers];
  }

  static createSpecializedArmy(
    scene: Phaser.Scene,
    x: number,
    y: number,
    specialization: "speed" | "defense" | "stealth",
  ): Character[] {
    let commanderType: JobType;
    let soldierTypes: JobType[];

    switch (specialization) {
      case "speed":
        commanderType = "wind";
        soldierTypes = ["wind", "wind", "shadow"];
        break;
      case "defense":
        commanderType = "iron";
        soldierTypes = ["iron", "iron", "medicine"];
        break;
      case "stealth":
        commanderType = "shadow";
        soldierTypes = ["shadow", "shadow", "wind"];
        break;
    }

    const commander = this.createCharacter(
      scene,
      x,
      y,
      commanderType,
      undefined,
      undefined,
      true,
    );
    const soldiers = soldierTypes.map((type) =>
      this.createCharacter(scene, x, y, type),
    );

    return [commander, ...soldiers];
  }
}
