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
    // カメラのズームを考慮したパネルサイズ
    const zoom = this.scene.cameras.main.zoom || 2.25;
    const viewWidth = 1280 / zoom; // 実際の表示幅
    const viewHeight = 720 / zoom; // 実際の表示高さ

    // 画面の右半分のサイズ
    const panelWidth = viewWidth / 2 - 20; // 右半分から余白を引く
    const panelHeight = viewHeight - 36; // 上下の余白を引く

    // 初期位置は画面外に配置（showArmyInfoで正しい位置に移動）
    const panelX = -1000;
    const panelY = -1000;

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

    this.currentSelectedArmy = army;

    // 軍団情報パネルを表示
    this.showArmyInfo(army);

    // カメラの現在の表示範囲を取得
    const cam = this.scene.cameras.main;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;

    // 画面左側の固定位置に配置
    const menuX = viewLeft + 80; // 左端から80px
    const menuY = viewTop + 100; // 上端から100px

    this.actionMenu = new ActionMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onMove: () => {
        onMove();
        this.actionMenu = null;
        // 移動を選択したら情報パネルを非表示
        this.hideArmyInfo();
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
    onNormalMove: () => void,
    onCombatMove: () => void,
    onCancel: () => void,
  ): void {
    // 既存のメニューがあれば削除
    this.hideMovementModeMenu();

    // カメラの現在の表示範囲を取得
    const cam = this.scene.cameras.main;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;

    // 画面左側の固定位置に配置（ActionMenuより下に）
    const menuX = viewLeft + 90; // 左端から90px
    const menuY = viewTop + 180; // 上端から180px

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
      // カメラの現在の表示範囲を取得
      const cam = this.scene.cameras.main;
      const viewTop = cam.worldView.y;
      const viewRight = cam.worldView.right;

      // パネルを画面の右端に配置
      const panelX = viewRight - this.armyInfoPanel.getWidth() - 10;
      const panelY = viewTop + 20;

      this.armyInfoPanel.setPosition(panelX, panelY);
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
      // カメラの移動に合わせて位置を更新
      const cam = this.scene.cameras.main;
      const viewTop = cam.worldView.y;
      const viewRight = cam.worldView.right;

      const panelX = viewRight - this.armyInfoPanel.getWidth() - 10;
      const panelY = viewTop + 20;

      this.armyInfoPanel.setPosition(panelX, panelY);
      this.armyInfoPanel.updateArmyInfo(army);
    }

    // ActionMenuの位置も更新
    if (this.actionMenu) {
      this.updateActionMenuPosition();
    }

    // MovementModeMenuの位置も更新
    if (this.movementModeMenu) {
      this.updateMovementModeMenuPosition();
    }
  }

  private updateActionMenuPosition(): void {
    if (this.actionMenu) {
      this.actionMenu.updateFixedPosition(80, 100); // 左端から80px、上端から100px
    }
  }

  private updateMovementModeMenuPosition(): void {
    if (this.movementModeMenu) {
      this.movementModeMenu.updateFixedPosition(90, 180); // 左端から90px、上端から180px
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
