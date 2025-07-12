import { Position } from "./CharacterTypes";

// 移動モード
export enum MovementMode {
  NORMAL = "normal", // 通常移動（100%速度、攻撃不可）
  COMBAT = "combat", // 戦闘移動（60%速度、攻撃可能）
  STANDBY = "standby", // 待機（0%速度、攻撃可能、視界+1）
}

// 移動モードの設定
export interface MovementModeConfig {
  speedMultiplier: number; // 速度倍率
  canAttack: boolean; // 攻撃可能か
  sightBonus: number; // 視界ボーナス
}

// 移動モード設定の定義
export const MOVEMENT_MODE_CONFIGS: Record<MovementMode, MovementModeConfig> = {
  [MovementMode.NORMAL]: {
    speedMultiplier: 1.0,
    canAttack: false,
    sightBonus: 0,
  },
  [MovementMode.COMBAT]: {
    speedMultiplier: 0.6,
    canAttack: true,
    sightBonus: 0,
  },
  [MovementMode.STANDBY]: {
    speedMultiplier: 0,
    canAttack: true,
    sightBonus: 1,
  },
};

// 移動経路
export interface MovementPath {
  waypoints: Position[]; // 経路点（最大4地点）
  currentIndex: number; // 現在の目標地点インデックス
}

// 移動コマンド
export interface MovementCommand {
  armyId: string;
  mode: MovementMode;
  path: MovementPath;
  startTime: number;
}

// 移動状態
export interface MovementState {
  isMoving: boolean;
  currentPath: MovementPath | null;
  currentSpeed: number; // 現在の移動速度（ピクセル/秒）
  mode: MovementMode;
  targetPosition: Position | null;
}

// 移動計算結果
export interface MovementCalculation {
  armySpeed: number; // 軍団平均速度
  modeMultiplier: number; // モード倍率
  terrainCost: number; // 地形コスト
  timePerTile: number; // 1マスあたりの移動時間（秒）
  pixelsPerSecond: number; // ピクセル/秒の移動速度
}

// 移動制約
export const MOVEMENT_CONSTRAINTS = {
  maxWaypoints: 4, // 最大経路点数
  baseTimePerTile: 40, // 基本移動時間定数
  tileSize: 16, // タイルサイズ（ピクセル）
} as const;
