import { Army } from '../army/Army';
import { Character } from '../character/Character';
import { IItem, ItemType, IWeapon, IConsumable } from '../types/ItemTypes';

export interface ItemInventoryConfig {
  scene: Phaser.Scene;
  army: Army;
  onClose?: () => void;
  onUseItem?: (character: Character, item: IConsumable) => void;
  onEquipWeapon?: (character: Character, weapon: IWeapon) => void;
  onTransferItem?: (from: Character, to: Character, item: IItem) => void;
}

interface ItemButtonState {
  use: {
    enabled: boolean;
    text: string;
    callback?: () => void;
  };
  equip: {
    enabled: boolean;
    text: string;
    callback?: () => void;
  };
  transfer: {
    enabled: boolean;
    text: string;
    callback?: () => void;
  };
}

// テスト環境での型定義
declare const Phaser: any;

// テスト環境でPhaserが未定義の場合のフォールバック
const PhaserContainer =
  typeof Phaser !== 'undefined' && Phaser.GameObjects?.Container
    ? Phaser.GameObjects.Container
    : (class MockContainer {
        constructor(_scene: any, _x: number, _y: number) {}
        setDepth(_depth: number) {
          return this;
        }
        add(_child: any) {
          return this;
        }
        destroy() {}
      } as any);

/**
 * 持物管理UI
 * 軍団メンバーの持物を表示し、使用・装備・譲渡の操作を提供
 */
export class ItemInventoryUI extends PhaserContainer {
  private readonly army: Army;
  private readonly phaserScene: Phaser.Scene; // sceneを明示的に保存
  private readonly onCloseCallback?: () => void;
  private readonly onUseItemCallback?: (character: Character, item: IConsumable) => void;
  private readonly onEquipWeaponCallback?: (character: Character, weapon: IWeapon) => void;
  private readonly onTransferItemCallback?: (from: Character, to: Character, item: IItem) => void;

  // UI要素
  private modalBackground!: Phaser.GameObjects.Rectangle;
  private background!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private closeButton!: Phaser.GameObjects.Container;

  // キャラクター表示
  private characterNameText!: Phaser.GameObjects.Text;
  private prevCharButton!: Phaser.GameObjects.Container;
  private nextCharButton!: Phaser.GameObjects.Container;

  // アイテム表示
  private itemListContainer!: Phaser.GameObjects.Container;
  private itemContainers: Phaser.GameObjects.Container[] = [];

  // 状態管理
  private currentCharacterIndex: number = 0;
  private armyMembers: Character[] = [];

  // 譲渡UI関連
  private transferTargetSelectContainer?: Phaser.GameObjects.Container;
  private transferringItem?: IItem;
  private transferringCharacter?: Character;

  // レイアウト設定
  private readonly layoutConfig = {
    padding: 20,
    headerHeight: 40,
    characterHeight: 25,
    itemHeight: 25,
    buttonWidth: 40,
    buttonHeight: 18,
    buttonSpacing: 5,
  };

  constructor(config: ItemInventoryConfig) {
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

    this.phaserScene = config.scene; // sceneを保存
    this.army = config.army;
    this.onCloseCallback = config.onClose;
    this.onUseItemCallback = config.onUseItem;
    this.onEquipWeaponCallback = config.onEquipWeapon;
    this.onTransferItemCallback = config.onTransferItem;

    // 軍団メンバーを取得
    this.initializeArmyMembers();

    // UI要素を作成
    this.createModalBackground();
    this.createMainPanel();
    this.createHeader();
    this.createCharacterSelector();
    this.createItemList();
    this.createCloseButton();

    // 入力イベントを設定
    this.setupInputHandlers();

    // 初期表示
    this.updateDisplay();

    // シーンに追加
    config.scene.add.existing(this as any);
    this.setDepth(1000);
  }

