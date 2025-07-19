import * as Phaser from 'phaser';
import { Army } from '../army/Army';
import { ArmyManager } from '../army/ArmyManager';
import { VisionSystem } from '../vision/VisionSystem';
import { UIManager } from '../ui/UIManager';

export class AttackTargetInputHandler {
  private scene: Phaser.Scene;
  private armyManager: ArmyManager;
  private visionSystem: VisionSystem;
  private attackingArmy: Army;
  private onTargetSelected: (target: Army) => void;
  private onCancel: () => void;
  private isActive: boolean = false;
  private targetMarker: Phaser.GameObjects.Graphics | null = null;
  private uiManager: UIManager | null = null;

  constructor(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    visionSystem: VisionSystem,
    attackingArmy: Army,
    onTargetSelected: (target: Army) => void,
    onCancel: () => void,
    uiManager?: UIManager,
  ) {
    this.scene = scene;
    this.armyManager = armyManager;
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
      const enemy = this.findEnemyAtPosition(pointer.worldX, pointer.worldY);
      console.log('AttackTargetInputHandler: クリックした位置の敵=', enemy);
      if (enemy) {
        console.log('AttackTargetInputHandler: 敵を選択:', enemy.getName());
        this.selectTarget(enemy);
      } else {
        // 敵軍団以外をクリックしたらキャンセル
        console.log('AttackTargetInputHandler: 敵以外をクリックしたのでキャンセル');
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

    const enemy = this.findEnemyAtPosition(pointer.worldX, pointer.worldY);
    if (enemy) {
      this.showTargetHover(enemy);
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

  private showTargetHover(enemy: Army): void {
    if (!this.targetMarker) {
      this.targetMarker = this.scene.add.graphics();
      this.targetMarker.setDepth(100);
    }

    this.targetMarker.clear();

    // 敵軍団の指揮官の位置に照準マーカーを描画
    const commander = enemy.getCommander();
    const x = commander.x;
    const y = commander.y;

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

  private selectTarget(target: Army): void {
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
