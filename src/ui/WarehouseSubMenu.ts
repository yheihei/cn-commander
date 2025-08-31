import Phaser from 'phaser';
import { InventoryManager } from '../item/InventoryManager';
import { IItem, WeaponType } from '../types/ItemTypes';
import { Weapon } from '../item/Weapon';
import { Consumable } from '../item/Consumable';

export interface WarehouseSubMenuConfig {
  scene: Phaser.Scene;
  onCancel?: () => void;
}

/**
 * 倉庫サブメニュー
 * MedicalFacilityMenuと同じモーダルダイアログ形式で実装
 */
export class WarehouseSubMenu extends Phaser.GameObjects.Container {
  private modalBackground: Phaser.GameObjects.Rectangle;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private inventoryTitle: Phaser.GameObjects.Text;
  private detailTitle: Phaser.GameObjects.Text;
  private inventoryList: Phaser.GameObjects.Container;
  private detailContainer: Phaser.GameObjects.Container;
  private closeButton: Phaser.GameObjects.Container;

  private selectedItem: IItem | null = null;
  private itemSelections: Map<IItem, Phaser.GameObjects.Rectangle> = new Map();
  private inventoryManager: InventoryManager;
  private onCancelCallback?: () => void;

  constructor(config: WarehouseSubMenuConfig) {
    // カメラのズーム値を考慮（MedicalFacilityMenuと同じパターン）
    const cam = config.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    // ワールド座標系で中央に配置
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    super(config.scene, centerX, centerY);

    // ProductionManagerから同じInventoryManagerインスタンスを取得
    const productionManager = (config.scene as any).productionManager;
    if (productionManager && productionManager.getInventoryManager) {
      this.inventoryManager = productionManager.getInventoryManager();
    } else {
      // フォールバック: 新しいインスタンスを作成
      this.inventoryManager = new InventoryManager(config.scene);
      this.inventoryManager.initialize();
    }
    this.onCancelCallback = config.onCancel;

    // 画面全体を覆う半透明の背景（モーダル）
    this.modalBackground = config.scene.add.rectangle(0, 0, viewWidth, viewHeight, 0x000000, 0.5);
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景（ビューポートの90%サイズ）
    const panelWidth = viewWidth * 0.9;
    const panelHeight = viewHeight * 0.9;
    this.background = config.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.95);
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル（パネル上部）
    this.titleText = config.scene.add.text(0, -panelHeight / 2 + 20, '倉庫', {
      fontSize: '20px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 10, y: 5 },
    });
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // アイテム在庫のタイトル（左側）
    const listTitleY = -panelHeight / 2 + 60;
    this.inventoryTitle = config.scene.add.text(-panelWidth / 4, listTitleY, 'アイテム在庫', {
      fontSize: '16px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    this.inventoryTitle.setOrigin(0.5);
    this.add(this.inventoryTitle);

    // 選択アイテム詳細のタイトル（右側）
    this.detailTitle = config.scene.add.text(panelWidth / 4, listTitleY, '選択アイテム詳細', {
      fontSize: '16px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    this.detailTitle.setOrigin(0.5);
    this.add(this.detailTitle);

    // リストコンテナ
    const listStartY = listTitleY + 30;
    this.inventoryList = config.scene.add.container(-panelWidth / 4, listStartY);
    this.add(this.inventoryList);

    this.detailContainer = config.scene.add.container(panelWidth / 4, listStartY);
    this.add(this.detailContainer);

    // 閉じるボタン（パネル下部）
    const buttonY = panelHeight / 2 - 50;
    this.closeButton = this.createButton('閉じる', 0, buttonY, () => {
      this.onCancel();
    });
    this.add(this.closeButton);

    // Containerを配置
    config.scene.add.existing(this);
    this.setDepth(1000);

    // リストを初期化
    this.updateInventoryList();

    // 入力イベントの設定
    this.setupInputHandlers();
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(0, 0, 100, 35, 0x666666);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x888888);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x666666);
    });

    buttonBg.on('pointerdown', onClick);

