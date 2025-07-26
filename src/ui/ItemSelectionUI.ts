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
    soldierListWidth: 200,
    itemListWidth: 240,
    centerGap: 20,
    soldierRowHeight: 30,
    itemRowHeight: 45,
    headerHeight: 30,
  };

  // コンテンツコンテナ
  private contentContainer!: Phaser.GameObjects.Container;
  private soldierListContainer!: Phaser.GameObjects.Container;
  private itemListContainer!: Phaser.GameObjects.Container;

  // データ管理
  private selectedSoldier: Character | null = null;
  private soldierItemsMap: Map<Character, IItem[]> = new Map();
  private availableItems: IItem[] = [];
  private soldierRows: Map<string, Phaser.GameObjects.Container> = new Map();
  private itemRows: Map<string, Phaser.GameObjects.Container> = new Map();

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
    this.modalBackground = config.scene.add.rectangle(
      0,
      0,
      viewWidth,
      viewHeight,
      0x000000,
      0.5,
    );
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景
    const panelWidth = viewWidth * 0.9;
    const panelHeight = viewHeight * 0.9;
    this.background = config.scene.add.rectangle(
      0,
      0,
      panelWidth,
      panelHeight,
      0x222222,
      0.95,
    );
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
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
        padding: { x: 10, y: 5 },
      },
    );
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // コンテンツコンテナを作成（タイトルの下に適切なスペースを設ける）
    const titleHeight = 30;  // タイトルテキストの高さ（概算）
    const contentY = -panelHeight / 2 + this.layoutConfig.panelPadding + titleHeight + 20;  // 20は追加のマージン
    this.contentContainer = config.scene.add.container(0, contentY);
    this.add(this.contentContainer);

    // 兵士とアイテムのリストコンテナを作成
    this.createListContainers();

    // ボタンの作成
    this.createButtons(panelHeight);

    // データの初期化
    this.initializeData();

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();
  }

  private createListContainers(): void {
    // 左側：兵士リストコンテナ
    const soldierListX = -(this.layoutConfig.centerGap / 2 + this.layoutConfig.soldierListWidth / 2);
    this.soldierListContainer = this.scene.add.container(soldierListX, 0);
    this.contentContainer.add(this.soldierListContainer);

    // 右側：アイテムリストコンテナ
    const itemListX = this.layoutConfig.centerGap / 2 + this.layoutConfig.itemListWidth / 2;
    this.itemListContainer = this.scene.add.container(itemListX, 0);
    this.contentContainer.add(this.itemListContainer);

    // 兵士リストのヘッダー
    this.createSoldierListHeader();

    // アイテムリストのヘッダー
    this.createItemListHeader();
  }

  private createSoldierListHeader(): void {
    const headerText = this.scene.add.text(0, 0, '選択した兵士', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
    });
    headerText.setOrigin(0.5, 0);
    this.soldierListContainer.add(headerText);

    // ヘッダー下線
    const line = this.scene.add.rectangle(
      0,
      20,
      this.layoutConfig.soldierListWidth,
      1,
      0xffffff,
    );
    line.setOrigin(0.5, 0.5);
    this.soldierListContainer.add(line);
  }

  private createItemListHeader(): void {
    const headerText = this.scene.add.text(0, 0, '倉庫アイテム', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
    });
    headerText.setOrigin(0.5, 0);
    this.itemListContainer.add(headerText);

    // ヘッダー下線
    const line = this.scene.add.rectangle(
      0,
      20,
      this.layoutConfig.itemListWidth,
      1,
      0xffffff,
    );
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
    const proceedButtonX = this.layoutConfig.buttonWidth / 2 + this.layoutConfig.buttonSpacing / 2;
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
      fontSize: '14px',
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
    const allSoldiers: Character[] = [];
    if (this.formationData.commander) {
      allSoldiers.push(this.formationData.commander);
    }
    allSoldiers.push(...this.formationData.soldiers);

    // 各兵士の初期アイテムリストを作成（空）
    allSoldiers.forEach((soldier) => {
      this.soldierItemsMap.set(soldier, []);
    });

    // 倉庫アイテムを取得（後でBaseManagerから取得）
    this.loadInventoryItems();

    // 兵士リストを作成
    this.createSoldierRows(allSoldiers);
  }

  private loadInventoryItems(): void {
    // TODO: BaseManagerから倉庫アイテムを取得
    // 一時的にダミーデータを使用
    this.availableItems = [];
    this.updateItemList();
  }

  private createSoldierRows(soldiers: Character[]): void {
    const startY = this.layoutConfig.headerHeight + 10;

    soldiers.forEach((soldier, index) => {
      const isCommander = soldier === this.formationData.commander;
      this.createSoldierRow(soldier, 0, startY + index * this.layoutConfig.soldierRowHeight * 3, isCommander);
    });
  }

  private createSoldierRow(soldier: Character, x: number, y: number, isCommander: boolean): void {
    const rowContainer = this.scene.add.container(x, y);

    // 兵士の基本情報を表示
    const roleText = isCommander ? '（指揮官）' : '（一般兵）';
    const nameText = this.scene.add.text(-this.layoutConfig.soldierListWidth / 2 + 10, 0, 
      `▶ ${soldier.getName()}${roleText}`, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
    });
    nameText.setOrigin(0, 0);
    rowContainer.add(nameText);

    // 選択可能な領域
    const selectArea = this.scene.add.rectangle(
      0,
      0,
      this.layoutConfig.soldierListWidth,
      this.layoutConfig.soldierRowHeight,
      0x000000,
      0,
    );
    selectArea.setOrigin(0.5, 0);
    selectArea.setInteractive({ useHandCursor: true });
    rowContainer.add(selectArea);

    selectArea.on('pointerdown', () => {
      this.selectSoldier(soldier);
    });

    selectArea.on('pointerover', () => {
      if (this.selectedSoldier !== soldier) {
        selectArea.setFillStyle(0x444444, 0.3);
      }
    });

    selectArea.on('pointerout', () => {
      if (this.selectedSoldier !== soldier) {
        selectArea.setFillStyle(0x000000, 0);
      }
    });

    // 所持アイテム数
    const itemCount = this.soldierItemsMap.get(soldier)?.length || 0;
    const itemCountText = this.scene.add.text(
      this.layoutConfig.soldierListWidth / 2 - 10, 0,
      `${itemCount}/4`, {
      fontSize: '12px',
      color: '#ffffff',
      resolution: 2,
    });
    itemCountText.setOrigin(1, 0);
    rowContainer.add(itemCountText);

    // アイテムリスト（初期は非表示）
    const itemListContainer = this.scene.add.container(0, this.layoutConfig.soldierRowHeight);
    rowContainer.add(itemListContainer);

    this.soldierListContainer.add(rowContainer);
    this.soldierRows.set(soldier.getId(), rowContainer);

    // データを保存
    rowContainer.setData('soldier', soldier);
    rowContainer.setData('selectArea', selectArea);
    rowContainer.setData('itemCountText', itemCountText);
    rowContainer.setData('itemListContainer', itemListContainer);
    rowContainer.setData('nameText', nameText);
  }

  private selectSoldier(soldier: Character): void {
    // 前の選択をクリア
    if (this.selectedSoldier) {
      const prevRow = this.soldierRows.get(this.selectedSoldier.getId());
      if (prevRow) {
        const selectArea = prevRow.getData('selectArea') as Phaser.GameObjects.Rectangle;
        const nameText = prevRow.getData('nameText') as Phaser.GameObjects.Text;
        const itemListContainer = prevRow.getData('itemListContainer') as Phaser.GameObjects.Container;
        
        selectArea.setFillStyle(0x000000, 0);
        nameText.setText(nameText.text.replace('▼', '▶'));
        itemListContainer.setVisible(false);
      }
    }

    // 新しい選択
    this.selectedSoldier = soldier;
    const row = this.soldierRows.get(soldier.getId());
    if (row) {
      const selectArea = row.getData('selectArea') as Phaser.GameObjects.Rectangle;
      const nameText = row.getData('nameText') as Phaser.GameObjects.Text;
      const itemListContainer = row.getData('itemListContainer') as Phaser.GameObjects.Container;
      
      selectArea.setFillStyle(0x444444, 0.5);
      nameText.setText(nameText.text.replace('▶', '▼'));
      itemListContainer.setVisible(true);
      
      // アイテムリストを更新
      this.updateSoldierItemList(soldier, itemListContainer);
    }
  }

  private updateSoldierItemList(soldier: Character, container: Phaser.GameObjects.Container): void {
    // 既存のアイテムをクリア
    container.removeAll(true);

    const items = this.soldierItemsMap.get(soldier) || [];
    const maxItems = 4;

    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      const itemY = i * 20;

      if (item) {
        // アイテム情報を表示
        this.createItemSlot(container, item, i, itemY, soldier);
      } else {
        // 空きスロット
        const emptyText = this.scene.add.text(-this.layoutConfig.soldierListWidth / 2 + 20, itemY, `${i + 1}.[空きスロット]`, {
          fontSize: '11px',
          color: '#888888',
          resolution: 2,
        });
        emptyText.setOrigin(0, 0);
        container.add(emptyText);
      }
    }
  }

  private createItemSlot(
    container: Phaser.GameObjects.Container, 
    item: IItem, 
    index: number, 
    y: number,
    soldier: Character
  ): void {
    const itemContainer = this.scene.add.container(-this.layoutConfig.soldierListWidth / 2 + 20, y);

    // アイテム番号と名前
    let itemText = `${index + 1}.${item.name}`;
    
    // 武器の場合は耐久度を表示
    if (item.type === ItemType.WEAPON) {
      const weapon = item as IWeapon;
      itemText += `（耐久${weapon.durability}/${weapon.maxDurability}）`;
    }

    const textColor = this.isEquipped(soldier, item) ? '#ff0000' : '#ffffff';
    const itemNameText = this.scene.add.text(0, 0, itemText, {
      fontSize: '11px',
      color: textColor,
      resolution: 2,
    });
    itemNameText.setOrigin(0, 0);
    itemContainer.add(itemNameText);

    // 装備中表示
    if (this.isEquipped(soldier, item)) {
      const equippedText = this.scene.add.text(120, 0, '装備中', {
        fontSize: '10px',
        color: '#ff0000',
        resolution: 2,
      });
      equippedText.setOrigin(0, 0);
      itemContainer.add(equippedText);
    } else if (item.type === ItemType.WEAPON && !this.isEquipped(soldier, item)) {
      // 装備ボタン
      const equipButton = this.createSmallButton('[装備]', 120, 0, () => {
        this.equipWeapon(soldier, item as IWeapon);
      });
      itemContainer.add(equipButton);
    }

    // 削除ボタン
    const removeButton = this.createSmallButton('[✗]', 150, 0, () => {
      this.removeItem(soldier, index);
    });
    itemContainer.add(removeButton);

    container.add(itemContainer);
  }

  private createSmallButton(text: string, x: number, y: number, onClick: () => void): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '11px',
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

  private isEquipped(soldier: Character, item: IItem): boolean {
    // 兵士の現在の装備武器を確認
    const equippedWeapon = soldier.getItemHolder().getEquippedWeapon();
    return equippedWeapon === item;
  }

  private equipWeapon(soldier: Character, weapon: IWeapon): void {
    soldier.getItemHolder().equipWeapon(weapon);
    
    // 表示を更新
    if (this.selectedSoldier === soldier) {
      const row = this.soldierRows.get(soldier.getId());
      if (row) {
        const itemListContainer = row.getData('itemListContainer') as Phaser.GameObjects.Container;
        this.updateSoldierItemList(soldier, itemListContainer);
      }
    }
  }

  private removeItem(soldier: Character, index: number): void {
    const items = this.soldierItemsMap.get(soldier);
    if (items && items[index]) {
      const removedItem = items.splice(index, 1)[0];
      
      // アイテムを倉庫に戻す
      this.availableItems.push(removedItem);
      this.updateItemList();
      
      // 表示を更新
      this.updateSoldierDisplay(soldier);
    }
  }

  private updateSoldierDisplay(soldier: Character): void {
    const row = this.soldierRows.get(soldier.getId());
    if (row) {
      // アイテム数を更新
      const itemCountText = row.getData('itemCountText') as Phaser.GameObjects.Text;
      const itemCount = this.soldierItemsMap.get(soldier)?.length || 0;
      itemCountText.setText(`${itemCount}/4`);

      // アイテムリストを更新（選択中の場合）
      if (this.selectedSoldier === soldier) {
        const itemListContainer = row.getData('itemListContainer') as Phaser.GameObjects.Container;
        this.updateSoldierItemList(soldier, itemListContainer);
      }
    }
  }

  private updateItemList(): void {
    // 既存のアイテム行をクリア
    this.itemRows.forEach((row) => row.destroy());
    this.itemRows.clear();

    if (this.availableItems.length === 0) {
      const noItemText = this.scene.add.text(0, this.layoutConfig.headerHeight + 20, 
        'アイテムがありません', {
        fontSize: '12px',
        color: '#888888',
        resolution: 2,
      });
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

    let currentY = this.layoutConfig.headerHeight + 20;

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
    const nameText = this.scene.add.text(-this.layoutConfig.itemListWidth / 2 + 10, 0, 
      itemName, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
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

    const detailsText = this.scene.add.text(-this.layoutConfig.itemListWidth / 2 + 10, 15, 
      detailText, {
      fontSize: '10px',
      color: '#aaaaaa',
      resolution: 2,
    });
    detailsText.setOrigin(0, 0);
    rowContainer.add(detailsText);

    // 操作ヒント
    const hintText = this.scene.add.text(-this.layoutConfig.itemListWidth / 2 + 10, 28, 
      '（左クリックで追加）', {
      fontSize: '9px',
      color: '#888888',
      resolution: 2,
    });
    hintText.setOrigin(0, 0);
    rowContainer.add(hintText);

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
      const availableItem = this.availableItems.find(i => i.name === item.name && i.type === item.type);
      if (availableItem) {
        this.onItemClick(availableItem);
      }
    });

    this.itemListContainer.add(rowContainer);
    this.itemRows.set(`${item.name}_${item.type}`, rowContainer);
  }

  private onItemClick(item: IItem): void {
    if (!this.selectedSoldier) {
      // 兵士が選択されていない場合は何もしない
      return;
    }

    const soldierItems = this.soldierItemsMap.get(this.selectedSoldier);
    if (!soldierItems) return;

    // アイテム数上限チェック
    if (soldierItems.length >= 4) {
      // TODO: 上限エラーメッセージ表示
      return;
    }

    // アイテムを兵士に追加
    this.assignItem(this.selectedSoldier, item);
  }

  public assignItem(soldier: Character, item: IItem): void {
    const soldierItems = this.soldierItemsMap.get(soldier);
    if (!soldierItems || soldierItems.length >= 4 || !item) return;

    // アイテムを兵士に追加
    soldierItems.push(item);
    
    // 倉庫から削除
    const index = this.availableItems.indexOf(item);
    if (index > -1) {
      this.availableItems.splice(index, 1);
    }

    // 最初の武器は自動装備
    if (item.type === ItemType.WEAPON && soldierItems.filter(i => i.type === ItemType.WEAPON).length === 1) {
      soldier.getItemHolder().equipWeapon(item as IWeapon);
    }

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
    this.soldierRows.forEach((row) => row.destroy());
    this.soldierRows.clear();
    this.soldierItemsMap.clear();
    this.selectedSoldier = null;
    this.initializeData();
  }

  public updateInventory(items: IItem[]): void {
    this.availableItems = items;
    this.updateItemList();
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 行のクリーンアップ
    this.soldierRows.forEach((row) => row.destroy());
    this.soldierRows.clear();

    this.itemRows.forEach((row) => row.destroy());
    this.itemRows.clear();

    // 親クラスのdestroy
    super.destroy();
  }
}