import { Army } from "../army/Army";
import { MapManager } from "../map/MapManager";
import { Position } from "../types/CharacterTypes";
import { TileType } from "../types/TileTypes";
import { MovementCalculator } from "./MovementCalculator";
import { MovementCommandSystem } from "./MovementCommand";

export class MovementProcessor {
  private calculator: MovementCalculator;
  private commandSystem: MovementCommandSystem;

  constructor(commandSystem: MovementCommandSystem) {
    this.calculator = new MovementCalculator();
    this.commandSystem = commandSystem;
  }

  /**
   * 軍団の移動を更新
   */
  public updateMovement(
    army: Army,
    deltaTime: number,
    mapManager: MapManager,
  ): void {
    const command = this.commandSystem.getCommand(army.getId());
    if (!command) {
      army.stopMovement();
      return;
    }

    const target = this.commandSystem.getCurrentTarget(army.getId());
    if (!target) {
      army.stopMovement();
      return;
    }

    // 現在地の地形を取得
    const currentTerrain = this.getCurrentTerrain(army, mapManager);

    // 移動速度を計算
    const pixelSpeed = this.calculator.calculatePixelSpeed(
      army,
      command.mode,
      currentTerrain,
    );

    // 目標地点への移動
    const reached = this.moveTowardsTarget(army, target, pixelSpeed, deltaTime);

    // 目標地点に到達した場合
    if (reached) {
      const hasNext = this.commandSystem.advanceToNextWaypoint(army.getId());
      if (hasNext) {
        const nextTarget = this.commandSystem.getCurrentTarget(army.getId());
        if (nextTarget) {
          army.startMovement(nextTarget, command.mode);
        }
      } else {
        army.stopMovement();
      }
    }
  }

  /**
   * 目標地点への移動処理
   * @returns 到達したらtrue
   */
  public moveTowardsTarget(
    army: Army,
    target: Position,
    speed: number,
    deltaTime: number,
  ): boolean {
    if (speed === 0) return false;

    const currentX = army.x;
    const currentY = army.y;

    const distance = this.calculator.calculateDistance(
      currentX,
      currentY,
      target.x,
      target.y,
    );

    // 1フレームで移動可能な距離
    const moveDistance = speed * (deltaTime / 1000);

    if (distance <= moveDistance) {
      // 目標地点に到達
      army.setPosition(target.x, target.y);
      return true;
    } else {
      // 目標地点へ向かって移動
      const direction = this.calculator.normalizeDirection(
        target.x - currentX,
        target.y - currentY,
      );

      army.x += direction.x * moveDistance;
      army.y += direction.y * moveDistance;
      return false;
    }
  }

  /**
   * 現在地の地形を取得
   */
  public getCurrentTerrain(army: Army, mapManager: MapManager): TileType {
    const gridPos = mapManager.pixelToGrid(army.x, army.y);
    const tile = mapManager.getTileAt(gridPos.x, gridPos.y);

    return tile ? tile.getTileType() : TileType.PLAIN;
  }

  /**
   * 移動可能かどうかを確認
   */
  public canMoveTo(x: number, y: number, mapManager: MapManager): boolean {
    const gridPos = mapManager.pixelToGrid(x, y);

    // マップ範囲外チェック
    if (
      gridPos.x < 0 ||
      gridPos.x >= mapManager.getMapWidth() ||
      gridPos.y < 0 ||
      gridPos.y >= mapManager.getMapHeight()
    ) {
      return false;
    }

    const tile = mapManager.getTileAt(gridPos.x, gridPos.y);
    return tile ? tile.isWalkable() : false;
  }

  /**
   * 経路の妥当性を検証
   */
  public validatePath(waypoints: Position[], mapManager: MapManager): boolean {
    for (const waypoint of waypoints) {
      if (!this.canMoveTo(waypoint.x, waypoint.y, mapManager)) {
        return false;
      }
    }
    return true;
  }
}