    return button;
  }

  /**
   * アイテムタイプからItemオブジェクトを作成
   */
  private createItemFromType(itemType: string): IItem | null {
    // ProductionItemTypeの定義に基づいてアイテムを作成
    if (itemType === 'NINJA_SWORD') {
      return new Weapon({
        id: `ninja-sword-${Date.now()}`,
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '近距離武器',
      });
    } else if (itemType === 'SHURIKEN') {
      return new Weapon({
        id: `shuriken-${Date.now()}`,
        name: '手裏剣',
        weaponType: WeaponType.PROJECTILE,
        attackBonus: 5,
        minRange: 1,
        maxRange: 6,
        maxDurability: 100,
        price: 200,
        description: '投擲武器',
      });
    } else if (itemType === 'BOW') {
      return new Weapon({
        id: `bow-${Date.now()}`,
        name: '弓',
        weaponType: WeaponType.PROJECTILE,
        attackBonus: 2,
        minRange: 4,
        maxRange: 12,
        maxDurability: 100,
        price: 400,
        description: '遠距離武器',
      });
    } else if (itemType === 'FOOD_PILL') {
      return new Consumable({
        id: `food-pill-${Date.now()}`,
        name: '兵糧丸',
        effect: 'HP全快',
        maxUses: 1,
        price: 50,
        description: 'HP全快',
      });
    }

    return null;
  }

  private updateInventoryList(): void {
    // 既存のリストをクリア
    this.inventoryList.removeAll(true);
    this.itemSelections.clear();

    // 倉庫からアイテムを取得（Map<string, number>形式）
    const inventoryMap = this.inventoryManager.getAllItems();

    // アイテムタイプごとにItemオブジェクトを作成
    const itemGroups = new Map<string, { item: IItem; count: number }>();

    inventoryMap.forEach((count, itemType) => {
      if (count > 0) {
        // 最初の1つだけItemオブジェクトを作成（表示用）
        const item = this.createItemFromType(itemType);
        if (item) {
          itemGroups.set(item.name, { item, count });
        }
      }
    });

    let yOffset = 0;
    itemGroups.forEach((group) => {
      const itemContainer = this.createInventoryItem(group.item, group.count, yOffset);
      this.inventoryList.add(itemContainer);
      yOffset += 40;
    });

    // アイテムがない場合
    if (itemGroups.size === 0) {
      const noItemText = this.scene.add.text(0, 0, 'アイテムがありません', {
        fontSize: '12px',
        fontFamily: 'monospace, "Courier New", Courier',
        color: '#999999',
        align: 'center',
        resolution: 2,
        padding: { top: 5 },
      });
      noItemText.setOrigin(0.5);
      this.inventoryList.add(noItemText);
    }
  }

  private createInventoryItem(item: IItem, count: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);

    // 選択背景
    const bg = this.scene.add.rectangle(0, 0, 200, 35, 0x555555, 0.3);
    bg.setStrokeStyle(1, 0x777777);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // アイテム名と数量
    const itemText = this.scene.add.text(0, 0, `${item.name} x${count}`, {
      fontSize: '14px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { top: 2 },
    });
    itemText.setOrigin(0.5);
    container.add(itemText);

    // クリックイベント
    bg.on('pointerdown', () => {
      this.selectItem(item, bg);
    });

    bg.on('pointerover', () => {
      if (this.selectedItem !== item) {
        bg.setFillStyle(0x666666, 0.5);
      }
    });

    bg.on('pointerout', () => {
      if (this.selectedItem !== item) {
        bg.setFillStyle(0x555555, 0.3);
      }
    });

    this.itemSelections.set(item, bg);

    return container;
  }

  private selectItem(item: IItem, bg: Phaser.GameObjects.Rectangle): void {
    // 前の選択を解除
    if (this.selectedItem) {
      const prevBg = this.itemSelections.get(this.selectedItem);
      if (prevBg) {
        prevBg.setFillStyle(0x555555, 0.3);
      }
    }

    // 新しい選択
    this.selectedItem = item;
    bg.setFillStyle(0x7799ff, 0.5);

    // 詳細を更新
    this.updateItemDetail();
  }

  private updateItemDetail(): void {
    // 既存の詳細をクリア
    this.detailContainer.removeAll(true);

    if (!this.selectedItem) {
      return;
    }

    const item = this.selectedItem;
    let yOffset = 0;

    // アイテム名
    const nameText = this.scene.add.text(0, yOffset, item.name, {
      fontSize: '18px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 2 },
    });
    nameText.setOrigin(0.5);
    this.detailContainer.add(nameText);
    yOffset += 35;

    // 説明
    const displayInfo = item.getDisplayInfo();
    const descText = this.scene.add.text(0, yOffset, displayInfo.description, {
      fontSize: '12px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#cccccc',
      resolution: 2,
      wordWrap: { width: 200 },
      align: 'center',
      padding: { top: 2 },
    });
    descText.setOrigin(0.5, 0);
    this.detailContainer.add(descText);
  }

  private onCancel(): void {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.hide();
  }

  private setupInputHandlers(): void {
    // モーダル背景とメインパネルのクリック処理
    this.modalBackground.setInteractive();
    this.modalBackground.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // モーダル背景がクリックされた場合の処理
      const localX = pointer.x - this.x;
      const localY = pointer.y - this.y;
      const cam = this.scene.cameras.main;
      const zoom = cam.zoom || 2.25;
      const viewWidth = 1280 / zoom;
      const viewHeight = 720 / zoom;
      const panelWidth = viewWidth * 0.9;
      const panelHeight = viewHeight * 0.9;

      const isInsidePanel = Math.abs(localX) < panelWidth / 2 && Math.abs(localY) < panelHeight / 2;

      if (!isInsidePanel) {
        this.onCancel();
      }
    });

    // メインパネルはクリックを無視（子要素のイベントは通る）
    this.background.setInteractive();

    // 右クリックで閉じる
    const rightClickHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.onCancel();
      }
    };

    this.scene.input.on('pointerdown', rightClickHandler);
    this.once('destroy', () => {
      this.scene.input.off('pointerdown', rightClickHandler);
    });
  }

  public show(): void {
    this.setVisible(true);
    this.setActive(true);
  }

  public hide(): void {
    this.destroy();
  }

  public updatePosition(): void {
    // カメラが移動してもUIが中央に固定されるように更新
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    this.setPosition(centerX, centerY);
  }
}
