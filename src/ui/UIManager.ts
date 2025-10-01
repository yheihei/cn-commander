import * as Phaser from 'phaser';
import { ActionMenu } from './ActionMenu';
import { MovementModeMenu } from './MovementModeMenu';
import { ArmyInfoPanel } from './ArmyInfoPanel';
import { BaseInfoPanel } from './BaseInfoPanel';
import { BaseActionMenu } from './BaseActionMenu';
import { BarracksSubMenu } from './BarracksSubMenu';
import { ArmyFormationUI, FormationData } from './ArmyFormationUI';
import { ItemSelectionUI, ItemEquippedFormationData } from './ItemSelectionUI';
import { ItemInventoryUI } from './ItemInventoryUI';
import { DeploymentPositionUI } from './DeploymentPositionUI';
import { ProductionFactoryMenu } from './ProductionFactoryMenu';
import { GarrisonedArmiesPanel } from './GarrisonedArmiesPanel';
import { MedicalFacilityMenu } from './MedicalFacilityMenu';
import { WarehouseSubMenu } from './WarehouseSubMenu';
import { SystemInfoBar } from './SystemInfoBar';
import { MedicalManager } from '../medical/MedicalManager';
import { ProductionManager } from '../production/ProductionManager';
import { EconomyManager } from '../economy/EconomyManager';
import { GameTimeManager } from '../time/GameTimeManager';
import { Army } from '../army/Army';
import { Base } from '../base/Base';
import { ArmyFormationData } from '../types/ArmyFormationTypes';
import { IConsumable, IWeapon, IItem } from '../types/ItemTypes';
import { Character } from '../character/Character';

export class UIManager {
  private scene: Phaser.Scene;
  private productionManager: ProductionManager;
  private medicalManager: MedicalManager | null = null;
  private economyManager: EconomyManager;
  private baseManager: any; // BaseManagerの型は後で適切に設定
  private gameTimeManager: GameTimeManager | null = null;
  private wasAnyMenuVisible: boolean = false;
  private actionMenu: ActionMenu | null = null;
  private actionMenuButtonCount: number = 3; // ActionMenuのボタン数を記憶
  private movementModeMenu: MovementModeMenu | null = null;
  private armyInfoPanel: ArmyInfoPanel | null = null;
  private baseInfoPanel: BaseInfoPanel | null = null;
  private baseActionMenu: BaseActionMenu | null = null;
  private barracksSubMenu: BarracksSubMenu | null = null;
  private armyFormationUI: ArmyFormationUI | null = null;
  private itemSelectionUI: ItemSelectionUI | null = null;
  private itemInventoryUI: ItemInventoryUI | null = null;
  private deploymentPositionUI: DeploymentPositionUI | null = null;
  private productionFactoryMenu: ProductionFactoryMenu | null = null;
  private garrisonedArmiesPanel: GarrisonedArmiesPanel | null = null;
  private medicalFacilityMenu: MedicalFacilityMenu | null = null;
  private warehouseSubMenu: WarehouseSubMenu | null = null;
  private currentSelectedArmy: Army | null = null;
  private currentSelectedBase: Base | null = null;
  private guideMessage: Phaser.GameObjects.Container | null = null;
  private systemInfoBar: SystemInfoBar | null = null;

  constructor(
    scene: Phaser.Scene,
    productionManager: ProductionManager,
    economyManager: EconomyManager,
    baseManager: any,
  ) {
    this.scene = scene;
    this.productionManager = productionManager;
    this.economyManager = economyManager;
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

    // SystemInfoBar（画面右上）
    this.systemInfoBar = new SystemInfoBar({
      scene: this.scene,
      x: -1000, // 初期位置は画面外
      y: -1000,
    });
    // 初期表示
    const playerBases = this.baseManager.getBasesByOwner('player');
    const income = this.economyManager.calculateIncomePerMinute(playerBases);
    this.systemInfoBar.updateDisplay(this.economyManager.getMoney(), income);
    this.systemInfoBar.show();
  }

  /**
   * GameTimeManagerへの参照を設定
   * モーダルUI表示時の自動ポーズ制御に使用
   * MedicalManagerもGameTimeManagerと連携するため、ここで再初期化
   */
  public setGameTimeManager(gameTimeManager: GameTimeManager): void {
    this.gameTimeManager = gameTimeManager;
    // MedicalManagerをGameTimeManager対応で再初期化
    this.medicalManager = new MedicalManager(gameTimeManager);
  }

