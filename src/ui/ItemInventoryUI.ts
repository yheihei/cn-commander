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

  // レイアウト設定
  private readonly layoutConfig = {
    padding: 20,
    headerHeight: 60,
    characterHeight: 40,
    itemHeight: 50,
    buttonWidth: 50,
    buttonHeight: 20,
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
    const commander = this.army.getCommander();
    const soldiers = this.army.getSoldiers();

    this.armyMembers = [];
    if (commander) {
      this.armyMembers.push(commander);
    }
    this.armyMembers.push(...soldiers);
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

    // パネルサイズ（画面の80%）
    const panelWidth = viewWidth * 0.8;
    const panelHeight = viewHeight * 0.8;

    this.background = this.phaserScene.add.rectangle(0, 0, panelWidth, panelHeight, 0x333333, 0.95);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);
  }

  private createHeader(): void {
    const { padding } = this.layoutConfig;

    // パネルの高さを動的に取得
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewHeight = 720 / zoom;
    const panelHeight = viewHeight * 0.8;

    this.titleText = this.phaserScene.add.text(0, -panelHeight / 2 + padding, '持物管理', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);
  }

  private createCharacterSelector(): void {
    const { padding, headerHeight } = this.layoutConfig;

    // パネルのサイズを動的に取得
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    const panelWidth = viewWidth * 0.8;
    const panelHeight = viewHeight * 0.8;

    const selectorY = -panelHeight / 2 + headerHeight + padding;

    // キャラクター名表示
    this.characterNameText = this.phaserScene.add.text(0, selectorY, '', {
      fontSize: '12px',
      color: '#ffffff',
    });
    this.characterNameText.setOrigin(0.5, 0.5);
    this.add(this.characterNameText);

    // 前のキャラクターボタン
    this.prevCharButton = this.createNavigationButton(
      '◀',
      -panelWidth / 2 + padding + 20,
      selectorY,
      () => this.selectPreviousCharacter(),
    );
    this.add(this.prevCharButton);

    // 次のキャラクターボタン
    this.nextCharButton = this.createNavigationButton(
      '▶',
      panelWidth / 2 - padding - 20,
      selectorY,
      () => this.selectNextCharacter(),
    );
    this.add(this.nextCharButton);
  }

  private createItemList(): void {
    const { padding, headerHeight, characterHeight } = this.layoutConfig;

    // パネルの高さを動的に取得
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewHeight = 720 / zoom;
    const panelHeight = viewHeight * 0.8;

    const listY = -panelHeight / 2 + headerHeight + characterHeight + padding * 2;

    this.itemListContainer = this.phaserScene.add.container(0, listY);
    this.add(this.itemListContainer);
  }

  private createCloseButton(): void {
    const { padding } = this.layoutConfig;

    // パネルのサイズを動的に取得
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    const panelWidth = viewWidth * 0.8;
    const panelHeight = viewHeight * 0.8;

    const buttonX = panelWidth / 2 - padding - 20;
    const buttonY = -panelHeight / 2 + padding;

    this.closeButton = this.createSmallButton('✕', buttonX, buttonY, () => this.close());
    this.add(this.closeButton);
  }

  private createNavigationButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(x, y);

    const bg = this.phaserScene.add.rectangle(0, 0, 30, 30, 0x555555);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setInteractive({ useHandCursor: true });

    const label = this.phaserScene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setFillStyle(0x777777));
    bg.on('pointerout', () => bg.setFillStyle(0x555555));
    bg.on('pointerdown', onClick);

    return container;
  }

  private createSmallButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(x, y);

    const bg = this.phaserScene.add.rectangle(0, 0, 30, 30, 0x555555);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setInteractive({ useHandCursor: true });

    const label = this.phaserScene.add.text(0, 0, text, {
      fontSize: '10px',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setFillStyle(0x777777));
    bg.on('pointerout', () => bg.setFillStyle(0x555555));
    bg.on('pointerdown', onClick);

    return container;
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
    bg.setStrokeStyle(1, enabled ? 0xaaaaaa : 0x555555);

    if (enabled && onClick) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x777777));
      bg.on('pointerout', () => bg.setFillStyle(0x555555));
      bg.on('pointerdown', onClick);
    }

    const label = this.phaserScene.add.text(0, 0, text, {
      fontSize: '10px',
      color: textColor,
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    return container;
  }

  private selectPreviousCharacter(): void {
    if (this.armyMembers.length <= 1) return;

    this.currentCharacterIndex--;
    if (this.currentCharacterIndex < 0) {
      this.currentCharacterIndex = this.armyMembers.length - 1;
    }
    this.updateDisplay();
  }

  private selectNextCharacter(): void {
    if (this.armyMembers.length <= 1) return;

    this.currentCharacterIndex++;
    if (this.currentCharacterIndex >= this.armyMembers.length) {
      this.currentCharacterIndex = 0;
    }
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (this.armyMembers.length === 0) return;

    const currentCharacter = this.armyMembers[this.currentCharacterIndex];

    // キャラクター名を更新
    const jobName = this.getJobDisplayName(currentCharacter.getJobType());
    this.characterNameText.setText(`${currentCharacter.getName()}（${jobName}）`);

    // アイテムリストを更新
    this.updateItemList(currentCharacter);
  }

  private updateItemList(character: Character): void {
    // 既存のアイテム表示をクリア
    this.itemContainers.forEach((container) => container.destroy());
    this.itemContainers = [];
    this.itemListContainer.removeAll();

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

      currentY += this.layoutConfig.itemHeight + 5;
    }
  }

  private createItemSlot(
    item: IItem,
    character: Character,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(0, y);
    const { padding, buttonWidth, buttonSpacing } = this.layoutConfig;

    // パネルの幅を動的に取得
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const panelWidth = viewWidth * 0.8;

    // アイテム名
    let itemText = item.name;
    if (item.type === ItemType.WEAPON) {
      const weapon = item as IWeapon;
      itemText += ` (${weapon.durability}/${weapon.maxDurability})`;
    }

    const nameText = this.phaserScene.add.text(-panelWidth / 2 + padding, 0, itemText, {
      fontSize: '10px',
      color: '#ffffff',
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    // ボタン状態を取得
    const buttonState = this.getButtonState(item, character);

    // ボタンを配置
    const buttonStartX = -panelWidth / 2 + padding;
    const buttonY = 20;
    let currentX = buttonStartX;

    // 使用ボタン
    const useButton = this.createActionButton(
      buttonState.use.text,
      currentX + buttonWidth / 2,
      buttonY,
      buttonState.use.enabled,
      buttonState.use.callback,
    );
    container.add(useButton);
    currentX += buttonWidth + buttonSpacing;

    // 装備ボタン
    const equipButton = this.createActionButton(
      buttonState.equip.text,
      currentX + buttonWidth / 2,
      buttonY,
      buttonState.equip.enabled,
      buttonState.equip.callback,
    );
    container.add(equipButton);
    currentX += buttonWidth + buttonSpacing;

    // 渡すボタン
    const transferButton = this.createActionButton(
      buttonState.transfer.text,
      currentX + buttonWidth / 2,
      buttonY,
      buttonState.transfer.enabled,
      buttonState.transfer.callback,
    );
    container.add(transferButton);

    return container;
  }

  private createEmptySlot(slotNumber: number, y: number): Phaser.GameObjects.Container {
    const container = this.phaserScene.add.container(0, y);
    const { padding } = this.layoutConfig;

    // パネルの幅を動的に取得
    const cam = this.phaserScene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const panelWidth = viewWidth * 0.8;

    const text = this.phaserScene.add.text(
      -panelWidth / 2 + padding,
      0,
      `${slotNumber}. [空きスロット]`,
      {
        fontSize: '10px',
        color: '#666666',
      },
    );
    text.setOrigin(0, 0.5);
    container.add(text);

    return container;
  }

  private getButtonState(item: IItem, character: Character): ItemButtonState {
    const isConsumable = item.type === ItemType.CONSUMABLE;
    const isWeapon = item.type === ItemType.WEAPON;
    const itemHolder = character.getItemHolder();
    const isEquipped = itemHolder.getEquippedWeapon() === item;

    return {
      use: {
        enabled: isConsumable,
        text: '使用',
        callback: isConsumable
          ? () => this.handleUseItem(character, item as IConsumable)
          : undefined,
      },
      equip: {
        enabled: isWeapon && !isEquipped,
        text: isEquipped ? '装備中' : '装備',
        callback:
          isWeapon && !isEquipped
            ? () => this.handleEquipWeapon(character, item as IWeapon)
            : undefined,
      },
      transfer: {
        enabled: false, // 将来実装
        text: '渡す',
        callback: undefined,
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

  private getJobDisplayName(jobType: string): string {
    switch (jobType) {
      case 'wind':
        return '風忍';
      case 'iron':
        return '鉄忍';
      case 'shadow':
        return '影忍';
      case 'medicine':
        return '薬忍';
      default:
        return '忍者';
    }
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
