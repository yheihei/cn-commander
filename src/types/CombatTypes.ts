/**
 * 戦闘システムの型定義
 */

import { Army } from '../army/Army';
import { Base } from '../base/Base';

/**
 * 攻撃目標の種類
 */
export enum AttackTargetType {
  /** 軍団 */
  ARMY = 'army',
  /** 拠点 */
  BASE = 'base',
}

/**
 * 攻撃目標
 */
export interface AttackTarget {
  /** 目標の種類 */
  type: AttackTargetType;
  /** 実際の目標（軍団または拠点） */
  target: Army | Base;
}

/**
 * 攻撃可能なオブジェクトの共通インターフェース
 */
export interface IAttackable {
  /** 攻撃可能か */
  isAttackable(): boolean;
  /** 生存しているか */
  isAlive(): boolean;
  /** ID取得 */
  getId(): string;
  /** 名前取得 */
  getName(): string;
  /** 位置取得 */
  getPosition(): { x: number; y: number };
}

/**
 * 攻撃目標の型定義（シンプル版）
 * 軍団または拠点を直接扱う
 */
export type SimpleAttackTarget = Army | Base | null;

/**
 * 攻撃目標が軍団かどうかを判定するタイプガード
 */
export function isArmyTarget(target: SimpleAttackTarget): target is Army {
  return target !== null && 'getCommander' in target;
}

/**
 * 攻撃目標が拠点かどうかを判定するタイプガード
 */
export function isBaseTarget(target: SimpleAttackTarget): target is Base {
  return target !== null && 'getIncome' in target;
}