  public showActionMenu(
    army: Army,
    onMove: () => void,
    onStandby: () => void,
    onGarrison: () => void,
    onClearGarrison: () => void,
    onAttackTarget: () => void,
    onCancel: () => void,
    onInventory: () => void, // 追加
    onOccupy?: () => void,
    canOccupy?: boolean,
  ): void {
    console.log('[UIManager] showActionMenu called');
    // 既存のメニューを非表示
    this.hideActionMenu();
    this.hideMovementModeMenu();

    // 現在選択中の軍団を記録
    this.currentSelectedArmy = army;

    // 軍団情報パネルを表示
    this.showArmyInfo(army);

    const cam = this.scene.cameras.main;
    const viewTop = cam.worldView.y;
    const viewLeft = cam.worldView.x;
    const menuX = viewLeft + 80; // 左端から80px

    // 駐留可能かチェック
    const canGarrison = this.checkCanGarrison(army);

    // 攻撃目標があるかチェック
    const hasAttackTarget = army.hasAttackTarget();

    // ボタン数をカウント（ActionMenuと同じロジック）
    let buttonCount = 4; // 基本ボタン数（移動、攻撃目標、待機、持物）
    if (canGarrison) buttonCount++;
    if (canOccupy) buttonCount++;

    // ボタン数を記憶（updateActionMenuPositionで使用）
    this.actionMenuButtonCount = buttonCount;

    // メニュー高さを計算（ActionMenuと同じロジック）
    const menuHeight = 60 + buttonCount * 50;

    // メニューの上端が画面内に収まるようにY座標を調整
    // メニューの中心点Y座標 = viewTop + 余白 + メニュー高さの半分
    const menuY = viewTop + 10 + menuHeight / 2;

    this.actionMenu = new ActionMenu({
      scene: this.scene,
      x: menuX,
      y: menuY,
      onMove: () => {
        console.log('[UIManager] ActionMenu - Move selected');
        onMove();
        this.actionMenu = null;
        // 移動を選択したら情報パネルを非表示
        this.hideArmyInfo();
      },
      onStandby: () => {
        console.log('[UIManager] ActionMenu - Standby selected');
        onStandby();
        this.actionMenu = null;
        // 待機を選択したら情報パネルも非表示
        this.hideArmyInfo();
      },
      onInventory: () => {
        console.log('[UIManager] ActionMenu - Inventory selected');
        onInventory(); // MovementInputHandlerのコールバックを呼ぶ
        this.actionMenu = null;
        this.hideArmyInfo();
        // 持物UIを表示
        this.showItemInventoryUI(army);
      },
      onGarrison: () => {
        console.log('[UIManager] ActionMenu - Garrison selected');
        onGarrison();
        this.actionMenu = null;
        // 駐留を選択したら情報パネルを非表示
        this.hideArmyInfo();
      },
      onClearAttackTarget: () => {
        console.log('[UIManager] ActionMenu - Clear attack target selected');
        onClearGarrison();
        this.actionMenu = null;
        // 攻撃目標解除も情報パネルを非表示
        this.hideArmyInfo();
      },
      onAttackTarget: () => {
        console.log('[UIManager] ActionMenu - Attack target selected');
        onAttackTarget();
        this.actionMenu = null;
        // 攻撃目標指定も情報パネルを非表示
        this.hideArmyInfo();
      },
      onCancel: () => {
        console.log('[UIManager] ActionMenu - Cancel selected');
        onCancel();
        this.actionMenu = null;
        // キャンセルも情報パネルを非表示
        this.hideArmyInfo();
      },
      onOccupy: onOccupy
        ? () => {
            console.log('[UIManager] ActionMenu - Occupy selected');
            onOccupy();
            this.actionMenu = null;
            // 占領も情報パネルを非表示
            this.hideArmyInfo();
          }
        : undefined,
      hasAttackTarget,
      canGarrison,
      canOccupy: canOccupy || false,
    });
  }

