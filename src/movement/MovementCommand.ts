import { Army } from "../army/Army";
import { Position } from "../types/CharacterTypes";
import {
  MovementMode,
  MovementCommand,
  MOVEMENT_CONSTRAINTS,
} from "../types/MovementTypes";

export class MovementCommandSystem {
  private commands: Map<string, MovementCommand> = new Map();

  /**
   * 軍団に移動経路を設定
   */
  public setPath(army: Army, waypoints: Position[], mode: MovementMode): void {
    if (waypoints.length === 0) {
      this.cancelMovement(army.getId());
      return;
    }

    // 経路点数の制限
    const limitedWaypoints = waypoints.slice(
      0,
      MOVEMENT_CONSTRAINTS.maxWaypoints,
    );

    const command: MovementCommand = {
      armyId: army.getId(),
      mode: mode,
      path: {
        waypoints: limitedWaypoints,
        currentIndex: 0,
      },
      startTime: Date.now(),
    };

    this.commands.set(army.getId(), command);

    // 軍団の移動状態を更新
    army.startMovement(limitedWaypoints[0], mode);
  }

  /**
   * 軍団の現在の移動コマンドを取得
   */
  public getCommand(armyId: string): MovementCommand | null {
    return this.commands.get(armyId) || null;
  }

  /**
   * 軍団の移動をキャンセル
   */
  public cancelMovement(armyId: string): void {
    this.commands.delete(armyId);
  }

  /**
   * 次の経路点に進む
   */
  public advanceToNextWaypoint(armyId: string): boolean {
    const command = this.commands.get(armyId);
    if (!command) return false;

    command.path.currentIndex++;

    // 全ての経路点を通過した場合
    if (command.path.currentIndex >= command.path.waypoints.length) {
      this.cancelMovement(armyId);
      return false;
    }

    return true;
  }

  /**
   * 現在の目標地点を取得
   */
  public getCurrentTarget(armyId: string): Position | null {
    const command = this.commands.get(armyId);
    if (!command) return null;

    const { waypoints, currentIndex } = command.path;
    if (currentIndex >= waypoints.length) return null;

    return waypoints[currentIndex];
  }

  /**
   * 移動モードを変更
   */
  public changeMode(armyId: string, newMode: MovementMode): void {
    const command = this.commands.get(armyId);
    if (command) {
      command.mode = newMode;
    }
  }

  /**
   * 全ての移動コマンドをクリア
   */
  public clearAllCommands(): void {
    this.commands.clear();
  }

  /**
   * アクティブな移動コマンドの数を取得
   */
  public getActiveCommandCount(): number {
    return this.commands.size;
  }

  /**
   * 軍団が移動中かどうかを確認
   */
  public isMoving(armyId: string): boolean {
    return this.commands.has(armyId);
  }
}
