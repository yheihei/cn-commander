import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { Character } from '../character/Character';
import { IItem } from '../types/ItemTypes';
import {
  ArmyFormationData,
  FormationSlot,
  WaitingSoldier,
  DeployPosition,
} from '../types/ArmyFormationTypes';
import { ARMY_CONSTRAINTS } from '../types/ArmyTypes';

export interface ArmyFormationUIConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  base: Base;
  onArmyFormed?: (data: ArmyFormationData) => void;
  onCancelled?: () => void;
}

type TabType = 'soldiers' | 'formation' | 'items';

export class ArmyFormationUITabbed extends Phaser.GameObjects.Container {
  private currentBase: Base;
  private onArmyFormedCallback?: (data: ArmyFormationData) => void;
  private onCancelledCallback?: () => void;
  private panelWidth: number;
  private panelHeight: number;

  // UI要素
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // タブ
  private tabs: Map<TabType, Phaser.GameObjects.Container> = new Map();
  private tabContents: Map<TabType, Phaser.GameObjects.Container> = new Map();
  private activeTab: TabType = 'soldiers';

  // データ管理
  private waitingSoldiers: WaitingSoldier[] = [];
  private formationSlots: FormationSlot[] = [];
  private selectedCharacter: Character | null = null;
  private selectedDeployPosition: DeployPosition | null = null;
  private characterItems: Map<Character, IItem[]> = new Map();

  // ボタン
  private closeButton!: Phaser.GameObjects.Container;
  private confirmButton!: Phaser.GameObjects.Container;

  constructor(config: ArmyFormationUIConfig) {
    super(config.scene, config.x, config.y);

    this.panelWidth = config.width;
    this.panelHeight = config.height;
    this.currentBase = config.base;
    this.onArmyFormedCallback = config.onArmyFormed;
    this.onCancelledCallback = config.onCancelled;

    // メインパネルの背景
    this.background = config.scene.add.rectangle(
      0,
      0,
      this.panelWidth,
      this.panelHeight,
      0x222222,
      0.95,
    );
    this.background.setStrokeStyle(3, 0xff0000); // 赤枠にして見やすく
    this.background.setOrigin(0, 0);
    this.background.setInteractive(); // 背景をインタラクティブにして確実に表示
    this.add(this.background);

    // タイトル
    const titleText = `軍団編成 - ${this.currentBase.getName()}`;
    this.titleText = config.scene.add.text(this.panelWidth / 2, 15, titleText, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
    });
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // 閉じるボタン
    this.createCloseButton(this.panelWidth - 25, 15);

    // タブの作成
    this.createTabs(this.panelWidth);

    // タブコンテンツの作成
    this.createTabContents(this.panelWidth, this.panelHeight);

    // 編成スロットの初期化
    this.initializeFormationSlots();

    // デフォルトの出撃位置を設定
    const basePos = this.currentBase.getPosition();
    this.selectedDeployPosition = {
      x: basePos.x + 2,
      y: basePos.y + 1,
      isValid: true,
    };

    // ボタンの作成
    this.createBottomButtons(this.panelWidth, this.panelHeight);

    // コンテナをシーンに追加
    config.scene.add.existing(this);

    // UIレイヤーの最前面に表示（ArmyInfoPanelと同じdepth）
    this.setDepth(998);

    // 初期タブをアクティブに
    this.switchTab('soldiers');

