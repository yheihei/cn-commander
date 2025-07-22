import * as Phaser from 'phaser';
import { ActionMenu } from './ActionMenu';
import { MovementModeMenu } from './MovementModeMenu';
import { ArmyInfoPanel } from './ArmyInfoPanel';
import { BaseInfoPanel } from './BaseInfoPanel';
import { BaseActionMenu } from './BaseActionMenu';
import { BarracksSubMenu } from './BarracksSubMenu';
import { ArmyFormationUI, FormationData } from './ArmyFormationUI';
import { Army } from '../army/Army';
import { Base } from '../base/Base';
import { Character } from '../character/Character';
import { ArmyFormationData } from '../types/ArmyFormationTypes';
import { IItem } from '../types/ItemTypes';

export class UIManager {
  private scene: Phaser.Scene;
  private actionMenu: ActionMenu | null = null;
  private movementModeMenu: MovementModeMenu | null = null;
  private armyInfoPanel: ArmyInfoPanel | null = null;
  private baseInfoPanel: BaseInfoPanel | null = null;
  private baseActionMenu: BaseActionMenu | null = null;
  private barracksSubMenu: BarracksSubMenu | null = null;
  private armyFormationUI: ArmyFormationUI | null = null;
  private currentSelectedArmy: Army | null = null;
  private currentSelectedBase: Base | null = null;
  private guideMessage: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeInfoPanels();
  }

  private initializeInfoPanels(): void {
    // カメラのズームを考慮したパネルサイズ
    const zoom = this.scene.cameras.main.zoom || 2.25;
    const viewWidth = 1280 / zoom; // 実際の表示幅
    const viewHeight = 720 / zoom; // 実際の表示高さ

    // 画面の右半分のサイズ
    const panelWidth = viewWidth / 2 - 20; // 右半分から余白を引く
    const panelHeight = viewHeight - 36; // 上下の余白を引く

    // 初期位置は画面外に配置（showArmyInfo/showBaseInfoで正しい位置に移動）
    const panelX = -1000;
    const panelY = -1000;

    this.armyInfoPanel = new ArmyInfoPanel({
      scene: this.scene,
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    });

    // BaseInfoPanelは小さめのサイズで作成
    const baseInfoPanelHeight = 120; // 固定高さ
    this.baseInfoPanel = new BaseInfoPanel({
      scene: this.scene,
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: baseInfoPanelHeight,
    });
  }

  public showActionMenu(
    army: Army,
    onMove: () => void,
    onStandby: () => void,
    onAttackTarget: () => void,
    onClearAttackTarget: () => void,
    onCancel: () => void,
    hasAttackTarget: boolean = false,
  ): void {
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
      onStandby: () => {
        onStandby();
        this.actionMenu = null;
        // 待機を選択したら情報パネルも非表示
        this.hideArmyInfo();
      },
      onAttackTarget: () => {
        onAttackTarget();
        this.actionMenu = null;
        // 攻撃目標指定を選択したら情報パネルを非表示
        this.hideArmyInfo();
      },
      onClearAttackTarget: () => {
        onClearAttackTarget();
        this.actionMenu = null;
        // 攻撃目標解除を選択しても情報パネルは表示したままにする
      },
      onCancel: () => {
        onCancel();
        this.actionMenu = null;
        this.currentSelectedArmy = null;
        // キャンセル時は情報パネルも非表示
        this.hideArmyInfo();
      },
      hasAttackTarget,
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
    // BaseInfoPanelが表示されている場合は非表示にする
    this.hideBaseInfo();

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

  public showGuideMessage(message: string): void {
    console.log('UIManager.showGuideMessage:', message);
    // 既存のガイドメッセージを削除
    this.hideGuideMessage();

    // カメラの現在の表示範囲を取得
    const cam = this.scene.cameras.main;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const viewWidth = cam.worldView.width;

    // 画面上部中央に配置
    const x = viewLeft + viewWidth / 2;
    const y = viewTop + 30;

    // ガイドメッセージコンテナを作成
    this.guideMessage = this.scene.add.container(x, y);

    // 背景
    const bg = this.scene.add.rectangle(0, 0, 300, 40, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffffff);
    this.guideMessage.add(bg);

    // テキスト
    const text = this.scene.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
    });
    text.setOrigin(0.5);
    this.guideMessage.add(text);

    // UIレイヤーの最前面に表示
    this.guideMessage.setDepth(1000);
    console.log('UIManager.showGuideMessage: ガイドメッセージコンテナを作成しました', {
      x,
      y,
      message,
    });
  }

  public hideGuideMessage(): void {
    if (this.guideMessage) {
      this.guideMessage.destroy();
      this.guideMessage = null;
    }
  }

  public showBaseInfo(base: Base): void {
    // ArmyInfoPanelが表示されている場合は非表示にする
    this.hideArmyInfo();

    if (this.baseInfoPanel) {
      // カメラの現在の表示範囲を取得
      const cam = this.scene.cameras.main;
      const viewTop = cam.worldView.y;
      const viewRight = cam.worldView.right;

      // パネルを画面の右端に配置
      const panelX = viewRight - this.baseInfoPanel.getWidth() - 10;
      const panelY = viewTop + 20;

      this.baseInfoPanel.setPosition(panelX, panelY);
      this.baseInfoPanel.show(base);
    }

    this.currentSelectedBase = base;

    // 味方拠点の場合はBaseActionMenuも表示
    if (base.getOwner() === 'player') {
      this.showBaseActionMenu(base);
    }
  }

  public hideBaseInfo(): void {
    if (this.baseInfoPanel) {
      this.baseInfoPanel.hide();
    }
    this.hideBaseActionMenu();
    this.hideBarracksSubMenu();
    this.currentSelectedBase = null;
  }

  public showBaseActionMenu(base: Base): void {
    // 既存のメニューがあれば削除
    this.hideBaseActionMenu();

    // 味方拠点でない場合は表示しない
    if (base.getOwner() !== 'player') {
      return;
    }

    // カメラの現在の表示範囲を取得
    const cam = this.scene.cameras.main;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;

    // 画面左側の固定位置に配置
    const menuX = viewLeft + 80; // 左端から80px
    const menuY = viewTop + 120; // 上端から120px

    this.baseActionMenu = new BaseActionMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onBarracks: () => {
        this.hideBaseActionMenu();
        this.showBarracksSubMenu();
      },
      onFactory: () => {
        this.hideBaseActionMenu();
        // TODO: 生産工場サブメニューを表示
        console.log('生産工場が選択されました');
      },
      onHospital: () => {
        this.hideBaseActionMenu();
        // TODO: 医療施設サブメニューを表示
        console.log('医療施設が選択されました');
      },
      onWarehouse: () => {
        this.hideBaseActionMenu();
        // TODO: 倉庫サブメニューを表示
        console.log('倉庫が選択されました');
      },
      onCancel: () => {
        this.hideBaseActionMenu();
        this.hideBaseInfo();
      },
    });
  }

  public hideBaseActionMenu(): void {
    if (this.baseActionMenu) {
      this.baseActionMenu.destroy();
      this.baseActionMenu = null;
    }
  }

  public showBarracksSubMenu(): void {
    // 既存のメニューがあれば削除
    this.hideBarracksSubMenu();

    // カメラの現在の表示範囲を取得
    const cam = this.scene.cameras.main;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;

    // 画面左側の固定位置に配置（BaseActionMenuより少し右に）
    const menuX = viewLeft + 100; // 左端から100px
    const menuY = viewTop + 140; // 上端から140px

    this.barracksSubMenu = new BarracksSubMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onFormArmy: () => {
        this.hideBarracksSubMenu();
        // 軍団編成画面を表示
        if (this.currentSelectedBase) {
          this.showArmyFormationUI(this.currentSelectedBase);
        }
      },
      onManageGarrison: () => {
        this.hideBarracksSubMenu();
        // TODO: 駐留軍団管理画面を表示
        console.log('駐留軍団管理が選択されました');
      },
      onViewSoldiers: () => {
        this.hideBarracksSubMenu();
        // TODO: 待機兵士確認画面を表示
        console.log('待機兵士確認が選択されました');
      },
      onCancel: () => {
        this.hideBarracksSubMenu();
        // BaseActionMenuに戻る
        if (this.currentSelectedBase) {
          this.showBaseActionMenu(this.currentSelectedBase);
        }
      },
    });
  }

  public hideBarracksSubMenu(): void {
    if (this.barracksSubMenu) {
      this.barracksSubMenu.destroy();
      this.barracksSubMenu = null;
    }
  }

  public update(): void {
    // 軍団情報パネルの更新は既存のupdateArmyInfoで行う
    if (this.currentSelectedArmy && this.armyInfoPanel) {
      this.updateArmyInfo(this.currentSelectedArmy);
    }

    // BaseInfoPanelの位置更新
    if (this.baseInfoPanel && this.baseInfoPanel.isVisible()) {
      const cam = this.scene.cameras.main;
      const viewTop = cam.worldView.y;
      const viewRight = cam.worldView.right;

      const panelX = viewRight - this.baseInfoPanel.getWidth() - 10;
      const panelY = viewTop + 20;
      this.baseInfoPanel.setPosition(panelX, panelY);
    }

    // BaseActionMenuの位置更新
    if (this.baseActionMenu) {
      this.baseActionMenu.updateFixedPosition(80, 120);
    }

    // BarracksSubMenuの位置更新
    if (this.barracksSubMenu) {
      this.barracksSubMenu.updateFixedPosition(100, 140);
    }

    // ガイドメッセージの位置更新
    if (this.guideMessage) {
      const cam = this.scene.cameras.main;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const viewWidth = cam.worldView.width;

      const x = viewLeft + viewWidth / 2;
      const y = viewTop + 30;
      this.guideMessage.setPosition(x, y);
    }

    // ArmyFormationUIは全画面モーダルなので位置更新不要
  }

  public showArmyFormationUI(base: Base, onArmyFormed?: (data: ArmyFormationData) => void): void {
    console.log(`showArmyFormationUI called for base: ${base.getName()}`);
    // 既存のUIをすべて非表示
    this.hideAllUI();

    // 軍団編成UIが既に存在する場合は一旦削除
    if (this.armyFormationUI) {
      this.armyFormationUI.destroy();
      this.armyFormationUI = null;
    }

    // 軍団編成UIを作成（全画面モーダル）
    this.armyFormationUI = new ArmyFormationUI({
      scene: this.scene,
      base,
      onProceedToItemSelection: (formationData: FormationData) => {
        console.log('編成データ:', formationData);
        
        // TODO: アイテム選択画面への遷移
        // ここでアイテム選択画面を表示し、アイテム選択後に
        // 出撃位置選択、軍団作成を行う
        
        // 仮の実装：アイテムをスキップして直接軍団を作成
        if (formationData.commander) {
          const soldiers = formationData.soldiers.filter(s => s !== null) as Character[];
          const basePos = base.getPosition();
          const deployPosition = { x: basePos.x + 2, y: basePos.y + 1 };
          const items = new Map<Character, IItem[]>();
          
          const completeFormationData: ArmyFormationData = {
            commander: formationData.commander,
            soldiers,
            items,
            deployPosition,
          };

          this.hideArmyFormationUI();

          // ArmyManagerを使って軍団を作成
          const armyManager = (this.scene as any).armyManager;
          const baseManager = (this.scene as any).baseManager;

          if (armyManager && baseManager) {
            const army = armyManager.createArmyFromBase(completeFormationData, base);

            if (army) {
              // 待機兵士から削除
              const soldiersToRemove = [completeFormationData.commander, ...completeFormationData.soldiers];
              baseManager.removeWaitingSoldiers(base.getId(), soldiersToRemove);

              console.log('軍団が出撃しました:', army.getName());
            }
          }

          if (onArmyFormed) {
            onArmyFormed(completeFormationData);
          }
        }
      },
      onCancelled: () => {
        this.hideArmyFormationUI();
        // 拠点情報を再表示
        if (this.currentSelectedBase) {
          this.showBaseInfo(this.currentSelectedBase);
        }
      },
    });

    // BaseManagerから待機兵士を取得してUIに設定
    const baseManager = (this.scene as any).baseManager;
    if (baseManager) {
    }

    // 全画面モーダルなのでshowを呼ぶだけ
    this.armyFormationUI.show();
  }

  public hideArmyFormationUI(): void {
    if (this.armyFormationUI) {
      this.armyFormationUI.destroy();
      this.armyFormationUI = null;
    }
  }

  public isArmyFormationUIVisible(): boolean {
    return this.armyFormationUI !== null;
  }

  private hideAllUI(): void {
    console.log('hideAllUI called');
    this.hideActionMenu();
    this.hideMovementModeMenu();
    this.hideArmyInfo();
    this.hideBaseInfo();
    this.hideBaseActionMenu();
    this.hideBarracksSubMenu();
    this.hideGuideMessage();
    // 注: armyFormationUIは意図的に含めない（専用のhideメソッドがあるため）
  }

  public destroy(): void {
    this.hideActionMenu();
    this.hideMovementModeMenu();
    this.hideArmyInfo();
    this.hideBaseInfo();
    this.hideBaseActionMenu();
    this.hideBarracksSubMenu();
    this.hideGuideMessage();
    this.hideArmyFormationUI();
    if (this.armyInfoPanel) {
      this.armyInfoPanel.destroy();
      this.armyInfoPanel = null;
    }
    if (this.baseInfoPanel) {
      this.baseInfoPanel.destroy();
      this.baseInfoPanel = null;
    }
  }
}
