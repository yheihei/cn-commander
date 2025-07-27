import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { Character } from '../character/Character';
import { IItem, IWeapon, IConsumable, ItemType } from '../types/ItemTypes';
import { FormationData } from './ArmyFormationUI';

export interface ItemSelectionUIConfig {
  scene: Phaser.Scene;
  base: Base;
  formationData: FormationData;
  onProceedToDeployment?: (data: ItemEquippedFormationData) => void;
  onBack?: () => void;
  onCancelled?: () => void;
}

export interface ItemEquippedFormationData {
  commander: Character;
  soldiers: Character[];
  items: Map<Character, IItem[]>;
}

export class ItemSelectionUI extends Phaser.GameObjects.Container {
  private formationData: FormationData;
  private onProceedCallback?: (data: ItemEquippedFormationData) => void;
  private onBackCallback?: () => void;

  // UI要素
  private background: Phaser.GameObjects.Rectangle;
  private modalBackground: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // レイアウト設定（中央集約管理）
  private readonly layoutConfig = {
    panelPadding: 20,
    buttonHeight: 40,
    buttonWidth: 100,
    buttonSpacing: 20,
    soldierAreaWidth: 200,
    itemListWidth: 240,
    centerGap: 20,
    itemRowHeight: 35,
    headerHeight: 30,
    faceImageSize: 64,
    navButtonSize: 15,
  };

  // コンテンツコンテナ
  private contentContainer!: Phaser.GameObjects.Container;
  private currentSoldierContainer!: Phaser.GameObjects.Container;
  private itemListContainer!: Phaser.GameObjects.Container;

  // データ管理
  private currentSoldierIndex: number = 0;
  private allSoldiers: Character[] = [];
  private soldierItemsMap: Map<Character, IItem[]> = new Map();
  private availableItems: IItem[] = [];
  private itemRows: Map<string, Phaser.GameObjects.Container> = new Map();

  // UI要素
  private prevButton!: Phaser.GameObjects.Container;
  private nextButton!: Phaser.GameObjects.Container;
  private soldierNameText!: Phaser.GameObjects.Text;
  private itemsContainer!: Phaser.GameObjects.Container;

  // ボタン
  private backButton!: Phaser.GameObjects.Container;
  private proceedButton!: Phaser.GameObjects.Container;

  constructor(config: ItemSelectionUIConfig) {
    // カメラのズーム値を考慮
    const cam = config.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    // 他の固定UIと同じパターンでワールド座標系に配置
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    super(config.scene, centerX, centerY);

    // テスト環境での互換性のため、sceneを明示的に設定
    if (!this.scene) {
      (this as any).scene = config.scene;
    }

    this.formationData = config.formationData;
    this.onProceedCallback = config.onProceedToDeployment;
    this.onBackCallback = config.onBack;

    // 画面全体を覆う半透明の背景
    this.modalBackground = config.scene.add.rectangle(0, 0, viewWidth, viewHeight, 0x000000, 0.5);
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景
    const panelWidth = viewWidth * 0.9;
    const panelHeight = viewHeight * 0.9;
    this.background = config.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.95);
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル
    const titleText = `軍団編成 - アイテム選択`;
    this.titleText = config.scene.add.text(
      0,
      -panelHeight / 2 + this.layoutConfig.panelPadding,
      titleText,
      {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
        padding: { x: 10, y: 5 },
      },
    );
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // コンテンツコンテナを作成（タイトルの下に適切なスペースを設ける）
    const titleHeight = 30; // タイトルテキストの高さ（概算）
    const contentY = -panelHeight / 2 + this.layoutConfig.panelPadding + titleHeight + 20; // 20は追加のマージン
    this.contentContainer = config.scene.add.container(0, contentY);
    this.add(this.contentContainer);

    // 兵士とアイテムのリストコンテナを作成
    this.createListContainers();

    // ボタンの作成
    this.createButtons(panelHeight);

    // データの初期化
    this.initializeData();

