import * as Phaser from 'phaser';
import { Army } from '../army/Army';
import { ArmyManager } from '../army/ArmyManager';
import { VisionSystem } from '../vision/VisionSystem';
import { UIManager } from '../ui/UIManager';
import { Base } from '../base/Base';
import { BaseManager } from '../base/BaseManager';
import { SimpleAttackTarget } from '../types/CombatTypes';

export class AttackTargetInputHandler {
  private scene: Phaser.Scene;
  private armyManager: ArmyManager;
  private baseManager: BaseManager;
  private visionSystem: VisionSystem;
  private attackingArmy: Army;
  private onTargetSelected: (target: SimpleAttackTarget) => void;
  private onCancel: () => void;
  private isActive: boolean = false;
  private targetMarker: Phaser.GameObjects.Graphics | null = null;
  private uiManager: UIManager | null = null;

  constructor(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    baseManager: BaseManager,
    visionSystem: VisionSystem,
    attackingArmy: Army,
    onTargetSelected: (target: SimpleAttackTarget) => void,
    onCancel: () => void,
    uiManager?: UIManager,
  ) {
    this.scene = scene;
    this.armyManager = armyManager;
    this.baseManager = baseManager;
    this.visionSystem = visionSystem;
    this.attackingArmy = attackingArmy;
    this.onTargetSelected = onTargetSelected;
    this.onCancel = onCancel;
    this.uiManager = uiManager || null;

    this.setupInputHandlers();
    this.showSelectableTargets();
    this.isActive = true;

    // ガイドメッセージはMovementInputHandlerで既に表示されているため、ここでは表示しない
  }

  private setupInputHandlers(): void {
    // 左クリック: 敵軍団選択
    this.scene.input.on('pointerdown', this.handlePointerDown, this);

    // マウスムーブ: ホバー効果
    this.scene.input.on('pointermove', this.handlePointerMove, this);
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    console.log('AttackTargetInputHandler: handlePointerDown, isActive=', this.isActive);
    if (!this.isActive) return;

    if (pointer.leftButtonDown()) {
      const target = this.findTargetAtPosition(pointer.worldX, pointer.worldY);
      console.log('AttackTargetInputHandler: クリックした位置のターゲット=', target);
      if (target) {
        console.log('AttackTargetInputHandler: ターゲットを選択:', target.getName());
        this.selectTarget(target);
      } else {
        // 攻撃対象以外をクリックしたらキャンセル
        console.log('AttackTargetInputHandler: 攻撃対象以外をクリックしたのでキャンセル');
        this.cancel();
      }
    } else if (pointer.rightButtonDown()) {
      // 右クリックでキャンセル
      console.log('AttackTargetInputHandler: 右クリックでキャンセル');
      this.cancel();
    }
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isActive) return;

