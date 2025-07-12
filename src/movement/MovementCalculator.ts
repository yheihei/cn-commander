import { Army } from "../army/Army";
import { TileType, TERRAIN_EFFECTS } from "../types/TileTypes";
import {
  MovementMode,
  MOVEMENT_MODE_CONFIGS,
  MovementCalculation,
  MOVEMENT_CONSTRAINTS,
} from "../types/MovementTypes";

export class MovementCalculator {
  /**
   * 軍団の平均移動速度を計算
   */
  public calculateArmySpeed(army: Army): number {
    const aliveMembers = army.getAliveMembers();
    if (aliveMembers.length === 0) return 0;

    const totalSpeed = aliveMembers.reduce((sum, member) => {
      return sum + member.getStats().moveSpeed;
    }, 0);

    return totalSpeed / aliveMembers.length;
  }

  /**
   * 実際の移動時間を計算（秒/マス）
   * 計算式: (40 / 軍団移動速度) × (1 / モード補正) × 地形コスト
   */
  public calculateMovementTime(
    army: Army,
    mode: MovementMode,
    terrainType: TileType,
  ): number {
    const armySpeed = this.calculateArmySpeed(army);
    if (armySpeed === 0) return Infinity;

    const modeConfig = MOVEMENT_MODE_CONFIGS[mode];
    const terrainEffect = TERRAIN_EFFECTS[terrainType];

    // モード補正が0の場合（待機モード）は移動しない
    if (modeConfig.speedMultiplier === 0) return Infinity;

    const timePerTile =
      (MOVEMENT_CONSTRAINTS.baseTimePerTile / armySpeed) *
      (1 / modeConfig.speedMultiplier) *
      terrainEffect.movementCost;

    return timePerTile;
  }

  /**
   * ピクセル単位の移動速度を計算（ピクセル/秒）
   */
  public calculatePixelSpeed(
    army: Army,
    mode: MovementMode,
    terrainType: TileType,
  ): number {
    const timePerTile = this.calculateMovementTime(army, mode, terrainType);
    if (timePerTile === Infinity) return 0;

    // 1マスのピクセル数 / 1マスあたりの移動時間
    return MOVEMENT_CONSTRAINTS.tileSize / timePerTile;
  }

  /**
   * 移動計算の詳細情報を取得
   */
  public getMovementCalculation(
    army: Army,
    mode: MovementMode,
    terrainType: TileType,
  ): MovementCalculation {
    const armySpeed = this.calculateArmySpeed(army);
    const modeConfig = MOVEMENT_MODE_CONFIGS[mode];
    const terrainEffect = TERRAIN_EFFECTS[terrainType];
    const timePerTile = this.calculateMovementTime(army, mode, terrainType);
    const pixelsPerSecond = this.calculatePixelSpeed(army, mode, terrainType);

    return {
      armySpeed,
      modeMultiplier: modeConfig.speedMultiplier,
      terrainCost: terrainEffect.movementCost,
      timePerTile,
      pixelsPerSecond,
    };
  }

  /**
   * 2点間の距離を計算（ピクセル単位）
   */
  public calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 方向ベクトルを正規化
   */
  public normalizeDirection(dx: number, dy: number): { x: number; y: number } {
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude === 0) return { x: 0, y: 0 };

    return {
      x: dx / magnitude,
      y: dy / magnitude,
    };
  }
}
