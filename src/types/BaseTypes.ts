/**
 * 拠点システムの型定義
 */

/**
 * 拠点の種類
 */
export enum BaseType {
  /** 味方本拠地 */
  PLAYER_HQ = 'player_hq',
  /** 敵本拠地 */
  ENEMY_HQ = 'enemy_hq',
  /** 中立拠点 */
  NEUTRAL = 'neutral',
  /** 味方占領拠点 */
  PLAYER_OCCUPIED = 'player_occupied',
  /** 敵占領拠点 */
  ENEMY_OCCUPIED = 'enemy_occupied',
}

/**
 * 施設の種類
 */
export enum FacilityType {
  /** 兵舎 */
  BARRACKS = 'barracks',
  /** 生産工場 */
  FACTORY = 'factory',
  /** 医療施設 */
  MEDICAL = 'medical',
  /** 倉庫 */
  WAREHOUSE = 'warehouse',
}

/**
 * 拠点データ
 */
export interface BaseData {
  /** 拠点ID */
  id: string;
  /** 拠点名 */
  name: string;
  /** 拠点種類 */
  type: BaseType;
  /** 位置（タイル座標） */
  position: { x: number; y: number };
  /** 最大HP */
  maxHp: number;
  /** 現在HP */
  currentHp: number;
  /** 収入（両/分） */
  income: number;
  /** 所有者 */
  owner: 'player' | 'enemy' | 'neutral';
  /** 利用可能施設 */
  facilities: FacilityType[];
}

/**
 * 拠点のビジュアル設定
 */
export interface BaseVisualConfig {
  /** スプライトのテクスチャ名 */
  texture: string;
  /** スプライトのフレーム */
  frame?: string | number;
  /** タイルサイズ（2x2や3x3など） */
  tileSize: { width: number; height: number };
  /** 色調整（所属による色変更用） */
  tint?: number;
}

/**
 * 拠点の戦闘データ
 */
export interface BaseCombatData {
  /** 攻撃されているか */
  isBeingAttacked: boolean;
  /** 最後に攻撃された時刻 */
  lastAttackedTime: number;
  /** 攻撃中の軍団ID */
  attackers: Set<string>;
  /** 防御値 */
  defenseValue: number;
}

/**
 * 攻撃可能なオブジェクトのインターフェース
 */
export interface IAttackableBase {
  /** 攻撃可能か */
  isAttackable(): boolean;
  /** ターゲット指定可能か */
  canBeTargeted(): boolean;
  /** 防御ボーナス取得 */
  getDefenseBonus(): number;
  /** 攻撃を受けた時の処理 */
  onAttacked(attackerId: string): void;
  /** ダメージを受ける */
  takeDamage(amount: number): boolean;
  /** 破壊されているか */
  isDestroyed(): boolean;
  /** HP割合取得 */
  getHpPercentage(): number;
}