  private initializeArmyMembers(): void {
    console.log(`[ItemInventoryUI] 軍団メンバー初期化開始`);
    const commander = this.army.getCommander();
    const soldiers = this.army.getSoldiers();

    console.log(
      `[ItemInventoryUI] 指揮官: ${commander ? commander.getName() + ' (' + commander.getJobType() + ')' : 'なし'}`,
    );
    console.log(`[ItemInventoryUI] 一般兵数: ${soldiers.length}`);
    soldiers.forEach((soldier, index) => {
      console.log(
        `[ItemInventoryUI] 一般兵${index + 1}: ${soldier.getName()} (${soldier.getJobType()})`,
      );
    });

    this.armyMembers = [];
    if (commander) {
      this.armyMembers.push(commander);
    }
    this.armyMembers.push(...soldiers);

    console.log(
      `[ItemInventoryUI] 軍団メンバー初期化完了: 総メンバー数=${this.armyMembers.length}`,
    );
  }

  private createModalBackground(): void {
    // カメラのズーム値を考慮
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    this.modalBackground = this.phaserScene.add.rectangle(
      0,
      0,
      viewWidth,
      viewHeight,
      0x000000,
      0.5,
    );
    this.modalBackground.setInteractive();
    this.add(this.modalBackground);
  }

  private createMainPanel(): void {
    // カメラのズーム値を考慮
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    // ArmyFormationUIと同じサイズ（90%）
    const panelWidth = viewWidth * 0.9;
    const panelHeight = viewHeight * 0.9;

    this.background = this.phaserScene.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.95);
    this.background.setStrokeStyle(3, 0xffffff);
    this.add(this.background);

