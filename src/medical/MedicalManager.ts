import { Army } from '../army/Army';
import { Base } from '../base/Base';
import { ArmyManager } from '../army/ArmyManager';

interface TreatmentInfo {
  armyId: string;
  baseId: string;
  startTime: number;
  cost: number;
}

/**
 * 医療施設の治療システムを管理するマネージャー
 */
export class MedicalManager {
  private static readonly TREATMENT_DURATION = 120; // 2分（秒）
  private static readonly TREATMENT_COST = 500; // 治療費用（両）

  private scene: Phaser.Scene;
  private treatments: Map<string, TreatmentInfo> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 治療費用を取得
   */
  public static getTreatmentCost(): number {
    return MedicalManager.TREATMENT_COST;
  }

  /**
   * 軍団の治療を開始
   */
  public startTreatment(army: Army, base: Base, money: number): boolean {
    const armyId = army.getId();

    // すでに治療中の場合
    if (this.treatments.has(armyId)) {
      return false;
    }

    // 資金不足チェック
    if (money < MedicalManager.TREATMENT_COST) {
      return false;
    }

    // 治療開始
    this.treatments.set(armyId, {
      armyId,
      baseId: base.getId(),
      startTime: this.scene.time.now,
      cost: MedicalManager.TREATMENT_COST,
    });

    return true;
  }

  /**
   * 軍団が治療中かどうか
   */
  public isInTreatment(armyId: string): boolean {
    return this.treatments.has(armyId);
  }

  /**
   * 治療の残り時間を取得（秒）
   */
  public getRemainingTime(armyId: string): number {
    const treatment = this.treatments.get(armyId);
    if (!treatment) {
      return 0;
    }

    const elapsed = (this.scene.time.now - treatment.startTime) / 1000;
    const remaining = MedicalManager.TREATMENT_DURATION - elapsed;
    return Math.max(0, Math.ceil(remaining));
  }

  /**
   * 治療が完了したかチェック
   */
  public isCompleted(armyId: string): boolean {
    return this.getRemainingTime(armyId) === 0;
  }

  /**
   * 治療を完了
   */
  public completeTreatment(army: Army): void {
    const armyId = army.getId();
    if (!this.treatments.has(armyId)) {
      return;
    }

    // 軍団のHPを全回復
    const members = army.getAllMembers();
    members.forEach((member) => {
      member.heal(member.getMaxHP());
    });

    // 治療情報を削除
    this.treatments.delete(armyId);
  }

  /**
   * 特定の拠点で治療中の軍団リストを取得
   */
  public getTreatmentsByBase(baseId: string): TreatmentInfo[] {
    return Array.from(this.treatments.values()).filter((treatment) => treatment.baseId === baseId);
  }

  /**
   * 更新処理（完了した治療を自動的に処理）
   */
  public update(armyManager: ArmyManager): void {
    this.treatments.forEach((treatment) => {
      if (this.isCompleted(treatment.armyId)) {
        const army = armyManager.getArmyById(treatment.armyId);
        if (army) {
          this.completeTreatment(army);
        }
      }
    });
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    this.treatments.clear();
  }
}
