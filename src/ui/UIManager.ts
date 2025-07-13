import * as Phaser from 'phaser';
import { ActionMenu } from './ActionMenu';
import { MovementModeMenu } from './MovementModeMenu';
import { Army } from '../army/Army';

export class UIManager {
  private scene: Phaser.Scene;
  private actionMenu: ActionMenu | null = null;
  private movementModeMenu: MovementModeMenu | null = null;
  private currentSelectedArmy: Army | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

    this.actionMenu = new ActionMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onMove: () => {
        onMove();
        this.actionMenu = null;
        this.currentSelectedArmy = null;
      },
      onCancel: () => {
        onCancel();
        this.actionMenu = null;
        this.currentSelectedArmy = null;
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

  public destroy(): void {
    this.hideActionMenu();
    this.hideMovementModeMenu();
  }
}