  /**
   * 軍団が駐留可能かチェック
   */
  /**
   * 軍団が駐留可能かチェック
   */
  private checkCanGarrison(army: Army): boolean {
    // baseManagerがない、またはgetBasesWithinRangeメソッドがない場合はfalse
    if (!this.baseManager || typeof this.baseManager.getBasesWithinRange !== 'function') {
      return false;
    }

    const commander = army.getCommander();

    // getWorldTransformMatrixを使って実際のワールド座標を取得
    let worldX: number, worldY: number;
    if (typeof commander.getWorldTransformMatrix === 'function') {
      const worldPos = commander.getWorldTransformMatrix();
      worldX = worldPos.tx;
      worldY = worldPos.ty;
    } else if (typeof commander.getPosition === 'function') {
      // テスト環境の場合
      const pos = commander.getPosition();
      worldX = pos.x;
      worldY = pos.y;
    } else {
      // どちらのメソッドもない場合はfalse
      return false;
    }

    // ワールド座標からタイル座標に変換
    const tileX = Math.floor(worldX / 16);
    const tileY = Math.floor(worldY / 16);

    const nearbyBases = this.baseManager.getBasesWithinRange(
      tileX,
      tileY,
      3,
      (base: Base) => base.getOwner() === 'player',
    );

    return nearbyBases.length > 0;
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
      this.isWarehouseSubMenuVisible() ||
      this.isArmyFormationUIVisible() ||
      this.isItemSelectionUIVisible() ||
      this.isItemInventoryUIVisible() ||
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
      // メニュー高さを計算（ActionMenuと同じロジック）
      const menuHeight = 60 + this.actionMenuButtonCount * 50;

      // メニューの上端が画面内に収まるようにY座標を調整
      // screenY = 余白 + メニュー高さの半分
      const screenY = 10 + menuHeight / 2;

      this.actionMenu.updateFixedPosition(80, screenY); // 左端から80px、動的に計算されたY座標
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

    // 画面上部中央に配置（整数座標でピクセルパーフェクト）
    const x = Math.round(viewLeft + viewWidth / 2);
    const y = Math.round(viewTop + 30);

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
      padding: { x: 0, top: 2 },
      resolution: 2,
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

    // 2秒後に自動的にメッセージを消す
    this.scene.time.delayedCall(2000, () => {
      this.hideGuideMessage();
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
        this.showWarehouseSubMenu();
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

    // 型の安全性のためローカル変数に代入
    const medicalManager = this.medicalManager;

    // MedicalFacilityMenuは自身で中央配置を管理するため、座標指定は不要
    this.medicalFacilityMenu = new MedicalFacilityMenu({
      scene: this.scene,
      x: 0, // コンストラクタ内で中央配置される
      y: 0, // コンストラクタ内で中央配置される
      baseId: this.currentSelectedBase.getId(),
      baseManager: this.baseManager,
      armyManager,
      medicalManager,
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

  public showWarehouseSubMenu(): void {
    // 他のメニューを閉じる
    this.hideBaseActionMenu();
    this.hideBarracksSubMenu();
    this.hideProductionFactoryMenu();
    this.hideMedicalFacilityMenu();
    this.hideWarehouseSubMenu();

    // WarehouseSubMenuを作成
    this.warehouseSubMenu = new WarehouseSubMenu({
      scene: this.scene,
      onCancel: () => {
        this.hideWarehouseSubMenu();
      },
    });
  }

  public hideWarehouseSubMenu(): void {
    if (this.warehouseSubMenu) {
      this.warehouseSubMenu.destroy();
      this.warehouseSubMenu = null;
    }
  }

  public showItemInventoryUI(army: Army): void {
    // 他のメニューを閉じる
    this.hideActionMenu();
    this.hideMovementModeMenu();
    this.hideArmyInfo();
    this.hideItemInventoryUI();

    // ItemInventoryUIを作成
    this.itemInventoryUI = new ItemInventoryUI({
      scene: this.scene,
      army,
      onClose: () => {
        this.hideItemInventoryUI();
      },
      onUseItem: (character: Character, item: IConsumable) => {
        this.handleConsumableUse(character, item, army);
      },
      onEquipWeapon: (character: Character, weapon: IWeapon) => {
        // 装備処理
        character.getItemHolder().equipWeapon(weapon);
        console.log(`[ItemInventoryUI] 装備: ${character.getName()} - ${weapon.name}`);
      },
      onTransferItem: (from: Character, to: Character, item: IItem) => {
        this.handleItemTransfer(from, to, item);
      },
    });
  }

  /**
   * 消耗品使用処理
   * - 兵糧丸：使用者のHP全快
   * - 薬忍の場合：軍団全員のHP全快
   * - 使用後、アイテムは消費され持物から削除
   */
  private handleConsumableUse(user: Character, consumable: IConsumable, army: Army): void {
    console.log(`[UIManager] 消耗品使用開始: ${user.getName()} が ${consumable.name} を使用`);
    console.log(
      `[UIManager] アイテム詳細: effect="${consumable.effect}", uses=${consumable.uses}, maxUses=${consumable.maxUses}`,
    );

    // 使用前のHP状況をログ出力
    console.log(`[UIManager] === 使用前のHP状況 ===`);
    const allMembers = army.getAllMembers();
    allMembers.forEach((member) => {
      const stats = member.getStats();
      console.log(
        `[UIManager] ${member.getName()} (${member.getJobType()}): ${stats.hp}/${stats.maxHp} HP`,
      );
    });

    // 兵糧丸の場合の処理
    if (consumable.effect === 'heal_full') {
      console.log(`[UIManager] 兵糧丸の効果を適用中...`);

      // 薬忍のクラススキル判定
      const userJob = user.getJobType();
      console.log(`[UIManager] 使用者の職業: ${userJob}`);

      if (userJob === 'medicine') {
        // 薬忍：軍団全員のHP全快
        console.log(`[UIManager] 薬忍スキル発動: 軍団全員のHP全快を実行`);
        allMembers.forEach((member) => {
          const beforeStats = member.getStats();
          const healAmount = beforeStats.maxHp - beforeStats.hp;
          if (healAmount > 0) {
            member.heal(healAmount); // 最大HPまで回復
            const afterStats = member.getStats();
            console.log(
              `[UIManager] ${member.getName()} HP回復: ${beforeStats.hp}/${beforeStats.maxHp} -> ${afterStats.hp}/${afterStats.maxHp} (回復量: ${healAmount})`,
            );
          } else {
            console.log(`[UIManager] ${member.getName()} は既にHP満タンのため回復不要`);
          }
        });

        // 薬忍使用時のメッセージ表示
        this.showGuideMessage('軍団全員のHPが回復しました');
      } else {
        // 通常：使用者のみHP全快
        console.log(`[UIManager] 通常効果: 使用者のみHP全快を実行`);
        const beforeStats = user.getStats();
        const healAmount = beforeStats.maxHp - beforeStats.hp;
        if (healAmount > 0) {
          user.heal(healAmount); // 最大HPまで回復
          const afterStats = user.getStats();
          console.log(
            `[UIManager] ${user.getName()} HP回復: ${beforeStats.hp}/${beforeStats.maxHp} -> ${afterStats.hp}/${afterStats.maxHp} (回復量: ${healAmount})`,
          );
        } else {
          console.log(`[UIManager] ${user.getName()} は既にHP満タンのため回復不要`);
        }

        // 通常忍者使用時のメッセージ表示
        this.showGuideMessage(`${user.getName()}のHPが回復しました`);
      }

      // 使用後のHP状況をログ出力
      console.log(`[UIManager] === 使用後のHP状況 ===`);
      allMembers.forEach((member) => {
        const stats = member.getStats();
        console.log(
          `[UIManager] ${member.getName()} (${member.getJobType()}): ${stats.hp}/${stats.maxHp} HP`,
        );
      });
    } else {
      console.log(`[UIManager] 警告: 未対応のeffect "${consumable.effect}"`);
    }

    // 消耗品を使用者の持物から削除
    const itemHolder = user.getItemHolder();
    itemHolder.removeItem(consumable);
    console.log(`[UIManager] アイテム削除: ${consumable.name} を ${user.getName()} の持物から削除`);

    // 使用回数を減らす（将来的な拡張用）
    if (consumable.maxUses > 1) {
      consumable.maxUses--;
      if (consumable.maxUses > 0) {
        // まだ使用回数が残っている場合は持物に戻す
        itemHolder.addItem(consumable);
      }
    }
  }

  /**
   * アイテム譲渡処理
   * - 軍団内の他のメンバーにアイテムを譲渡
   * - 譲渡先の所持上限チェック
   * - 装備中武器の場合は自動装備解除
   */
  private handleItemTransfer(from: Character, to: Character, item: IItem): void {
    console.log(
      `[UIManager] アイテム譲渡: ${from.getName()} から ${to.getName()} へ ${item.name} を譲渡`,
    );

    // 譲渡先の所持数チェック
    const toItemHolder = to.getItemHolder();
    if (toItemHolder.items.length >= 4) {
      console.log(`[UIManager] 譲渡失敗: ${to.getName()} の持物が満杯です`);
      return;
    }

    // 譲渡元から アイテムを削除（装備中の場合は自動的に装備解除される）
    const fromItemHolder = from.getItemHolder();
    const wasEquipped = fromItemHolder.getEquippedWeapon() === item;
    const removed = fromItemHolder.removeItem(item);

    if (!removed) {
      console.log(`[UIManager] 譲渡失敗: ${item.name} が ${from.getName()} の持物に見つかりません`);
      return;
    }

    // 譲渡先にアイテムを追加
    toItemHolder.addItem(item);

    if (wasEquipped) {
      console.log(`[UIManager] 装備武器を譲渡: ${item.name} の装備が解除されました`);
    }

    console.log(`[UIManager] アイテム譲渡完了: ${from.getName()} -> ${to.getName()}: ${item.name}`);

    // メッセージ表示
    this.showGuideMessage(`${item.name}を${to.getName()}に渡しました`);
  }

  public hideItemInventoryUI(): void {
    if (this.itemInventoryUI) {
      this.itemInventoryUI.destroy();
      this.itemInventoryUI = null;
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

    // WarehouseSubMenuの位置更新
    if (this.warehouseSubMenu) {
      this.warehouseSubMenu.updatePosition();
    }

    // ItemInventoryUIの位置更新
    if (this.itemInventoryUI) {
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const viewLeft = cam.worldView.x;
      const viewTop = cam.worldView.y;
      const centerX = viewLeft + viewWidth / 2;
      const centerY = viewTop + viewHeight / 2;

      this.itemInventoryUI.setPosition(centerX, centerY);
    }

    // MedicalManagerの更新
    if (this.medicalManager) {
      const armyManager = (this.scene as any).armyManager;
      if (armyManager) {
        const completedArmyNames = this.medicalManager.update(armyManager);
        // 完了した軍団ごとに通知を表示
        completedArmyNames.forEach((armyName) => {
          this.showGuideMessage(`${armyName}の治療が完了しました`);
        });
      }
    }

    // SystemInfoBarの位置更新と表示更新
    if (this.systemInfoBar) {
      const cam = this.scene.cameras.main;
      const viewTop = cam.worldView.y;
      const viewRight = cam.worldView.right;

      const barX = viewRight - 110; // 右端から110px（バーの中心）
      const barY = viewTop + 40; // 上端から40px（バーの中心）
      this.systemInfoBar.setPosition(barX, barY);

      // 所持金と収入を更新
      const playerBases = this.baseManager.getBasesByOwner('player');
      const income = this.economyManager.calculateIncomePerMinute(playerBases);
      this.systemInfoBar.updateDisplay(this.economyManager.getMoney(), income);
    }

    // モーダルUI状態に基づく自動ポーズ制御
    if (this.gameTimeManager) {
      const isAnyMenuVisible = this.isAnyMenuVisible();
      if (isAnyMenuVisible && !this.wasAnyMenuVisible) {
        // メニューが開いた → ポーズ
        this.gameTimeManager.pause();
      } else if (!isAnyMenuVisible && this.wasAnyMenuVisible) {
        // メニューが閉じた → 再開
        this.gameTimeManager.resume();
      }
      this.wasAnyMenuVisible = isAnyMenuVisible;
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

  public isWarehouseSubMenuVisible(): boolean {
    return this.warehouseSubMenu !== null;
  }

  public isItemInventoryUIVisible(): boolean {
    return this.itemInventoryUI !== null;
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

    // MedicalManagerの初期化チェック
    if (!this.medicalManager) {
      console.error('MedicalManager not initialized');
      return;
    }

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

    // 型の安全性のためローカル変数に代入
    const medicalManager = this.medicalManager;

    // 駐留軍団管理パネルを作成
    this.garrisonedArmiesPanel = new GarrisonedArmiesPanel({
      scene: this.scene,
      base,
      armies: garrisonedArmies,
      medicalManager,
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
    this.hideWarehouseSubMenu();
    this.hideItemInventoryUI();
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
    this.hideWarehouseSubMenu();
    this.hideItemInventoryUI();
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
    if (this.systemInfoBar) {
      this.systemInfoBar.destroy();
      this.systemInfoBar = null;
    }
  }
}