    // パネルサイズを保存（他のメソッドで使用）
    (this as any).panelWidth = panelWidth;
    (this as any).panelHeight = panelHeight;
  }

  private createHeader(): void {
    const { padding } = this.layoutConfig;
    const panelHeight = (this as any).panelHeight;
    const titleY = Math.round(-panelHeight / 2 + padding);

    this.titleText = this.phaserScene.add.text(0, titleY, '持物', {
      fontSize: '14px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    this.titleText.setOrigin(0.5, 0);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (this.titleText.setPosition) {
      this.titleText.setPosition(Math.round(this.titleText.x), Math.round(this.titleText.y));
    }
    this.add(this.titleText);
  }

  private createCharacterSelector(): void {
    const { padding, headerHeight } = this.layoutConfig;
    const panelHeight = (this as any).panelHeight;

    const selectorY = Math.round(-panelHeight / 2 + headerHeight + padding);

    // キャラクター名を「< キャラクター名 >」形式で表示
    this.characterNameText = this.phaserScene.add.text(0, selectorY, '', {
      fontSize: '12px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    this.characterNameText.setOrigin(0.5, 0.5);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (this.characterNameText.setPosition) {
      this.characterNameText.setPosition(
        Math.round(this.characterNameText.x),
        Math.round(this.characterNameText.y),
      );
    }
    this.add(this.characterNameText);

    // 前のキャラクターボタン（非表示、クリックでキャラクター切り替え）
    console.log(`[ItemInventoryUI] 前のキャラクターボタン作成: x=-100, y=${selectorY}, size=50x30`);
    this.prevCharButton = this.createPageButton('<', -100, selectorY, 40, 30, () =>
      this.selectPreviousCharacter(),
    );
    this.add(this.prevCharButton);
    console.log(`[ItemInventoryUI] 前のキャラクターボタンをコンテナに追加完了`);

    // 次のキャラクターボタン（非表示、クリックでキャラクター切り替え）
    console.log(`[ItemInventoryUI] 次のキャラクターボタン作成: x=100, y=${selectorY}, size=50x30`);
    this.nextCharButton = this.createPageButton('>', 100, selectorY, 40, 30, () =>
      this.selectNextCharacter(),
    );
    this.add(this.nextCharButton);
    console.log(`[ItemInventoryUI] 次のキャラクターボタンをコンテナに追加完了`);
  }

  private createItemList(): void {
    const { padding, headerHeight, characterHeight } = this.layoutConfig;
    const panelHeight = (this as any).panelHeight;

    const listY = -panelHeight / 2 + headerHeight + characterHeight + padding * 2;

    this.itemListContainer = this.phaserScene.add.container(0, listY);
    this.add(this.itemListContainer);
  }

  private createCloseButton(): void {
    const panelHeight = (this as any).panelHeight;

    // 「とじる」ボタンを下部中央に配置
    const buttonY = panelHeight / 2 - 50;

    this.closeButton = this.createSmallButton('とじる', 0, buttonY, () => this.close());
    this.add(this.closeButton);
  }

  private createSmallButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(x, y);

    // サイズを調整
    const width = text === 'とじる' ? 60 : 30;
    const height = text === 'とじる' ? 25 : 30;

    const bg = this.phaserScene.add.rectangle(0, 0, width, height, 0x555555);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setInteractive({ useHandCursor: true });

    const label = this.phaserScene.add.text(0, 0, text, {
      fontSize: '10px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    label.setOrigin(0.5);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (label.setPosition) {
      label.setPosition(Math.round(label.x), Math.round(label.y));
    }

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setFillStyle(0x777777));
    bg.on('pointerout', () => bg.setFillStyle(0x555555));
    bg.on('pointerdown', onClick);

    return container;
  }

  private createPageButton(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.phaserScene.add.container(x, y);

    const bg = this.phaserScene.add.rectangle(0, 0, width, height, 0x4682b4);
    bg.setOrigin(0.5, 0.5);
    bg.setInteractive({ useHandCursor: true });

    const label = this.phaserScene.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
      resolution: 2,
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0x5f9fd3));
    bg.on('pointerout', () => bg.setFillStyle(0x4682b4));

    button.setDepth(10); // メインパネルより前面に配置

    return button;
  }

  private createActionButton(
    text: string,
    x: number,
    y: number,
    enabled: boolean,
    onClick?: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(x, y);
    const { buttonWidth, buttonHeight } = this.layoutConfig;

    const bgColor = enabled ? 0x555555 : 0x333333;
    const textColor = enabled ? '#ffffff' : '#666666';

    const bg = this.phaserScene.add.rectangle(0, 0, buttonWidth, buttonHeight, bgColor);
    bg.setStrokeStyle(2, enabled ? 0xaaaaaa : 0x555555);

    if (enabled && onClick) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x777777));
      bg.on('pointerout', () => bg.setFillStyle(0x555555));
      bg.on('pointerdown', onClick);
    }

    const label = this.phaserScene.add.text(0, 0, text, {
      fontSize: '10px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: textColor,
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    label.setOrigin(0.5);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (label.setPosition) {
      label.setPosition(Math.round(label.x), Math.round(label.y));
    }

    container.add([bg, label]);
    return container;
  }

  private selectPreviousCharacter(): void {
    console.log(`[ItemInventoryUI] 前のキャラクターボタンクリック検出`);
    console.log(`[ItemInventoryUI] 軍団メンバー数: ${this.armyMembers.length}`);

    // メンバーリストの詳細出力
    this.armyMembers.forEach((member, index) => {
      console.log(
        `[ItemInventoryUI] メンバー${index}: ${member.getName()} (${member.getJobType()})`,
      );
    });

    if (this.armyMembers.length <= 1) {
      console.log(`[ItemInventoryUI] メンバー数が1以下のため、ページネーション無効`);
      return;
    }

    const beforeIndex = this.currentCharacterIndex;
    this.currentCharacterIndex--;
    if (this.currentCharacterIndex < 0) {
      this.currentCharacterIndex = this.armyMembers.length - 1;
    }
    console.log(
      `[ItemInventoryUI] インデックス変更: ${beforeIndex} -> ${this.currentCharacterIndex}`,
    );
    this.updateDisplay();
  }

  private selectNextCharacter(): void {
    console.log(`[ItemInventoryUI] 次のキャラクターボタンクリック検出`);
    console.log(`[ItemInventoryUI] 軍団メンバー数: ${this.armyMembers.length}`);

    if (this.armyMembers.length <= 1) {
      console.log(`[ItemInventoryUI] メンバー数が1以下のため、ページネーション無効`);
      return;
    }

    const beforeIndex = this.currentCharacterIndex;
    this.currentCharacterIndex++;
    if (this.currentCharacterIndex >= this.armyMembers.length) {
      this.currentCharacterIndex = 0;
    }
    console.log(
      `[ItemInventoryUI] インデックス変更: ${beforeIndex} -> ${this.currentCharacterIndex}`,
    );
    this.updateDisplay();
  }

  private updateDisplay(): void {
    console.log(`[ItemInventoryUI] updateDisplay() 実行開始`);
    console.log(`[ItemInventoryUI] 現在のインデックス: ${this.currentCharacterIndex}`);

    if (this.armyMembers.length === 0) {
      console.log(`[ItemInventoryUI] 軍団メンバーが0のため、表示更新をスキップ`);
      return;
    }

    const currentCharacter = this.armyMembers[this.currentCharacterIndex];
    console.log(
      `[ItemInventoryUI] 表示対象キャラクター: ${currentCharacter.getName()} (${currentCharacter.getJobType()})`,
    );

    // キャラクター名を「< キャラクター名 >」形式で表示
    const displayName = `< ${currentCharacter.getName()} >`;
    console.log(`[ItemInventoryUI] 表示名更新: "${displayName}"`);
    this.characterNameText.setText(displayName);

    // アイテムリストを更新
    this.updateItemList(currentCharacter);
    console.log(`[ItemInventoryUI] updateDisplay() 実行完了`);
  }

  private updateItemList(character: Character): void {
    // 既存のアイテム表示をクリア
    this.itemContainers.forEach((container) => container.destroy());
    this.itemContainers = [];
    // テスト環境でremoveAllが存在しない場合は省略
    if (this.itemListContainer.removeAll) {
      this.itemListContainer.removeAll();
    }

    const itemHolder = character.getItemHolder();
    const items = itemHolder.items;

    // 最大4つのアイテムスロットを表示
    const maxSlots = 4;
    let currentY = 0;

    for (let i = 0; i < maxSlots; i++) {
      const item = items[i];

      if (item) {
        const itemContainer = this.createItemSlot(item, character, currentY);
        this.itemListContainer.add(itemContainer);
        this.itemContainers.push(itemContainer);
      } else {
        const emptySlot = this.createEmptySlot(i + 1, currentY);
        this.itemListContainer.add(emptySlot);
        this.itemContainers.push(emptySlot);
      }

      currentY += this.layoutConfig.itemHeight + 2;
    }
  }

  private createItemSlot(
    item: IItem,
    character: Character,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(0, y);
    const { padding, buttonWidth, buttonSpacing } = this.layoutConfig;
    const panelWidth = (this as any).panelWidth;

    // スロット番号を取得
    const itemHolder = character.getItemHolder();
    const slotIndex = itemHolder.items.indexOf(item) + 1;
    const isEquipped = itemHolder.getEquippedWeapon() === item;

    // アイテム名
    let itemText = `${slotIndex}. ${item.name}`;
    if (item.type === ItemType.WEAPON) {
      const weapon = item as IWeapon;
      itemText += `(${weapon.durability}/${weapon.maxDurability})`;
    }
    // 装備中の場合は【装備中】を追加
    if (isEquipped) {
      itemText += '【装備中】';
    }

    const nameText = this.phaserScene.add.text(Math.round(-panelWidth / 2 + padding), 0, itemText, {
      fontSize: '10px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    nameText.setOrigin(0, 0.5);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (nameText.setPosition) {
      nameText.setPosition(Math.round(nameText.x), Math.round(nameText.y));
    }
    container.add(nameText);

    // ボタン状態を取得
    const buttonState = this.getButtonState(item, character);

    // ボタンを右端に横並びで配置
    let buttonX = panelWidth / 2 - padding - buttonWidth * 3 - buttonSpacing * 2;

    // 使用ボタン
    const useButton = this.createActionButton(
      buttonState.use.text,
      buttonX + buttonWidth / 2,
      0,
      buttonState.use.enabled,
      buttonState.use.callback,
    );
    container.add(useButton);
    buttonX += buttonWidth + buttonSpacing;

    // 装備ボタン
    const equipButton = this.createActionButton(
      buttonState.equip.text,
      buttonX + buttonWidth / 2,
      0,
      buttonState.equip.enabled,
      buttonState.equip.callback,
    );
    container.add(equipButton);
    buttonX += buttonWidth + buttonSpacing;

    // 渡すボタン
    const transferButton = this.createActionButton(
      buttonState.transfer.text,
      buttonX + buttonWidth / 2,
      0,
      buttonState.transfer.enabled,
      buttonState.transfer.callback,
    );
    container.add(transferButton);

    return container;
  }

  private createEmptySlot(slotNumber: number, y: number): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(0, y);
    const { padding } = this.layoutConfig;
    const panelWidth = (this as any).panelWidth;

    const text = this.phaserScene.add.text(
      Math.round(-panelWidth / 2 + padding),
      0,
      `${slotNumber}. 空きスロット`,
      {
        fontSize: '10px',
        fontFamily: 'monospace, "Courier New", Courier',
        color: '#666666',
        resolution: 2,
        padding: { x: 2, y: 2 },
      },
    );
    text.setOrigin(0, 0.5);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (text.setPosition) {
      text.setPosition(Math.round(text.x), Math.round(text.y));
    }
    container.add(text);

    return container;
  }

  private getButtonState(item: IItem, character: Character): ItemButtonState {
    const isConsumable = item.type === ItemType.CONSUMABLE;
    const isWeapon = item.type === ItemType.WEAPON;
    const itemHolder = character.getItemHolder();
    const isEquipped = itemHolder.getEquippedWeapon() === item;

    // 譲渡可能条件：軍団に他のメンバーがいること
    const hasOtherMembers = this.armyMembers.length > 1;

    return {
      use: {
        enabled: isConsumable,
        text: '使用',
        callback: isConsumable
          ? () => this.handleUseItem(character, item as IConsumable)
          : undefined,
      },
      equip: {
        enabled: isWeapon, // 武器なら常に有効（装備/装備解除両方）
        text: isEquipped ? '装備解除' : '装備',
        callback: isWeapon
          ? isEquipped
            ? () => this.handleUnequipWeapon(character) // 装備中なら解除
            : () => this.handleEquipWeapon(character, item as IWeapon) // 未装備なら装備
          : undefined,
      },
      transfer: {
        enabled: hasOtherMembers,
        text: '渡す',
        callback: hasOtherMembers ? () => this.handleTransferItem(character, item) : undefined,
      },
    };
  }

  private handleUseItem(character: Character, item: IConsumable): void {
    if (this.onUseItemCallback) {
      this.onUseItemCallback(character, item);
    }
    // UIを更新（アイテムが消費された場合の表示更新）
    this.updateDisplay();
  }

  private handleEquipWeapon(character: Character, weapon: IWeapon): void {
    if (this.onEquipWeaponCallback) {
      this.onEquipWeaponCallback(character, weapon);
    }
    // UIを更新（装備状態の表示更新）
    this.updateDisplay();
  }

  private handleUnequipWeapon(character: Character): void {
    const itemHolder = character.getItemHolder();
    const weapon = itemHolder.getEquippedWeapon();
    console.log(
      `[ItemInventoryUI] 装備解除: ${character.getName()} - ${weapon ? weapon.name : 'なし'}`,
    );
    itemHolder.unequipWeapon();
    // UIを更新（装備状態の表示更新）
    this.updateDisplay();
  }

  private handleTransferItem(from: Character, item: IItem): void {
    console.log(`[ItemInventoryUI] アイテム譲渡開始: ${from.getName()} の ${item.name} を譲渡`);

    // 譲渡元と譲渡アイテムを保存
    this.transferringCharacter = from;
    this.transferringItem = item;

    // 譲渡対象選択UIを表示
    this.createTransferTargetSelectUI();
  }

  /**
   * 譲渡対象選択UIを作成・表示
   */
  private createTransferTargetSelectUI(): void {
    if (!this.transferringCharacter || !this.transferringItem) {
      return;
    }

    // 既存の譲渡UIコンテナがあれば破棄（transferringItem/Characterはクリアしない）
    if (this.transferTargetSelectContainer) {
      this.transferTargetSelectContainer.destroy();
      this.transferTargetSelectContainer = undefined;
    }

    // カメラの表示範囲を取得
    const cam = this.phaserScene.cameras.main;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const viewWidth = cam.worldView.width;
    const viewHeight = cam.worldView.height;

    // コンテナ作成
    this.transferTargetSelectContainer = this.phaserScene.add.container(0, 0);
    this.transferTargetSelectContainer.setDepth(2000); // 持物UIより前面

    // オーバーレイ背景（半透明黒、インタラクティブ）
    const overlayBg = this.phaserScene.add.rectangle(
      viewLeft + viewWidth / 2,
      viewTop + viewHeight / 2,
      viewWidth,
      viewHeight,
      0x000000,
      0.5,
    );
    this.transferTargetSelectContainer.add(overlayBg);

    // 譲渡可能なメンバーリスト（自分以外）
    const availableTargets = this.armyMembers.filter(
      (member) => member !== this.transferringCharacter,
    );

    // 選択パネルのサイズ計算
    const panelWidth = 300;
    const titleHeight = 40;
    const buttonHeight = 40;
    const buttonSpacing = 10;
    const panelHeight = titleHeight + availableTargets.length * (buttonHeight + buttonSpacing) + 20;

    // 選択パネル（中央配置）
    const panelX = viewLeft + viewWidth / 2;
    const panelY = viewTop + viewHeight / 2;
    const selectPanel = this.phaserScene.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0xffffff,
      0.95,
    );
    selectPanel.setStrokeStyle(2, 0x000000);
    this.transferTargetSelectContainer.add(selectPanel);

    // selectPanelの範囲を保存（overlayBgのクリック判定用）
    const panelBounds = {
      left: panelX - panelWidth / 2,
      right: panelX + panelWidth / 2,
      top: panelY - panelHeight / 2,
      bottom: panelY + panelHeight / 2,
    };

    // overlayBgのイベントハンドラ設定（panel外のクリックで閉じる）
    overlayBg.setInteractive();
    overlayBg.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        const clickX = pointer.worldX;
        const clickY = pointer.worldY;

        // クリック位置がpanel内かどうかをチェック
        const isInsidePanel =
          clickX >= panelBounds.left &&
          clickX <= panelBounds.right &&
          clickY >= panelBounds.top &&
          clickY <= panelBounds.bottom;

        console.log(
          `[ItemInventoryUI] overlayBg clicked - クリック位置: (${clickX}, ${clickY}), panel内: ${isInsidePanel}`,
        );

        if (!isInsidePanel) {
          // panel外のクリックの場合のみUIを閉じる
          console.log('[ItemInventoryUI] panel外クリック - UIを閉じます');
          event.stopPropagation();
          this.closeTransferTargetSelectUI();
        } else {
          console.log('[ItemInventoryUI] panel内クリック - UIを閉じません');
        }
      },
    );

    // タイトルテキスト
    const titleText = this.phaserScene.add.text(
      panelX,
      panelY - panelHeight / 2 + 20,
      '誰に渡しますか？',
      {
        fontSize: '16px',
        color: '#000000',
        fontFamily: 'Arial',
      },
    );
    titleText.setOrigin(0.5);
    this.transferTargetSelectContainer.add(titleText);

    // メンバーボタンリスト
    let currentY = panelY - panelHeight / 2 + titleHeight + buttonSpacing;
    availableTargets.forEach((member) => {
      const itemCount = member.getItemHolder().items.length;
      const isFull = itemCount >= 4;

      // ボタン背景
      const buttonBg = this.phaserScene.add.rectangle(
        panelX,
        currentY + buttonHeight / 2,
        panelWidth - 40,
        buttonHeight,
        isFull ? 0xcccccc : 0xffffff,
      );
      buttonBg.setStrokeStyle(1, 0x000000);

      // ホバー効果とクリック処理（満杯でない場合のみ）
      if (!isFull) {
        buttonBg.setInteractive();
        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(0xccddff);
        });
        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(0xffffff);
        });
        buttonBg.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            console.log(`[ItemInventoryUI] buttonBg clicked - ${member.getName()}を選択`);
            event.stopPropagation();
            this.executeTransfer(member);
          },
        );
      }

      this.transferTargetSelectContainer!.add(buttonBg);

      // メンバー名と所持数
      const buttonText = this.phaserScene.add.text(
        panelX,
        currentY + buttonHeight / 2,
        `${member.getName()}（${itemCount}/4）`,
        {
          fontSize: '14px',
          color: isFull ? '#888888' : '#000000',
          fontFamily: 'Arial',
        },
      );
      buttonText.setOrigin(0.5);
      this.transferTargetSelectContainer!.add(buttonText);

      currentY += buttonHeight + buttonSpacing;
    });

    console.log(`[ItemInventoryUI] 譲渡対象選択UI表示: ${availableTargets.length}名`);
  }

  /**
   * 譲渡を実行
   */
  private executeTransfer(to: Character): void {
    console.log(`[ItemInventoryUI] executeTransfer開始: ${to.getName()}`);
    console.log(
      `[ItemInventoryUI] transferringItem: ${this.transferringItem?.name}, transferringCharacter: ${this.transferringCharacter?.getName()}`,
    );

    if (!this.transferringItem || !this.transferringCharacter) {
      console.log(
        '[ItemInventoryUI] transferringItemまたはtransferringCharacterがnullのため処理を中断',
      );
      return;
    }

    const from = this.transferringCharacter;
    const item = this.transferringItem;

    // 譲渡先の所持数チェック（念のため再確認）
    if (to.getItemHolder().items.length >= 4) {
      console.log(`[ItemInventoryUI] 譲渡失敗: ${to.getName()}の持物が満杯です`);
      return;
    }

    console.log(
      `[ItemInventoryUI] 譲渡実行: ${from.getName()} → ${to.getName()}, アイテム: ${item.name}`,
    );

    // UIManagerのコールバック呼び出し
    if (this.onTransferItemCallback) {
      this.onTransferItemCallback(from, to, item);
    }

    // メッセージ表示は、UIManager経由で行う必要がある
    // （このクラスからは直接showGuideMessageを呼べないため、UIManagerに任せる）

    // UIを更新
    this.updateDisplay();

    // 譲渡対象選択UIを閉じる
    this.closeTransferTargetSelectUI();
  }

  /**
   * 譲渡対象選択UIを閉じる
   */
  private closeTransferTargetSelectUI(): void {
    if (this.transferTargetSelectContainer) {
      this.transferTargetSelectContainer.destroy();
      this.transferTargetSelectContainer = undefined;
    }
    this.transferringItem = undefined;
    this.transferringCharacter = undefined;
  }

  private setupInputHandlers(): void {
    console.log('[ItemInventoryUI] setupInputHandlers - 入力ハンドラー設定開始');

    // モーダル背景のクリックでキャンセル
    this.modalBackground.on('pointerdown', (pointer: any) => {
      console.log('[ItemInventoryUI] モーダル背景クリック検出');
      // イベントの伝播を止める
      if (pointer && pointer.event) {
        console.log('[ItemInventoryUI] イベント伝播を停止');
        pointer.event.stopPropagation();
      }
      // 少し遅延を入れてから閉じる（他のUIの処理が完了するまで待つ）
      this.phaserScene.time.delayedCall(10, () => {
        console.log('[ItemInventoryUI] 遅延後にクローズ実行');
        this.close();
      });
    });

    // メインパネルのクリックは伝播を止める
    this.background.setInteractive();
    this.background.on('pointerdown', (pointer: any) => {
      console.log('[ItemInventoryUI] メインパネルクリック検出');
      if (pointer && pointer.event) {
        console.log('[ItemInventoryUI] メインパネル - イベント伝播を停止');
        pointer.event.stopPropagation();
      }
    });

    // ESCキーでキャンセル
    if (
      this.phaserScene.input &&
      this.phaserScene.input.keyboard &&
      typeof Phaser !== 'undefined'
    ) {
      console.log('[ItemInventoryUI] ESCキー設定');
      const escKey = this.phaserScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      if (escKey) {
        escKey.on('down', () => {
          console.log('[ItemInventoryUI] ESCキー押下検出');
          this.close();
        });
      }
    }

    console.log('[ItemInventoryUI] setupInputHandlers - 入力ハンドラー設定完了');
  }

  private close(): void {
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
    this.destroy();
  }

  public show(): void {
    this.setVisible(true);
  }

  public hide(): void {
    this.setVisible(false);
  }

  public destroy(): void {
    // ESCキーのリスナーを削除
    if (this.phaserScene && this.phaserScene.input && this.phaserScene.input.keyboard) {
      this.phaserScene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    // 親クラスのdestroyを呼ぶ
    super.destroy();
  }
}
