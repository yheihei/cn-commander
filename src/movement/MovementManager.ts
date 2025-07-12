import { ArmyManager } from "../army/ArmyManager";
import { MapManager } from "../map/MapManager";
import { MovementCommandSystem } from "./MovementCommand";
import { MovementProcessor } from "./MovementProcessor";
import { MovementInputHandler } from "../input/MovementInputHandler";

export class MovementManager {
  private armyManager: ArmyManager;
  private mapManager: MapManager;
  private commandSystem: MovementCommandSystem;
  private processor: MovementProcessor;
  private inputHandler: MovementInputHandler;

  constructor(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    mapManager: MapManager,
  ) {
    this.armyManager = armyManager;
    this.mapManager = mapManager;

    // サブシステムの初期化
    this.commandSystem = new MovementCommandSystem();
    this.processor = new MovementProcessor(this.commandSystem);
    this.inputHandler = new MovementInputHandler(
      scene,
      armyManager,
      mapManager,
      this.commandSystem,
    );
  }

  /**
   * 移動システムの更新
   */
  public update(_time: number, delta: number): void {
    // 全ての軍団の移動を更新
    const armies = this.armyManager.getActiveArmies();

    for (const army of armies) {
      this.processor.updateMovement(army, delta, this.mapManager);
    }
  }

  /**
   * 移動コマンドシステムを取得
   */
  public getCommandSystem(): MovementCommandSystem {
    return this.commandSystem;
  }

  /**
   * 移動プロセッサを取得
   */
  public getProcessor(): MovementProcessor {
    return this.processor;
  }

  /**
   * 入力ハンドラーを取得
   */
  public getInputHandler(): MovementInputHandler {
    return this.inputHandler;
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.commandSystem.clearAllCommands();
    this.inputHandler.destroy();
  }
}