    // 初期状態は非表示（ArmyInfoPanelと同じ）
    this.setVisible(false);
  }

  private createCloseButton(x: number, y: number): void {
    this.closeButton = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.circle(0, 0, 10, 0x555555);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, '×', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);

    this.closeButton.add([buttonBg, buttonText]);

    buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x777777));
    buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x555555));
    buttonBg.on('pointerdown', () => this.onCancel());

    this.add(this.closeButton);
  }

  private createTabs(panelWidth: number): void {
    const tabData: Array<{ key: TabType; label: string }> = [
      { key: 'soldiers', label: '待機兵士' },
      { key: 'formation', label: '編成' },
      { key: 'items', label: 'アイテム' },
    ];

    const tabWidth = (panelWidth - 20) / tabData.length;
    const tabHeight = 30;
    const tabY = 40;

    tabData.forEach((tab, index) => {
      const tabX = 10 + index * tabWidth;
      const tabContainer = this.createTab(tab.key, tab.label, tabX, tabY, tabWidth, tabHeight);
      this.tabs.set(tab.key, tabContainer);
      this.add(tabContainer);
    });
  }

  private createTab(
    key: TabType,
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x333333);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x666666);
    bg.setInteractive({ useHandCursor: true });

    const text = this.scene.add.text(width / 2, height / 2, label, {
      fontSize: '12px',
      color: '#ffffff',
      resolution: 2,
    });
    text.setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerdown', () => this.switchTab(key));
    bg.on('pointerover', () => {
      if (this.activeTab !== key) {
        bg.setFillStyle(0x444444);
      }
    });
    bg.on('pointerout', () => {
      if (this.activeTab !== key) {
        bg.setFillStyle(0x333333);
      }
    });

    container.setData('bg', bg);
    container.setData('text', text);

    return container;
  }

  private switchTab(tab: TabType): void {
    // 全てのタブを非アクティブに
    this.tabs.forEach((tabContainer, key) => {
      const bg = tabContainer.getData('bg') as Phaser.GameObjects.Rectangle;
      const text = tabContainer.getData('text') as Phaser.GameObjects.Text;

      if (key === tab) {
        bg.setFillStyle(0x555555);
        text.setColor('#ffff00');
      } else {
        bg.setFillStyle(0x333333);
        text.setColor('#ffffff');
      }
    });

    // タブコンテンツの表示/非表示
    this.tabContents.forEach((content, key) => {
      content.setVisible(key === tab);
    });

    this.activeTab = tab;
  }

  private createTabContents(panelWidth: number, panelHeight: number): void {
    const contentY = 75;
    const contentHeight = panelHeight - 140; // タイトル、タブ、ボタン分を引く

    // 待機兵士タブ
    const soldiersContent = this.createSoldiersContent(
      10,
      contentY,
      panelWidth - 20,
      contentHeight,
    );
    this.tabContents.set('soldiers', soldiersContent);
    this.add(soldiersContent);

    // 編成タブ
    const formationContent = this.createFormationContent(
      10,
      contentY,
      panelWidth - 20,
      contentHeight,
    );
    this.tabContents.set('formation', formationContent);
    this.add(formationContent);

    // アイテムタブ
    const itemsContent = this.createItemsContent(10, contentY, panelWidth - 20, contentHeight);
    this.tabContents.set('items', itemsContent);
    this.add(itemsContent);
  }

  private createSoldiersContent(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // 背景
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.5);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444444);
    container.add(bg);

    // ヘッダー
    const header = this.scene.add.text(10, 10, '待機中の兵士を選択:', {
      fontSize: '12px',
      color: '#ffffff',
    });
    container.add(header);

    return container;
  }

  private createFormationContent(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // 背景
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.5);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444444);
    container.add(bg);

    // 指揮官セクション
    const commanderLabel = this.scene.add.text(10, 10, '指揮官（必須）:', {
      fontSize: '12px',
      color: '#ffff00',
    });
    container.add(commanderLabel);

    // 一般兵セクション
    const soldiersLabel = this.scene.add.text(10, 80, '一般兵（最大3名）:', {
      fontSize: '12px',
      color: '#ffffff',
    });
    container.add(soldiersLabel);

    return container;
  }

  private createItemsContent(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // 背景
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.5);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444444);
    container.add(bg);

    // ヘッダー
    const header = this.scene.add.text(10, 10, 'アイテム装備:', {
      fontSize: '12px',
      color: '#ffffff',
    });
    container.add(header);

    const info = this.scene.add.text(10, 30, '各メンバーに最大4個まで装備可能', {
      fontSize: '10px',
      color: '#aaaaaa',
    });
    container.add(info);

    return container;
  }

  private createBottomButtons(panelWidth: number, panelHeight: number): void {
    const buttonY = panelHeight - 35;

    // 出撃ボタン
    this.confirmButton = this.createButton('出撃', panelWidth / 2 - 60, buttonY, () => {
      this.onConfirm();
    });
    this.add(this.confirmButton);
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(0, 0, 100, 30, 0x555555);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
      resolution: 2,
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x777777));
    buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x555555));
    buttonBg.on('pointerdown', onClick);

    return button;
  }

  private initializeFormationSlots(): void {
    // 指揮官スロット（1つ）
    this.formationSlots.push({
      character: null,
      slotType: 'commander',
      index: 0,
    });

    // 一般兵スロット（3つ）
    for (let i = 0; i < ARMY_CONSTRAINTS.maxSoldiers; i++) {
      this.formationSlots.push({
        character: null,
        slotType: 'soldier',
        index: i,
      });
    }

    // スロットのビジュアル作成
    this.createSlotVisuals();
  }

  private createSlotVisuals(): void {
    const formationContent = this.tabContents.get('formation');
    if (!formationContent) return;

    // 指揮官スロット
    const commanderSlot = this.createSlotVisual(10, 35, 'commander', 0);
    formationContent.add(commanderSlot);

    // 一般兵スロット
    for (let i = 0; i < ARMY_CONSTRAINTS.maxSoldiers; i++) {
      const slotX = 10 + i * 90;
      const slotY = 105;
      const soldierSlot = this.createSlotVisual(slotX, slotY, 'soldier', i);
      formationContent.add(soldierSlot);
    }
  }

  private createSlotVisual(
    x: number,
    y: number,
    type: 'commander' | 'soldier',
    index: number,
  ): Phaser.GameObjects.Container {
    const slotContainer = this.scene.add.container(x, y);

    // スロットの背景
    const slotSize = 80;
    const slotBg = this.scene.add.rectangle(0, 0, slotSize, 40, 0x444444);
    slotBg.setOrigin(0, 0);
    slotBg.setStrokeStyle(2, type === 'commander' ? 0xffff00 : 0xaaaaaa);
    slotBg.setInteractive({ useHandCursor: true });
    slotBg.setData('slotType', type);
    slotBg.setData('slotIndex', index);

    slotContainer.add(slotBg);

    // スロットテキスト
    const slotText = this.scene.add.text(slotSize / 2, 20, '空き', {
      fontSize: '10px',
      color: '#888888',
    });
    slotText.setOrigin(0.5);
    slotContainer.add(slotText);

    slotBg.on('pointerover', () => {
      if (this.selectedCharacter) {
        slotBg.setFillStyle(0x666666);
      }
    });

    slotBg.on('pointerout', () => {
      slotBg.setFillStyle(0x444444);
    });

    slotBg.on('pointerdown', () => {
      this.onSlotClicked(type, index);
    });

    return slotContainer;
  }

  private onSlotClicked(type: 'commander' | 'soldier', index: number): void {
    console.log(`Slot clicked: ${type} ${index}`);
  }

  private onConfirm(): void {
    // 指揮官が選択されているかチェック
    const commanderSlot = this.formationSlots.find((slot) => slot.slotType === 'commander');
    if (!commanderSlot || !commanderSlot.character) {
      console.warn('指揮官が選択されていません');
      return;
    }

    // 出撃位置が選択されているかチェック
    if (!this.selectedDeployPosition) {
      console.warn('出撃位置が選択されていません');
      return;
    }

    // 指揮官フラグを設定し、指揮官マークを作成
    commanderSlot.character.setIsCommander(true);

    // 軍団編成データを作成
    const soldiers = this.formationSlots
      .filter((slot) => slot.slotType === 'soldier' && slot.character !== null)
      .map((slot) => slot.character!);

    const formationData: ArmyFormationData = {
      commander: commanderSlot.character,
      soldiers,
      items: this.characterItems,
      deployPosition: this.selectedDeployPosition,
    };

    // コールバックを実行
    if (this.onArmyFormedCallback) {
      this.onArmyFormedCallback(formationData);
    }

    this.destroy();
  }

  private onCancel(): void {
    // 選択されていた指揮官のフラグを解除
    const commanderSlot = this.formationSlots.find((slot) => slot.slotType === 'commander');
    if (commanderSlot && commanderSlot.character) {
      commanderSlot.character.setIsCommander(false);
    }

    if (this.onCancelledCallback) {
      this.onCancelledCallback();
    }
    this.destroy();
  }

  public updateWaitingSoldiers(soldiers: Character[]): void {
    console.log('updateWaitingSoldiers called with', soldiers.length, 'soldiers');

    this.waitingSoldiers = soldiers.map((char) => ({
      character: char,
      isAvailable: true,
    }));

    // 待機兵士リストの表示を更新
    this.updateWaitingSoldiersDisplay();

    console.log('updateWaitingSoldiers completed. UI visible:', this.visible);
  }

  private updateWaitingSoldiersDisplay(): void {
    const soldiersContent = this.tabContents.get('soldiers');
    if (!soldiersContent) return;

    // 既存の兵士表示をクリア
    const existingSoldierDisplays = soldiersContent.list.filter(
      (child) => child.getData && child.getData('isSoldierDisplay'),
    );
    existingSoldierDisplays.forEach((display) => display.destroy());

    // 待機兵士を表示
    let yOffset = 40;
    this.waitingSoldiers.forEach((soldier) => {
      const soldierDisplay = this.createSoldierDisplay(soldier, 10, yOffset);
      soldiersContent.add(soldierDisplay);
      yOffset += 45;
    });
  }

  private createSoldierDisplay(
    soldier: WaitingSoldier,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setData('isSoldierDisplay', true);

    // 背景
    const width = 260;
    const height = 40;
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x333333);
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: soldier.isAvailable });
    container.add(bg);

    // キャラクター名
    const nameText = this.scene.add.text(5, 5, soldier.character.getName(), {
      fontSize: '11px',
      color: soldier.isAvailable ? '#ffffff' : '#888888',
    });
    container.add(nameText);

    // 職業とHP
    const jobType = soldier.character.getJobType();
    const stats = soldier.character.getStats();
    const infoText = this.scene.add.text(5, 22, `${jobType} HP:${stats.hp}/${stats.maxHp}`, {
      fontSize: '10px',
      color: soldier.isAvailable ? '#aaaaaa' : '#666666',
    });
    container.add(infoText);

    // クリックイベント
    if (soldier.isAvailable) {
      bg.on('pointerover', () => bg.setFillStyle(0x444444));
      bg.on('pointerout', () => bg.setFillStyle(0x333333));
      bg.on('pointerdown', () => this.onSoldierSelected(soldier.character));
    }

    return container;
  }

  private onSoldierSelected(character: Character): void {
    this.selectedCharacter = character;
    console.log(`Selected soldier: ${character.getName()}`);

    // 編成タブに切り替え
    this.switchTab('formation');
  }

  public show(): void {
    this.setVisible(true);
    this.setActive(true);
  }

  public hide(): void {
    this.setVisible(false);
    this.setActive(false);
  }

  public getWidth(): number {
    return this.panelWidth;
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 親クラスのdestroy
    super.destroy();
  }
}
