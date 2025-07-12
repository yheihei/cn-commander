import * as Phaser from "phaser";
import { ArmyManager } from "../army/ArmyManager";
import { MapManager } from "../map/MapManager";
import { MovementCommandSystem } from "./MovementCommand";
import { MovementMode } from "../types/MovementTypes";

export class MovementManager {
  private armyManager: ArmyManager;
  private commandSystem: MovementCommandSystem;

  constructor(
    _scene: Phaser.Scene,
    armyManager: ArmyManager,
    _mapManager: MapManager,
    commandSystem: MovementCommandSystem
  ) {
    this.armyManager = armyManager;
    this.commandSystem = commandSystem;
  }

  public update(_time: number, _delta: number): void {
    // 全ての軍団の移動を処理
    const armies = this.armyManager.getActiveArmies();
    
    for (const army of armies) {
      const command = this.commandSystem.getCommand(army.getId());
      
      if (command) {
        // 現在の目標地点を取得
        const currentTarget = this.commandSystem.getCurrentTarget(army.getId());
        
        if (currentTarget) {
          // 軍団の現在位置
          const armyPos = army.getPosition();
          
          // 目標地点への距離を計算
          const dx = currentTarget.x - armyPos.x;
          const dy = currentTarget.y - armyPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 到達判定の閾値（ピクセル単位）
          const arrivalThreshold = 5;
          
          if (distance <= arrivalThreshold) {
            // 現在の経路点に到達した
            const hasNextWaypoint = this.commandSystem.advanceToNextWaypoint(army.getId());
            
            if (hasNextWaypoint) {
              // 次の経路点へ移動開始
              const nextTarget = this.commandSystem.getCurrentTarget(army.getId());
              if (nextTarget) {
                army.startMovement(nextTarget, command.mode);
              }
            } else {
              // 全ての経路点を通過した - 移動完了
              army.stopMovement();
              army.setMovementMode(MovementMode.STANDBY);
            }
          }
          // 距離がまだある場合は、Army.update()で移動処理が行われる
        }
      }
    }
  }


  public destroy(): void {
    // クリーンアップ処理
  }
}