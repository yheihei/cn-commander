import * as Phaser from 'phaser';
import { ActionMenu } from './ActionMenu';
import { MovementModeMenu } from './MovementModeMenu';
import { ArmyInfoPanel } from './ArmyInfoPanel';
import { Army } from '../army/Army';

export class UIManager {
  private scene: Phaser.Scene;
  private actionMenu: ActionMenu | null = null;
  private movementModeMenu: MovementModeMenu | null = null;
  private armyInfoPanel: ArmyInfoPanel | null = null;
  private currentSelectedArmy: Army | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeInfoPanel();
  }

  private initializeInfoPanel(): void {
    // 画面右側に情報パネルを配置
    const panelWidth = 250;
    const panelHeight = 400;
    const panelX = this.scene.cameras.main.width - panelWidth - 10;
    const panelY = 10;

    this.armyInfoPanel = new ArmyInfoPanel({
      scene: this.scene,
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    });
  }

  public showActionMenu(army: Army, onMove: () => void, onCancel: () => void): void {
    // 既存のメニューがあれば削除
    this.hideActionMenu();

    // 指揮官の位置を取得
    const commander = army.getCommander();
    const commanderPos = commander.getCenter();

    // メニューを指揮官の右側に表示
    const menuX = commanderPos.x + 50;
    const menuY = commanderPos.y;

    this.currentSelectedArmy = army;

    // 軍団情報パネルを表示
    this.showArmyInfo(army);

    this.actionMenu = new ActionMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onMove: () => {
        onMove();
        this.actionMenu = null;
        // onMoveの時は軍団選択状態を維持（移動モード選択に進むため）
      },
      onCancel: () => {
        onCancel();
        this.actionMenu = null;
        this.currentSelectedArmy = null;
        // キャンセル時は情報パネルも非表示
        this.hideArmyInfo();
      },
    });
  }

  public showMovementModeMenu(
    army: Army,
    onNormalMove: () => void,
    onCombatMove: () => void,
    onCancel: () => void,
  ): void {
    // 既存のメニューがあれば削除
    this.hideMovementModeMenu();

    // 指揮官の位置を取得
    const commander = army.getCommander();
    const commanderPos = commander.getCenter();

    // メニューを指揮官の右側に表示
    const menuX = commanderPos.x + 50;
    const menuY = commanderPos.y;

    this.movementModeMenu = new MovementModeMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onNormalMove: () => {
        onNormalMove();
        this.movementModeMenu = null;
      },
      onCombatMove: () => {
        onCombatMove();
        this.movementModeMenu = null;
      },
      onCancel: () => {
        onCancel();
        this.movementModeMenu = null;
      },
    });
  }

  public hideActionMenu(): void {
    if (this.actionMenu) {
      this.actionMenu.destroy();
      this.actionMenu = null;
    }
    this.currentSelectedArmy = null;
  }

  public hideMovementModeMenu(): void {
    if (this.movementModeMenu) {
      this.movementModeMenu.destroy();
      this.movementModeMenu = null;
    }
  }

  public isActionMenuVisible(): boolean {
    return this.actionMenu !== null;
  }

  public isMovementModeMenuVisible(): boolean {
    return this.movementModeMenu !== null;
  }

  public isAnyMenuVisible(): boolean {
    return this.isActionMenuVisible() || this.isMovementModeMenuVisible();
  }

  public getCurrentSelectedArmy(): Army | null {
    return this.currentSelectedArmy;
  }

  public showArmyInfo(army: Army): void {
    if (this.armyInfoPanel) {
      this.armyInfoPanel.updateArmyInfo(army);
      this.armyInfoPanel.show();
    }
  }

  public hideArmyInfo(): void {
    if (this.armyInfoPanel) {
      this.armyInfoPanel.hide();
    }
  }

  public updateArmyInfo(army: Army): void {
    if (this.armyInfoPanel && this.armyInfoPanel.visible) {
      this.armyInfoPanel.updateArmyInfo(army);
    }
  }

  public destroy(): void {
    this.hideActionMenu();
    this.hideMovementModeMenu();
    this.hideArmyInfo();
    if (this.armyInfoPanel) {
      this.armyInfoPanel.destroy();
      this.armyInfoPanel = null;
    }
  }
}