    const target = this.findTargetAtPosition(pointer.worldX, pointer.worldY);
    if (target) {
      this.showTargetHover(target);
      this.scene.input.setDefaultCursor('pointer');
    } else {
      this.hideTargetHover();
      this.scene.input.setDefaultCursor('default');
    }
  };

  private findEnemyAtPosition(x: number, y: number): Army | null {
    // 発見済みの敵軍団から選択可能なものを探す
    const playerArmies = this.armyManager.getActiveArmies().filter((a) => a.isPlayerArmy());
    const enemyArmies = this.armyManager.getActiveArmies().filter((a) => a.isEnemyArmy());
    const visibleArmies = this.visionSystem.getVisibleEnemyArmies(
      'player',
      playerArmies,
      enemyArmies,
    );

    for (const army of visibleArmies) {
      if (army === this.attackingArmy) continue; // 自分自身は除外

      const commander = army.getCommander();
      const commanderBounds = commander.getBounds();

      if (commanderBounds.contains(x, y)) {
        return army;
      }
    }

    return null;
  }

  private findBaseAtPosition(x: number, y: number): Base | null {
    // 敵拠点と中立拠点を探す
    const allBases = this.baseManager.getAllBases();

    for (const base of allBases) {
      const owner = base.getOwner();
      // 味方拠点は攻撃対象外
      if (owner === 'player') continue;

      // 拠点の位置を確認（拠点は2x2タイル）
      const basePos = base.getPosition();
      const tileSize = 16;
      const baseWorldX = basePos.x * tileSize;
      const baseWorldY = basePos.y * tileSize;

      // 2x2タイルの範囲内かチェック
      if (x >= baseWorldX && x < baseWorldX + 32 && y >= baseWorldY && y < baseWorldY + 32) {
        return base;
      }
    }

    return null;
  }

  private findTargetAtPosition(x: number, y: number): SimpleAttackTarget {
    // まず敵軍団を探す
    const enemy = this.findEnemyAtPosition(x, y);
    if (enemy) return enemy;

    // 次に拠点を探す
    const base = this.findBaseAtPosition(x, y);
    if (base) return base;

    return null;
  }

  private showSelectableTargets(): void {
    // 発見済みの敵軍団をハイライト表示
    const playerArmies = this.armyManager.getActiveArmies().filter((a) => a.isPlayerArmy());
    const enemyArmies = this.armyManager.getActiveArmies().filter((a) => a.isEnemyArmy());
    const visibleArmies = this.visionSystem.getVisibleEnemyArmies(
      'player',
      playerArmies,
      enemyArmies,
    );

    for (const army of visibleArmies) {
      if (army === this.attackingArmy) continue;

      // 敵軍団に選択可能を示すエフェクトを追加
      const commander = army.getCommander();
      commander.setTint(0xff9999); // 薄い赤でハイライト
    }
  }

  private hideSelectableTargets(): void {
    // 全ての敵軍団のハイライトを解除
    const playerArmies = this.armyManager.getActiveArmies().filter((a) => a.isPlayerArmy());
    const enemyArmies = this.armyManager.getActiveArmies().filter((a) => a.isEnemyArmy());
    const visibleArmies = this.visionSystem.getVisibleEnemyArmies(
      'player',
      playerArmies,
      enemyArmies,
    );

    for (const army of visibleArmies) {
      const commander = army.getCommander();
      commander.clearTint();
    }
  }

  private showTargetHover(target: SimpleAttackTarget): void {
    if (!target) return;

    if (!this.targetMarker) {
      this.targetMarker = this.scene.add.graphics();
      this.targetMarker.setDepth(100);
    }

    this.targetMarker.clear();

    let x: number, y: number;

    // 軍団の場合
    if ('getCommander' in target) {
      const commander = target.getCommander();
      x = commander.x;
      y = commander.y;
    }
    // 拠点の場合
    else if ('getPosition' in target) {
      const pos = target.getPosition();
      // 拠点の中心位置（2x2タイルの中心）
      x = (pos.x + 1) * 16;
      y = (pos.y + 1) * 16;
    } else {
      return;
    }

    // 十字の照準を描画
    this.targetMarker.lineStyle(2, 0xff0000, 1);
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(x - 20, y);
    this.targetMarker.lineTo(x - 10, y);
    this.targetMarker.moveTo(x + 10, y);
    this.targetMarker.lineTo(x + 20, y);
    this.targetMarker.moveTo(x, y - 20);
    this.targetMarker.lineTo(x, y - 10);
    this.targetMarker.moveTo(x, y + 10);
    this.targetMarker.lineTo(x, y + 20);
    this.targetMarker.strokePath();

    // 円を描画
    this.targetMarker.strokeCircle(x, y, 25);
  }

  private hideTargetHover(): void {
    if (this.targetMarker) {
      this.targetMarker.clear();
    }
  }

  private selectTarget(target: SimpleAttackTarget): void {
    this.isActive = false;

    // 一時的に「攻撃目標を指定しました」を表示
    if (this.uiManager) {
      this.uiManager.showGuideMessage('攻撃目標を指定しました');
      // 2秒後に非表示
      this.scene.time.delayedCall(2000, () => {
        if (this.uiManager) {
          this.uiManager.hideGuideMessage();
        }
      });
    }

    this.cleanup();
    this.onTargetSelected(target);
  }

  private cancel(): void {
    this.isActive = false;

    // ガイドメッセージを非表示
    if (this.uiManager) {
      this.uiManager.hideGuideMessage();
    }

    this.cleanup();
    this.onCancel();
  }

  private cleanup(): void {
    // イベントハンドラーを削除
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);

    // カーソルをデフォルトに戻す
    this.scene.input.setDefaultCursor('default');

    // ハイライトを解除
    this.hideSelectableTargets();
    this.hideTargetHover();

    // マーカーを削除
    if (this.targetMarker) {
      this.targetMarker.destroy();
      this.targetMarker = null;
    }
  }

  public destroy(): void {
    this.cleanup();
  }
}
