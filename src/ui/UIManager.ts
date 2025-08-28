import * as Phaser from 'phaser';
import { ActionMenu } from './ActionMenu';
import { MovementModeMenu } from './MovementModeMenu';
import { ArmyInfoPanel } from './ArmyInfoPanel';
import { BaseInfoPanel } from './BaseInfoPanel';
import { BaseActionMenu } from './BaseActionMenu';
import { BarracksSubMenu } from './BarracksSubMenu';
import { ArmyFormationUI, FormationData } from './ArmyFormationUI';
import { ItemSelectionUI, ItemEquippedFormationData } from './ItemSelectionUI';
import { DeploymentPositionUI } from './DeploymentPositionUI';
import { ProductionFactoryMenu } from './ProductionFactoryMenu';
import { GarrisonedArmiesPanel } from './GarrisonedArmiesPanel';
import { MedicalFacilityMenu } from './MedicalFacilityMenu';
import { MedicalManager } from '../medical/MedicalManager';
import { ProductionManager } from '../production/ProductionManager';
import { EconomyManager } from '../economy/EconomyManager';
import { Army } from '../army/Army';
import { Base } from '../base/Base';
import { ArmyFormationData } from '../types/ArmyFormationTypes';

export class UIManager {
  private scene: Phaser.Scene;
  private productionManager: ProductionManager;
  private medicalManager: MedicalManager;
  private economyManager: EconomyManager;
  private baseManager: any; // BaseManagerの型は後で適切に設定
  private actionMenu: ActionMenu | null = null;
  private movementModeMenu: MovementModeMenu | null = null;
  private armyInfoPanel: ArmyInfoPanel | null = null;
  private baseInfoPanel: BaseInfoPanel | null = null;
  private baseActionMenu: BaseActionMenu | null = null;
  private barracksSubMenu: BarracksSubMenu | null = null;
  private armyFormationUI: ArmyFormationUI | null = null;
  private itemSelectionUI: ItemSelectionUI | null = null;
  private deploymentPositionUI: DeploymentPositionUI | null = null;
  private productionFactoryMenu: ProductionFactoryMenu | null = null;
  private garrisonedArmiesPanel: GarrisonedArmiesPanel | null = null;
  private medicalFacilityMenu: MedicalFacilityMenu | null = null;
  private currentSelectedArmy: Army | null = null;
  private currentSelectedBase: Base | null = null;
  private guideMessage: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, productionManager: ProductionManager, baseManager: any) {
    this.scene = scene;
    this.productionManager = productionManager;
    this.medicalManager = new MedicalManager(scene);
    this.economyManager = new EconomyManager(scene);
    this.baseManager = baseManager;
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
    onGarrison: () => void,
    onCancel: () => void,
    hasAttackTarget: boolean = false,
    canGarrison: boolean = false,
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
      onGarrison: () => {
        onGarrison();
        this.actionMenu = null;
        // 駐留を選択したら情報パネルを非表示
        this.hideArmyInfo();
      },
      onCancel: () => {
        onCancel();
        this.actionMenu = null;
        this.currentSelectedArmy = null;
        // キャンセル時は情報パネルも非表示
        this.hideArmyInfo();
      },
      hasAttackTarget,
      canGarrison,
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
    return (
      this.isActionMenuVisible() ||
      this.isMovementModeMenuVisible() ||
      this.isBaseActionMenuVisible() ||
      this.isBarracksSubMenuVisible() ||
      this.isProductionFactoryMenuVisible() ||
      this.isMedicalFacilityMenuVisible() ||
      this.isArmyFormationUIVisible() ||
      this.isItemSelectionUIVisible() ||
      this.isDeploymentPositionUIVisible()
    );
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
        this.showProductionFactoryMenu();
      },
      onHospital: () => {
        this.hideBaseActionMenu();
        this.showMedicalFacilityMenu();
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
        // 駐留軍団管理画面を表示
        if (this.currentSelectedBase) {
          this.showGarrisonedArmiesPanel(this.currentSelectedBase);
        }
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

  public showProductionFactoryMenu(): void {
    // 既存の生産工場メニューがあれば削除
    this.hideProductionFactoryMenu();

    // カメラの現在の表示範囲を取得（ArmyFormationUIと同じ方法）
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    // 拠点IDを取得（現在選択中の拠点から）
    const baseId = this.currentSelectedBase ? this.currentSelectedBase.getId() : 'base_001';

    this.productionFactoryMenu = new ProductionFactoryMenu({
      scene: this.scene,
      baseId,
      productionManager: this.productionManager,
      onCancel: () => {
        this.hideProductionFactoryMenu();
        // BaseActionMenuに戻る
        if (this.currentSelectedBase) {
          this.showBaseActionMenu(this.currentSelectedBase);
        }
      },
    });

    // 初期位置を設定
    this.productionFactoryMenu.setPosition(centerX, centerY);
    this.productionFactoryMenu.show();
  }

  public hideProductionFactoryMenu(): void {
    if (this.productionFactoryMenu) {
      this.productionFactoryMenu.destroy();
      this.productionFactoryMenu = null;
    }
  }

  public showMedicalFacilityMenu(): void {
    if (!this.currentSelectedBase || !this.baseManager || !this.medicalManager) {
      return;
    }

    // 既存のメニューを削除
    this.hideMedicalFacilityMenu();

    // ArmyManagerの取得
    const armyManager = (this.scene as any).armyManager;
    if (!armyManager) {
      console.error('ArmyManager not found');
      return;
    }

    // MedicalFacilityMenuは自身で中央配置を管理するため、座標指定は不要
    this.medicalFacilityMenu = new MedicalFacilityMenu({
      scene: this.scene,
      x: 0, // コンストラクタ内で中央配置される
      y: 0, // コンストラクタ内で中央配置される
      baseId: this.currentSelectedBase.getId(),
      baseManager: this.baseManager,
      armyManager: armyManager,
      medicalManager: this.medicalManager,
      money: this.economyManager.getMoney(),
      onStartTreatment: (_armyId: string, cost: number) => {
        // 資金チェックと支払い処理
        if (this.economyManager.canAfford(cost)) {
          const success = this.economyManager.spend(cost);
          if (success) {
            return true;
          }
        }
        return false;
      },
      onCancel: () => {
        this.hideMedicalFacilityMenu();
        // BaseActionMenuに戻る
        if (this.currentSelectedBase) {
          this.showBaseActionMenu(this.currentSelectedBase);
        }
      },
    });

    this.medicalFacilityMenu.show();
  }

  public hideMedicalFacilityMenu(): void {
    if (this.medicalFacilityMenu) {
      this.medicalFacilityMenu.destroy();
      this.medicalFacilityMenu = null;
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

    // ArmyFormationUIの位置更新
    if (this.armyFormationUI) {
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const centerX = viewLeft + viewWidth / 2;
      const centerY = viewTop + viewHeight / 2;

      this.armyFormationUI.setPosition(centerX, centerY);
    }

    // ItemSelectionUIの位置更新
    if (this.itemSelectionUI) {
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const centerX = viewLeft + viewWidth / 2;
      const centerY = viewTop + viewHeight / 2;

      this.itemSelectionUI.setPosition(centerX, centerY);
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

    // DeploymentPositionUIの位置更新
    if (this.deploymentPositionUI) {
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const centerX = viewLeft + viewWidth / 2;
      const centerY = viewTop + viewHeight / 2;

      this.deploymentPositionUI.setPosition(centerX, centerY);
    }

    // ProductionFactoryMenuの位置更新と進捗更新
    if (this.productionFactoryMenu) {
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const centerX = viewLeft + viewWidth / 2;
      const centerY = viewTop + viewHeight / 2;

      this.productionFactoryMenu.setPosition(centerX, centerY);
      // 進捗表示の更新
      this.productionFactoryMenu.update();
    }

    // GarrisonedArmiesPanelの位置更新
    if (this.garrisonedArmiesPanel) {
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const centerX = viewLeft + viewWidth / 2;
      const centerY = viewTop + viewHeight / 2;

      this.garrisonedArmiesPanel.setPosition(centerX, centerY);
    }

    // MedicalFacilityMenuの位置更新と処理更新
    if (this.medicalFacilityMenu) {
      this.medicalFacilityMenu.updatePosition();
      this.medicalFacilityMenu.update();
      this.medicalFacilityMenu.updateMoney(this.economyManager.getMoney());
    }

    // MedicalManagerの更新
    if (this.medicalManager) {
      const armyManager = (this.scene as any).armyManager;
      if (armyManager) {
        this.medicalManager.update(armyManager);
      }
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

        // アイテム選択画面へ遷移
        this.hideArmyFormationUI();
        this.showItemSelectionUI(base, formationData, onArmyFormed);
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
      const waitingSoldiers = baseManager.getWaitingSoldiers(base.getId());
      this.armyFormationUI.setWaitingSoldiers(waitingSoldiers);
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

  public isBaseActionMenuVisible(): boolean {
    return this.baseActionMenu !== null;
  }

  public isBarracksSubMenuVisible(): boolean {
    return this.barracksSubMenu !== null;
  }

  public isProductionFactoryMenuVisible(): boolean {
    return this.productionFactoryMenu !== null;
  }

  public isMedicalFacilityMenuVisible(): boolean {
    return this.medicalFacilityMenu !== null;
  }

  public isItemSelectionUIVisible(): boolean {
    return this.itemSelectionUI !== null;
  }

  public isDeploymentPositionUIVisible(): boolean {
    return this.deploymentPositionUI !== null;
  }

  public showItemSelectionUI(
    base: Base,
    formationData: FormationData,
    onArmyFormed?: (data: ArmyFormationData) => void,
    customOnBack?: () => void, // 新しいオプショナルパラメータ
  ): void {
    console.log('showItemSelectionUI called');

    // 既存のアイテム選択UIがあれば削除
    if (this.itemSelectionUI) {
      this.itemSelectionUI.destroy();
      this.itemSelectionUI = null;
    }

    // ProductionManagerからInventoryManagerを取得
    const inventoryManager = this.productionManager.getInventoryManager();

    // アイテム選択UIを作成
    this.itemSelectionUI = new ItemSelectionUI({
      scene: this.scene,
      base,
      formationData,
      inventoryManager: inventoryManager || undefined, // nullをundefinedに変換
      onProceedToDeployment: (itemEquippedData: ItemEquippedFormationData) => {
        console.log('アイテム装備データ:', itemEquippedData);

        // 出撃位置選択画面へ遷移
        this.hideItemSelectionUI();
        this.showDeploymentPositionUI(base, itemEquippedData, onArmyFormed);
      },
      onBack: customOnBack
        ? customOnBack
        : () => {
            // カスタムコールバックがない場合のデフォルト動作
            // アイテム選択画面から兵士選択画面に戻る
            this.hideItemSelectionUI();
            this.showArmyFormationUI(base, onArmyFormed);
          },
      onCancelled: () => {
        this.hideItemSelectionUI();
        // 拠点情報を再表示
        if (this.currentSelectedBase) {
          this.showBaseInfo(this.currentSelectedBase);
        }
      },
    });

    // BaseManagerから倉庫アイテムを取得
    // 注意: ItemSelectionUIは既にInventoryManagerからデータを読み込んでいるため、
    // ここでupdateInventoryを呼ぶとそのデータが上書きされてしまう
    // const baseManager = (this.scene as any).baseManager;
    // if (baseManager) {
    //   const warehouseItems = baseManager.getWarehouseItems();
    //   this.itemSelectionUI.updateInventory(warehouseItems);
    // } else {
    //   this.itemSelectionUI.updateInventory([]);
    // }

    this.itemSelectionUI.show();
  }

  public hideItemSelectionUI(): void {
    if (this.itemSelectionUI) {
      this.itemSelectionUI.destroy();
      this.itemSelectionUI = null;
    }
  }

  public showDeploymentPositionUI(
    base: Base,
    itemEquippedData: ItemEquippedFormationData,
    onArmyFormed?: (data: ArmyFormationData) => void,
  ): void {
    console.log('showDeploymentPositionUI called');

    // 既存の出撃位置選択UIがあれば削除
    if (this.deploymentPositionUI) {
      this.deploymentPositionUI.destroy();
      this.deploymentPositionUI = null;
    }

    // 必要なマネージャーを取得
    const mapManager = (this.scene as any).mapManager;
    const armyManager = (this.scene as any).armyManager;
    const baseManager = (this.scene as any).baseManager;

    if (!mapManager || !armyManager || !baseManager) {
      console.error('Required managers not found');
      return;
    }

    // 出撃位置選択UIを作成
    this.deploymentPositionUI = new DeploymentPositionUI({
      scene: this.scene,
      base,
      mapManager,
      armyManager,
      baseManager,
      itemEquippedFormationData: itemEquippedData,
      onDeploymentComplete: (army: Army) => {
        console.log('軍団が出撃しました:', army.getName());

        // UIを閉じる
        this.hideDeploymentPositionUI();

        // 拠点情報を再表示
        if (this.currentSelectedBase) {
          this.showBaseInfo(this.currentSelectedBase);
        }

        // コールバックを実行
        if (onArmyFormed) {
          // 軍団の現在位置をグリッド座標に変換
          const armyPos = army.getPosition();
          const tileSize = 16; // MAP_CONFIG.tileSize
          const deployPosition = {
            x: Math.floor(armyPos.x / tileSize),
            y: Math.floor(armyPos.y / tileSize),
          };
          const completeFormationData: ArmyFormationData = {
            commander: itemEquippedData.commander,
            soldiers: itemEquippedData.soldiers,
            items: itemEquippedData.items,
            deployPosition,
          };
          onArmyFormed(completeFormationData);
        }
      },
      onBack: () => {
        // 出撃位置選択画面からアイテム選択画面に戻る
        this.hideDeploymentPositionUI();
        this.showItemSelectionUI(
          base,
          {
            commander: itemEquippedData.commander,
            soldiers: itemEquippedData.soldiers,
          },
          onArmyFormed,
        );
      },
    });

    this.deploymentPositionUI.show();
  }

  public hideDeploymentPositionUI(): void {
    if (this.deploymentPositionUI) {
      this.deploymentPositionUI.destroy();
      this.deploymentPositionUI = null;
    }
  }

  public showGarrisonedArmiesPanel(base: Base): void {
    console.log(`showGarrisonedArmiesPanel called for base: ${base.getName()}`);

    // 既存のUIを非表示
    this.hideAllUI();

    // 既存のパネルがあれば削除
    if (this.garrisonedArmiesPanel) {
      this.garrisonedArmiesPanel.destroy();
      this.garrisonedArmiesPanel = null;
    }

    // 駐留軍団を取得
    const garrisonedArmies = this.baseManager.getStationedArmies(base.getId());

    if (!garrisonedArmies || garrisonedArmies.length === 0) {
      console.log('駐留軍団がありません');
      // 拠点情報を再表示
      if (this.currentSelectedBase) {
        this.showBaseInfo(this.currentSelectedBase);
      }
      return;
    }

    // 駐留軍団管理パネルを作成
    this.garrisonedArmiesPanel = new GarrisonedArmiesPanel({
      scene: this.scene,
      base,
      armies: garrisonedArmies,
      medicalManager: this.medicalManager,
      onProceedToItemSelection: (army: Army) => {
        console.log('アイテム装備へ進む:', army.getName());

        // 駐留軍団パネルを非表示
        this.hideGarrisonedArmiesPanel();

        // 軍団のメンバーからFormationDataを作成
        const members = army.getAllMembers();
        const formationData = {
          commander: members[0], // 最初のメンバーが指揮官
          soldiers: members.slice(1), // 残りが一般兵
        };

        // 駐留軍団から出撃する際のコールバック
        // 新しい軍団が作成された後に、元の駐留軍団を削除する
        const onGarrisonedArmyDeploy = (_data: ArmyFormationData) => {
          // 元の駐留軍団をBaseManagerから削除
          // 注意: army.destroy()は呼ばない。新しい軍団が同じCharacterオブジェクトを使用しているため
          this.baseManager.removeStationedArmy(base.getId(), army);
          console.log(`駐留軍団 ${army.getName()} を削除しました`);
        };

        // アイテム選択UIを表示（駐留軍団用コールバックを渡す）
        this.showItemSelectionUI(base, formationData, onGarrisonedArmyDeploy, () => {
          // 駐留管理から来た場合の戻るボタンのコールバック
          // ItemSelectionUIを非表示にして駐留管理画面に戻る
          this.hideItemSelectionUI();
          this.showGarrisonedArmiesPanel(base);
        });
      },
      onCancel: () => {
        this.hideGarrisonedArmiesPanel();
        // 拠点情報を再表示
        if (this.currentSelectedBase) {
          this.showBaseInfo(this.currentSelectedBase);
        }
      },
    });

    this.garrisonedArmiesPanel.show();
  }

  public hideGarrisonedArmiesPanel(): void {
    if (this.garrisonedArmiesPanel) {
      this.garrisonedArmiesPanel.destroy();
      this.garrisonedArmiesPanel = null;
    }
  }

  private hideAllUI(): void {
    console.log('hideAllUI called');
    this.hideActionMenu();
    this.hideMovementModeMenu();
    this.hideArmyInfo();
    this.hideBaseInfo();
    this.hideBaseActionMenu();
    this.hideBarracksSubMenu();
    this.hideProductionFactoryMenu();
    this.hideMedicalFacilityMenu();
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
    this.hideProductionFactoryMenu();
    this.hideMedicalFacilityMenu();
    this.hideGuideMessage();
    this.hideArmyFormationUI();
    this.hideItemSelectionUI();
    this.hideDeploymentPositionUI();
    this.hideGarrisonedArmiesPanel();
    if (this.armyInfoPanel) {
      this.armyInfoPanel.destroy();
      this.armyInfoPanel = null;
    }
    if (this.baseInfoPanel) {
      this.baseInfoPanel.destroy();
      this.baseInfoPanel = null;
    }
    if (this.medicalManager) {
      this.medicalManager.destroy();
    }
  }
}