    // 最初の兵士を表示
    this.displayCurrentSoldier();

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();
  }

  private createListContainers(): void {
    // 左側：現在の兵士コンテナ
    const soldierAreaX = -(
      this.layoutConfig.centerGap / 2 +
      this.layoutConfig.soldierAreaWidth / 2
    );
    this.currentSoldierContainer = this.scene.add.container(soldierAreaX, 0);
    this.contentContainer.add(this.currentSoldierContainer);

    // 右側：アイテムリストコンテナ
    const itemListX = this.layoutConfig.centerGap / 2 + this.layoutConfig.itemListWidth / 2;
    this.itemListContainer = this.scene.add.container(itemListX, 0);
    this.contentContainer.add(this.itemListContainer);

    // 兵士エリアのヘッダーとナビゲーション
    this.createSoldierHeader();

    // アイテムリストのヘッダー
    this.createItemListHeader();
  }

  private createSoldierHeader(): void {
    // ナビゲーションボタンとヘッダーのコンテナ
    const headerY = 0;

    // 前へボタン
    this.prevButton = this.createNavigationButton(
      '◀',
      -this.layoutConfig.soldierAreaWidth / 2 + 8,
      headerY,
      () => {
        this.navigateToPreviousSoldier();
      },
    );
    this.currentSoldierContainer.add(this.prevButton);

    // 兵士名表示
    this.soldierNameText = this.scene.add.text(0, headerY, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 0, top: 5 },
    });
    this.soldierNameText.setOrigin(0.5, 0.5);
    this.currentSoldierContainer.add(this.soldierNameText);

    // 次へボタン
    this.nextButton = this.createNavigationButton(
      '▶',
      this.layoutConfig.soldierAreaWidth / 2 - 8,
      headerY,
      () => {
        this.navigateToNextSoldier();
      },
    );
    this.currentSoldierContainer.add(this.nextButton);

    // ヘッダー下線
    const line = this.scene.add.rectangle(0, 20, this.layoutConfig.soldierAreaWidth, 1, 0xffffff);
    line.setOrigin(0.5, 0.5);
    this.currentSoldierContainer.add(line);

    // 兵士詳細表示エリア
    const soldierDetailsY = 30;

    // アイテムリストコンテナ
    this.itemsContainer = this.scene.add.container(
      -this.layoutConfig.soldierAreaWidth / 2,
      soldierDetailsY,
    );
    this.currentSoldierContainer.add(this.itemsContainer);

    // 「所持アイテム:」ラベル
    const itemsLabel = this.scene.add.text(0, -20, '所持アイテム:', {
      fontSize: '12px',
      color: '#ffffff',
      resolution: 2,
    });
    itemsLabel.setOrigin(0, 0);
    this.itemsContainer.add(itemsLabel);
  }

  private createItemListHeader(): void {
    const headerText = this.scene.add.text(0, 0, '倉庫アイテム', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 0, y: 5 },
    });
    headerText.setOrigin(0.5, 0);
    this.itemListContainer.add(headerText);

    // ヘッダー下線
    const line = this.scene.add.rectangle(0, 20, this.layoutConfig.itemListWidth, 1, 0xffffff);
    line.setOrigin(0.5, 0.5);
    this.itemListContainer.add(line);
  }

  private createButtons(panelHeight: number): void {
    // ボタンをパネルの下部に配置（ArmyFormationUIと同じ位置）
    const buttonY = panelHeight / 2 - this.layoutConfig.buttonHeight;

    // 戻るボタン
    const backButtonX = -this.layoutConfig.buttonWidth / 2 - this.layoutConfig.buttonSpacing / 2;
    this.backButton = this.createButton('戻る', backButtonX, buttonY, () => {
      this.onBack();
    });
    this.add(this.backButton);

    // 出撃位置選択へ進むボタン
    const proceedButtonX = this.layoutConfig.buttonWidth / 2 + this.layoutConfig.buttonSpacing / 2 + 15;
    this.proceedButton = this.createButton('出撃位置選択', proceedButtonX, buttonY, () => {
      this.onProceed();
    });
    this.add(this.proceedButton);
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(
      0,
      0,
      this.layoutConfig.buttonWidth + (text === '出撃位置選択' ? 30 : 0),
      this.layoutConfig.buttonHeight,
      0x555555,
    );
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, top: 5 },
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x777777);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x555555);
    });

    buttonBg.on('pointerdown', onClick);

    return button;
  }

  private setupInputHandlers(): void {
    // モーダル背景のクリックを無効化
    this.modalBackground.setInteractive();
    this.modalBackground.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // メインパネルのクリックも伝播を止める
    this.background.setInteractive();
    this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });
  }

  private initializeData(): void {
    // FormationDataから兵士リストを作成
    this.allSoldiers = [];
    if (this.formationData.commander) {
      this.allSoldiers.push(this.formationData.commander);
    }
    this.allSoldiers.push(...this.formationData.soldiers);

    // 各兵士の初期アイテムリストを作成（空）
    this.allSoldiers.forEach((soldier) => {
      this.soldierItemsMap.set(soldier, []);
    });

    // 倉庫アイテムを取得（後でBaseManagerから取得）
    this.loadInventoryItems();

    // 現在のインデックスを初期化
    this.currentSoldierIndex = 0;
  }

  private loadInventoryItems(): void {
    // TODO: BaseManagerから倉庫アイテムを取得
    // 一時的にダミーデータを使用
    this.availableItems = [];
    this.updateItemList();
  }

  private displayCurrentSoldier(): void {
    if (this.allSoldiers.length === 0) return;

    const currentSoldier = this.allSoldiers[this.currentSoldierIndex];

    // 兵士名を更新（職業名付き）
    const jobName = this.getJobDisplayName(currentSoldier.getJobType());
    this.soldierNameText.setText(`${currentSoldier.getName()}（${jobName}）`);

    // アイテムリストを更新
    this.updateCurrentSoldierItems();
  }

  private navigateToPreviousSoldier(): void {
    if (this.allSoldiers.length <= 1) return;

    this.currentSoldierIndex--;
    if (this.currentSoldierIndex < 0) {
      this.currentSoldierIndex = this.allSoldiers.length - 1;
    }

    this.displayCurrentSoldier();
  }

  private navigateToNextSoldier(): void {
    if (this.allSoldiers.length <= 1) return;

    this.currentSoldierIndex++;
    if (this.currentSoldierIndex >= this.allSoldiers.length) {
      this.currentSoldierIndex = 0;
    }

    this.displayCurrentSoldier();
  }

  private updateCurrentSoldierItems(): void {
    // 既存のアイテムをクリア
    this.itemsContainer.removeAll(true);

    const currentSoldier = this.allSoldiers[this.currentSoldierIndex];
    const items = this.soldierItemsMap.get(currentSoldier) || [];
    const maxItems = 4;

    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      const itemY = i * 20;

      if (item) {
        // アイテム情報を表示
        this.createItemSlot(this.itemsContainer, item, i, itemY, currentSoldier);
      } else {
        // 空きスロット
        const emptyText = this.scene.add.text(0, itemY, `${i + 1}.[空きスロット]`, {
          fontSize: '8px',
          color: '#888888',
          resolution: 2,
          padding: { x: 0, top: 2 },
        });
        emptyText.setOrigin(0, 0);
        this.itemsContainer.add(emptyText);
      }
    }
  }

  private createItemSlot(
    container: Phaser.GameObjects.Container,
    item: IItem,
    index: number,
    y: number,
    soldier: Character,
  ): void {
    const itemContainer = this.scene.add.container(0, y);

    // アイテム番号と名前
    let itemText = `${index + 1}.${item.name}`;

    // 武器の場合は耐久度を表示
    if (item.type === ItemType.WEAPON) {
      const weapon = item as IWeapon;
      itemText += `（${weapon.durability}/${weapon.maxDurability}）`;
    }

    const textColor = this.isEquipped(soldier, item) ? '#ff0000' : '#ffffff';
    const itemNameText = this.scene.add.text(0, 0, itemText, {
      fontSize: '8px',
      color: textColor,
      resolution: 2,
      padding: { x: 0, top: 2 },
    });
    itemNameText.setOrigin(0, 0);
    itemContainer.add(itemNameText);

    // 装備中表示
    if (this.isEquipped(soldier, item)) {
      const equippedText = this.scene.add.text(150, 0, '装備中', {
        fontSize: '8px',
        color: '#ff0000',
        resolution: 2,
        padding: { x: 0, top: 2 },
      });
      equippedText.setOrigin(0, 0);
      itemContainer.add(equippedText);
    } else if (item.type === ItemType.WEAPON && !this.isEquipped(soldier, item)) {
      // 装備ボタン
      const equipButton = this.createSmallButton('[装備]', 150, 0, () => {
        this.equipWeapon(soldier, item as IWeapon);
      });
      itemContainer.add(equipButton);
    }

    // 削除ボタン
    const removeButton = this.createSmallButton('[✗]', 180, 0, () => {
      this.removeItem(soldier, index);
    });
    itemContainer.add(removeButton);

    container.add(itemContainer);
  }

  private createSmallButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '8px',
      color: '#88ccff',
      resolution: 2,
    });
    buttonText.setOrigin(0, 0);
    buttonText.setInteractive({ useHandCursor: true });

    buttonText.on('pointerover', () => {
      buttonText.setColor('#ffffff');
    });

    buttonText.on('pointerout', () => {
      buttonText.setColor('#88ccff');
    });

    buttonText.on('pointerdown', onClick);

    button.add(buttonText);
    return button;
  }

  private createNavigationButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(
      0,
      0,
      this.layoutConfig.navButtonSize,
      this.layoutConfig.navButtonSize,
      0x555555,
    );
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '10px',
      color: '#ffffff',
      resolution: 2,
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x777777);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x555555);
    });

    buttonBg.on('pointerdown', onClick);

    return button;
  }

  private isEquipped(soldier: Character, item: IItem): boolean {
    // 兵士の現在の装備武器を確認
    const equippedWeapon = soldier.getItemHolder().getEquippedWeapon();
    return equippedWeapon === item;
  }

  private equipWeapon(soldier: Character, weapon: IWeapon): void {
    soldier.getItemHolder().equipWeapon(weapon);

    // 表示を更新
    if (this.allSoldiers[this.currentSoldierIndex] === soldier) {
      this.updateCurrentSoldierItems();
    }
  }

  private removeItem(soldier: Character, index: number): void {
    const items = this.soldierItemsMap.get(soldier);
    if (items && items[index]) {
      const removedItem = items.splice(index, 1)[0];

      // 兵士のItemHolderからも削除
      soldier.getItemHolder().removeItem(removedItem);

      // アイテムを倉庫に戻す
      this.availableItems.push(removedItem);
      this.updateItemList();

      // 表示を更新
      if (this.allSoldiers[this.currentSoldierIndex] === soldier) {
        this.updateCurrentSoldierItems();
      }
    }
  }

  private updateSoldierDisplay(soldier: Character): void {
    // 現在表示中の兵士の場合のみ更新
    if (this.allSoldiers[this.currentSoldierIndex] === soldier) {
      this.updateCurrentSoldierItems();
    }
  }

  private updateItemList(): void {
    // 既存のアイテム行をクリア
    this.itemRows.forEach((row) => row.destroy());
    this.itemRows.clear();

    if (this.availableItems.length === 0) {
      const noItemText = this.scene.add.text(
        0,
        this.layoutConfig.headerHeight + 20,
        '',
        {
          fontSize: '10px',
          color: '#888888',
          resolution: 2,
        },
      );
      noItemText.setOrigin(0.5, 0);
      this.itemListContainer.add(noItemText);
      return;
    }

    // アイテムを種類別にグループ化
    const itemGroups = new Map<string, { item: IItem; count: number }>();

    this.availableItems.forEach((item) => {
      const key = `${item.name}_${item.type}`;
      const existing = itemGroups.get(key);
      if (existing) {
        existing.count++;
      } else {
        itemGroups.set(key, { item, count: 1 });
      }
    });

    let currentY = this.layoutConfig.headerHeight;

    // アイテムグループを表示
    itemGroups.forEach((group) => {
      this.createItemGroupRow(group.item, group.count, currentY);
      currentY += this.layoutConfig.itemRowHeight;
    });
  }

  private createItemGroupRow(item: IItem, count: number, y: number): void {
    const rowContainer = this.scene.add.container(0, y);

    // アイテム名と在庫数
    const itemName = `${item.name} x${count}`;
    const nameText = this.scene.add.text(-this.layoutConfig.itemListWidth / 2 + 10, 0, itemName, {
      fontSize: '8px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 0, top: 2 },
    });
    nameText.setOrigin(0, 0);
    rowContainer.add(nameText);

    // アイテムの詳細情報
    let detailText = '';
    if (item.type === ItemType.WEAPON) {
      const weapon = item as IWeapon;
      detailText = `攻撃力+${weapon.attackBonus}、射程${weapon.minRange}-${weapon.maxRange}`;
    } else if (item.type === ItemType.CONSUMABLE) {
      const consumable = item as IConsumable;
      detailText = `${consumable.effect}、使用回数${consumable.maxUses}`;
    }

    const detailsText = this.scene.add.text(
      -this.layoutConfig.itemListWidth / 2 + 10,
      15,
      detailText,
      {
        fontSize: '8px',
        color: '#aaaaaa',
        resolution: 2,
        padding: { x: 0, top: 2 },
      },
    );
    detailsText.setOrigin(0, 0);
    rowContainer.add(detailsText);

    // クリック領域
    const clickArea = this.scene.add.rectangle(
      0,
      this.layoutConfig.itemRowHeight / 2 - 5,
      this.layoutConfig.itemListWidth,
      this.layoutConfig.itemRowHeight - 5,
      0x000000,
      0,
    );
    clickArea.setOrigin(0.5, 0.5);
    clickArea.setInteractive({ useHandCursor: true });
    rowContainer.add(clickArea);

    clickArea.on('pointerover', () => {
      clickArea.setFillStyle(0x444444, 0.3);
    });

    clickArea.on('pointerout', () => {
      clickArea.setFillStyle(0x000000, 0);
    });

    clickArea.on('pointerdown', () => {
      // 同じ種類のアイテムから1つを取得
      const availableItem = this.availableItems.find(
        (i) => i.name === item.name && i.type === item.type,
      );
      if (availableItem) {
        this.onItemClick(availableItem);
      }
    });

    this.itemListContainer.add(rowContainer);
    this.itemRows.set(`${item.name}_${item.type}`, rowContainer);
  }

  private onItemClick(item: IItem): void {
    const currentSoldier = this.allSoldiers[this.currentSoldierIndex];
    const soldierItems = this.soldierItemsMap.get(currentSoldier);
    if (!soldierItems) return;

    // アイテム数上限チェック
    if (soldierItems.length >= 4) {
      // TODO: 上限エラーメッセージ表示
      return;
    }

    // アイテムを兵士に追加
    this.assignItem(currentSoldier, item);
  }

  public assignItem(soldier: Character, item: IItem): void {
    const soldierItems = this.soldierItemsMap.get(soldier);
    if (!soldierItems || soldierItems.length >= 4 || !item) return;

    // アイテムを兵士のItemHolderに追加
    const added = soldier.getItemHolder().addItem(item);
    if (!added) {
      // アイテムの追加に失敗（上限に達している等）
      return;
    }

    // UIの状態管理用マップにも追加
    soldierItems.push(item);

    // 倉庫から削除
    const index = this.availableItems.indexOf(item);
    if (index > -1) {
      this.availableItems.splice(index, 1);
    }

    // 注：ItemHolderのaddItemメソッドが自動的に最初の武器を装備してくれる

    // 表示を更新
    this.updateSoldierDisplay(soldier);
    this.updateItemList();
  }

  private onBack(): void {
    if (this.onBackCallback) {
      this.onBackCallback();
    }
    this.destroy();
  }

  private onProceed(): void {
    if (this.onProceedCallback) {
      const itemEquippedData: ItemEquippedFormationData = {
        commander: this.formationData.commander!,
        soldiers: this.formationData.soldiers,
        items: this.soldierItemsMap,
      };
      this.onProceedCallback(itemEquippedData);
    }
  }

  public show(): void {
    this.setVisible(true);
  }

  public hide(): void {
    this.setVisible(false);
  }

  public setFormationData(data: FormationData): void {
    this.formationData = data;
    // データを再初期化
    this.soldierItemsMap.clear();
    this.currentSoldierIndex = 0;
    this.initializeData();
    this.displayCurrentSoldier();
  }

  public updateInventory(items: IItem[]): void {
    this.availableItems = items;
    this.updateItemList();
  }

  private getJobDisplayName(jobType: string): string {
    const jobNames: { [key: string]: string } = {
      wind: '風忍',
      iron: '鉄忍',
      shadow: '影忍',
      medicine: '薬忍',
    };
    return jobNames[jobType] || jobType;
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 行のクリーンアップ
    this.itemRows.forEach((row) => row.destroy());
    this.itemRows.clear();

    // 親クラスのdestroy
    super.destroy();
  }
}
