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
  base: Base;
  onArmyFormed?: (data: ArmyFormationData) => void;
  onCancelled?: () => void;
}

export class ArmyFormationUI extends Phaser.GameObjects.Container {
  private currentBase: Base;
  private onArmyFormedCallback?: (data: ArmyFormationData) => void;
  private onCancelledCallback?: () => void;

  // UI要素
  private background: Phaser.GameObjects.Rectangle;
  private modalBackground: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // メインコンテンツコンテナ（スクロール用）
  private contentContainer!: Phaser.GameObjects.Container;

  // 3列レイアウトのコンテナ
  private waitingSoldiersPanel!: Phaser.GameObjects.Container;
  private formationPanel!: Phaser.GameObjects.Container;
  private itemEquipPanel!: Phaser.GameObjects.Container;

  // データ管理
  private waitingSoldiers: WaitingSoldier[] = [];
  private formationSlots: FormationSlot[] = [];
  private selectedCharacter: Character | null = null;
  private selectedDeployPosition: DeployPosition | null = null;
  private characterItems: Map<Character, IItem[]> = new Map();

  // ボタン
  private confirmButton!: Phaser.GameObjects.Container;
  private cancelButton!: Phaser.GameObjects.Container;

  constructor(config: ArmyFormationUIConfig) {
    // カメラの実際の表示範囲を取得
    const cam = config.scene.cameras.main;
    const viewWidth = cam.width;
    const viewHeight = cam.height;
    const viewCenterX = cam.worldView.x + viewWidth / 2;
    const viewCenterY = cam.worldView.y + viewHeight / 2;

    super(config.scene, viewCenterX, viewCenterY);

    this.currentBase = config.base;
    this.onArmyFormedCallback = config.onArmyFormed;
    this.onCancelledCallback = config.onCancelled;

    // 画面全体を覆う半透明の背景
    this.modalBackground = config.scene.add.rectangle(
      0,
      0,
      viewWidth * 2,
      viewHeight * 2,
      0x000000,
      0.7,
    );
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景（画面サイズに合わせて調整）
    const panelWidth = Math.min(viewWidth * 0.85, 600); // 画面幅の85%または600pxの小さい方
    const panelHeight = Math.min(viewHeight * 0.8, 400); // 画面高さの80%または400pxの小さい方
    this.background = config.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.95);
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル
    const titleText = `軍団編成 - ${this.currentBase.getName()}`;
    this.titleText = config.scene.add.text(0, -panelHeight / 2 + 15, titleText, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
    });
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // コンテンツコンテナを作成
    this.contentContainer = config.scene.add.container(0, 0);
    this.add(this.contentContainer);

    // 3列レイアウトの作成（パネルサイズを渡す）
    this.createWaitingSoldiersPanel(panelWidth, panelHeight);
    this.createFormationPanel(panelWidth, panelHeight);
    this.createItemEquipPanel(panelWidth, panelHeight);

    // ボタンの作成（パネルサイズを渡す）
    this.createButtons(panelHeight);

    // 編成スロットの初期化
    this.initializeFormationSlots();

    // デフォルトの出撃位置を設定（拠点の右隣）
    const basePos = this.currentBase.getPosition();
    this.selectedDeployPosition = {
      x: basePos.x + 2,
      y: basePos.y + 1,
      isValid: true,
    };

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();

    // スクロール可能にする
    this.setScrollFactor(0);
  }

  private createWaitingSoldiersPanel(parentWidth: number, parentHeight: number): void {
    // パネルのサイズと位置を動的に計算
    const spacing = 8;
    const columnWidth = (parentWidth - spacing * 4) / 3; // 3列で均等割り
    const panelWidth = Math.min(columnWidth, 150); // 最大幅を制限
    const panelHeight = parentHeight - 80; // 上下のマージンを考慮

    const panelX = -parentWidth / 2 + spacing + panelWidth / 2;
    const panelY = -parentHeight / 2 + 50; // タイトル分のオフセット

    this.waitingSoldiersPanel = this.scene.add.container(panelX, panelY);

    // パネルの背景
    const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setOrigin(0.5, 0);
    this.waitingSoldiersPanel.add(bg);

    // ヘッダー
    const header = this.scene.add.text(0, 10 - panelHeight / 2, '待機兵士', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0);
    this.waitingSoldiersPanel.add(header);

    this.contentContainer.add(this.waitingSoldiersPanel);
  }

  private createFormationPanel(parentWidth: number, parentHeight: number): void {
    // パネルのサイズと位置を動的に計算
    const spacing = 8;
    const columnWidth = (parentWidth - spacing * 4) / 3;
    const panelWidth = Math.min(columnWidth * 1.2, 180); // 中央パネルは少し広め
    const panelHeight = parentHeight - 80;

    const panelX = 0; // 中央配置
    const panelY = -parentHeight / 2 + 50;

    this.formationPanel = this.scene.add.container(panelX, panelY);

    // パネルの背景
    const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setOrigin(0.5, 0);
    this.formationPanel.add(bg);

    // ヘッダー
    const header = this.scene.add.text(0, 10 - panelHeight / 2, '編成中の軍団', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0);
    this.formationPanel.add(header);

    // 指揮官スロット
    const commanderLabel = this.scene.add.text(
      -panelWidth / 2 + 10,
      50 - panelHeight / 2,
      '指揮官（必須）:',
      {
        fontSize: '12px',
        color: '#ffff00',
      },
    );
    commanderLabel.setOrigin(0, 0);
    this.formationPanel.add(commanderLabel);

    // 一般兵スロット
    const soldiersLabel = this.scene.add.text(
      -panelWidth / 2 + 10,
      120 - panelHeight / 2,
      '一般兵（最大3名）:',
      {
        fontSize: '12px',
        color: '#ffffff',
      },
    );
    soldiersLabel.setOrigin(0, 0);
    this.formationPanel.add(soldiersLabel);

    this.contentContainer.add(this.formationPanel);
  }

  private createItemEquipPanel(parentWidth: number, parentHeight: number): void {
    // パネルのサイズと位置を動的に計算
    const spacing = 8;
    const columnWidth = (parentWidth - spacing * 4) / 3;
    const panelWidth = Math.min(columnWidth, 150);
    const panelHeight = parentHeight - 80;

    const panelX = parentWidth / 2 - spacing - panelWidth / 2;
    const panelY = -parentHeight / 2 + 50;

    this.itemEquipPanel = this.scene.add.container(panelX, panelY);

    // パネルの背景
    const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setOrigin(0.5, 0);
    this.itemEquipPanel.add(bg);

    // ヘッダー
    const header = this.scene.add.text(0, 10 - panelHeight / 2, 'アイテム装備', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0);
    this.itemEquipPanel.add(header);

    this.contentContainer.add(this.itemEquipPanel);
  }

  private createButtons(panelHeight: number): void {
    // ボタンをパネルの下部に配置
    const buttonY = panelHeight / 2 - 30;

    // 確定ボタン
    this.confirmButton = this.createButton('出撃', -60, buttonY, () => {
      this.onConfirm();
    });
    this.add(this.confirmButton);

    // キャンセルボタン
    this.cancelButton = this.createButton('キャンセル', 60, buttonY, () => {
      this.onCancel();
    });
    this.add(this.cancelButton);
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(0, 0, 100, 40, 0x555555);
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
    // パネルの背景を取得してサイズを計算
    const panelBg = this.formationPanel.list[0] as Phaser.GameObjects.Rectangle;
    const panelHeight = panelBg.height;

    // 指揮官スロット（中央配置）
    const commanderSlot = this.createSlotVisual(0, 80 - panelHeight / 2, 'commander', 0);
    this.formationPanel.add(commanderSlot);

    // 一般兵スロット（横並び配置）
    const slotSize = 50;
    const slotSpacing = 10;
    const totalWidth =
      slotSize * ARMY_CONSTRAINTS.maxSoldiers + slotSpacing * (ARMY_CONSTRAINTS.maxSoldiers - 1);
    const startX = -totalWidth / 2 + slotSize / 2;

    for (let i = 0; i < ARMY_CONSTRAINTS.maxSoldiers; i++) {
      const slotX = startX + i * (slotSize + slotSpacing);
      const slotY = 150 - panelHeight / 2;
      const soldierSlot = this.createSlotVisual(slotX, slotY, 'soldier', i);
      this.formationPanel.add(soldierSlot);
    }
  }

  private createSlotVisual(
    x: number,
    y: number,
    type: 'commander' | 'soldier',
    index: number,
  ): Phaser.GameObjects.Container {
    const slotContainer = this.scene.add.container(x, y);

    // スロットの背景（サイズを小さく）
    const slotSize = 50;
    const slotBg = this.scene.add.rectangle(0, 0, slotSize, slotSize, 0x444444);
    slotBg.setStrokeStyle(2, type === 'commander' ? 0xffff00 : 0xaaaaaa);
    slotBg.setInteractive({ useHandCursor: true });
    slotBg.setData('slotType', type);
    slotBg.setData('slotIndex', index);

    slotContainer.add(slotBg);

    // ドロップ領域として設定
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

  private onSlotClicked(type: 'commander' | 'soldier', index: number): void {
    // TODO: スロットクリック時の処理
    console.log(`Slot clicked: ${type} ${index}`);
  }

  private onConfirm(): void {
    // 指揮官が選択されているかチェック
    const commanderSlot = this.formationSlots.find((slot) => slot.slotType === 'commander');
    if (!commanderSlot || !commanderSlot.character) {
      // エラーメッセージを表示
      console.warn('指揮官が選択されていません');
      return;
    }

    // 出撃位置が選択されているかチェック
    if (!this.selectedDeployPosition) {
      console.warn('出撃位置が選択されていません');
      return;
    }

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
    if (this.onCancelledCallback) {
      this.onCancelledCallback();
    }
    this.destroy();
  }

  public updateWaitingSoldiers(soldiers: Character[]): void {
    this.waitingSoldiers = soldiers.map((char) => ({
      character: char,
      isAvailable: true,
    }));

    // 待機兵士リストの表示を更新
    this.updateWaitingSoldiersDisplay();
  }

  private updateWaitingSoldiersDisplay(): void {
    // 既存の兵士表示をクリア
    const existingSoldierDisplays = this.waitingSoldiersPanel.list.filter(
      (child) => child.getData && child.getData('isSoldierDisplay'),
    );
    existingSoldierDisplays.forEach((display) => display.destroy());

    // パネルサイズを取得
    const panelBg = this.waitingSoldiersPanel.list[0] as Phaser.GameObjects.Rectangle;
    const panelWidth = panelBg.width;
    const panelHeight = panelBg.height;

    // 待機兵士を表示
    const itemHeight = 40;
    const spacing = 5;
    const startY = -panelHeight / 2 + 40; // ヘッダー分のオフセット

    this.waitingSoldiers.forEach((soldier, index) => {
      const yPos = startY + index * (itemHeight + spacing);
      const soldierDisplay = this.createSoldierDisplay(soldier, 0, yPos, panelWidth - 20);
      this.waitingSoldiersPanel.add(soldierDisplay);
    });
  }

  private createSoldierDisplay(
    soldier: WaitingSoldier,
    x: number,
    y: number,
    width: number = 160,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setData('isSoldierDisplay', true);

    // 背景
    const itemHeight = 40;
    const bg = this.scene.add.rectangle(0, 0, width, itemHeight, 0x555555);
    bg.setOrigin(0.5, 0.5);
    bg.setInteractive({ useHandCursor: soldier.isAvailable });
    container.add(bg);

    // キャラクター名
    const nameText = this.scene.add.text(
      -width / 2 + 5,
      -itemHeight / 2 + 3,
      soldier.character.getName(),
      {
        fontSize: '12px',
        color: soldier.isAvailable ? '#ffffff' : '#888888',
      },
    );
    nameText.setOrigin(0, 0);
    container.add(nameText);

    // 職業とHP
    const jobType = soldier.character.getJobType();
    const stats = soldier.character.getStats();
    const infoText = this.scene.add.text(
      -width / 2 + 5,
      -itemHeight / 2 + 20,
      `${jobType} HP:${stats.hp}/${stats.maxHp}`,
      {
        fontSize: '10px',
        color: soldier.isAvailable ? '#aaaaaa' : '#666666',
      },
    );
    infoText.setOrigin(0, 0);
    container.add(infoText);

    // クリックイベント
    if (soldier.isAvailable) {
      bg.on('pointerover', () => bg.setFillStyle(0x666666));
      bg.on('pointerout', () => bg.setFillStyle(0x555555));
      bg.on('pointerdown', () => this.onSoldierSelected(soldier.character));
    }

    return container;
  }

  private onSoldierSelected(character: Character): void {
    this.selectedCharacter = character;
    // TODO: ドラッグまたは配置モードの実装
    console.log(`Selected soldier: ${character.getName()}`);
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 親クラスのdestroy
    super.destroy();
  }
}
