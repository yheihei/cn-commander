import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { Character } from '../character/Character';
import {
  FormationSlot,
  WaitingSoldier,
} from '../types/ArmyFormationTypes';
import { ARMY_CONSTRAINTS } from '../types/ArmyTypes';

export interface ArmyFormationUIConfig {
  scene: Phaser.Scene;
  base: Base;
  onProceedToItemSelection?: (data: FormationData) => void;
  onCancelled?: () => void;
}

export interface FormationData {
  commander: Character | null;
  soldiers: (Character | null)[];
}

export class ArmyFormationUI extends Phaser.GameObjects.Container {
  private onProceedToItemSelectionCallback?: (data: FormationData) => void;
  private onCancelledCallback?: () => void;

  // UI要素
  private background: Phaser.GameObjects.Rectangle;
  private modalBackground: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // メインコンテンツコンテナ
  private contentContainer!: Phaser.GameObjects.Container;

  // 左右分割レイアウトのコンテナ
  private formationArea!: Phaser.GameObjects.Container;  // 左側：編成エリア
  private waitingSoldiersArea!: Phaser.GameObjects.Container;  // 右側：待機兵士リスト

  // データ管理
  private waitingSoldiers: WaitingSoldier[] = [];
  private formationSlots: FormationSlot[] = [];
  private selectedSlot: { type: 'commander' | 'soldier'; index?: number } | null = null;
  private slotVisuals: Map<string, Phaser.GameObjects.Container> = new Map();
  private assignedSoldiers: Set<Character> = new Set();

  // ボタン
  private proceedButton!: Phaser.GameObjects.Container;
  private cancelButton!: Phaser.GameObjects.Container;

  constructor(config: ArmyFormationUIConfig) {
    // カメラのズーム値を考慮
    const cam = config.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    
    // worldViewの左上を基準にコンテナを配置
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    
    // 全体的な座標オフセット
    const xOffset = 70;   // 左右方向への移動（正の値で右へ、負の値で左へ）
    const yOffset = 184; // 下方向へ移動

    super(config.scene, viewLeft, viewTop);

    this.onProceedToItemSelectionCallback = config.onProceedToItemSelection;
    this.onCancelledCallback = config.onCancelled;

    // 画面全体を覆う半透明の背景（viewWidthの2倍幅で試す）
    this.modalBackground = config.scene.add.rectangle(
      viewWidth / 2 + xOffset,  // 中央に配置 + xOffset
      viewHeight / 2 + yOffset,
      viewWidth * 2,  // 2倍幅
      viewHeight,
      0x000000,
      0.5,
    );
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景（画面の90%×85%）
    const panelWidth = viewWidth;
    const panelHeight = viewHeight;
    this.background = config.scene.add.rectangle(
      viewWidth + xOffset ,  // 画面中央に配置 + xOffset
      viewHeight / 2 + yOffset,
      panelWidth, 
      panelHeight, 
      0x222222, 
      0.95
    );
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル
    const titleText = `軍団編成`;
    this.titleText = config.scene.add.text(
      viewWidth / 2 + xOffset + 60, 
      viewHeight / 2 - panelHeight / 2 + 20 + yOffset, 
      titleText, 
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
      }
    );
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // コンテンツコンテナを作成
    this.contentContainer = config.scene.add.container(viewWidth / 2 + xOffset, viewHeight / 2 + 20 + yOffset);
    this.add(this.contentContainer);

    // 左右分割レイアウトの作成（左側40%、右側60%）
    this.createFormationArea(panelWidth, panelHeight);
    this.createWaitingSoldiersArea(panelWidth, panelHeight);

    // ボタンの作成
    this.createButtons(panelHeight);

    // 編成スロットの初期化
    this.initializeFormationSlots();

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();

    // スクロール可能にする
    this.setScrollFactor(0);
  }

  private createFormationArea(parentWidth: number, parentHeight: number): void {
    // 左側エリア：画面幅の40%
    const areaWidth = parentWidth * 0.4;
    const areaHeight = parentHeight - 120; // タイトルとボタン分を除く
    const areaX = -parentWidth / 2 + areaWidth / 2;
    const areaY = -20; // コンテンツコンテナの相対位置を調整

    this.formationArea = this.scene.add.container(areaX, areaY);

    // エリアの背景
    const bg = this.scene.add.rectangle(0, 0, areaWidth - 20, areaHeight, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setOrigin(0.5);
    this.formationArea.add(bg);

    // ヘッダー
    const header = this.scene.add.text(0, -areaHeight / 2 + 20, '編成エリア', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0);
    this.formationArea.add(header);

    // 指揮官ラベル
    const commanderLabel = this.scene.add.text(
      0,
      -areaHeight / 2 + 60,
      '指揮官',
      {
        fontSize: '14px',
        color: '#ffff00',
      },
    );
    commanderLabel.setOrigin(0.5, 0);
    this.formationArea.add(commanderLabel);

    // 一般兵ラベル
    const soldiersLabel = this.scene.add.text(
      0,
      -areaHeight / 2 + 200,
      '一般兵',
      {
        fontSize: '14px',
        color: '#ffffff',
      },
    );
    soldiersLabel.setOrigin(0.5, 0);
    this.formationArea.add(soldiersLabel);

    this.contentContainer.add(this.formationArea);
  }

  private createWaitingSoldiersArea(parentWidth: number, parentHeight: number): void {
    // 右側エリア：画面幅の60%
    const areaWidth = parentWidth * 0.6;
    const areaHeight = parentHeight - 120;
    const areaX = parentWidth / 2 - areaWidth / 2;
    const areaY = -20; // コンテンツコンテナの相対位置を調整

    this.waitingSoldiersArea = this.scene.add.container(areaX, areaY);

    // エリアの背景
    const bg = this.scene.add.rectangle(0, 0, areaWidth - 20, areaHeight, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xaaaaaa);
    bg.setOrigin(0.5);
    this.waitingSoldiersArea.add(bg);

    // ヘッダー
    const header = this.scene.add.text(0, -areaHeight / 2 + 20, '待機兵士リスト', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0);
    this.waitingSoldiersArea.add(header);

    this.contentContainer.add(this.waitingSoldiersArea);
  }


  private createButtons(panelHeight: number): void {
    // カメラのズーム値を考慮
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    
    // 全体的な座標オフセット
    const xOffset = 0;   // 左右方向への移動（正の値で右へ、負の値で左へ）
    const yOffset = 180; // 下方向へ移動（constructorと同じ値を使用）
    
    // ボタンをパネルの下部に配置
    const buttonY = viewHeight / 2 + panelHeight / 2 - 40 + yOffset;

    // キャンセルボタン（左側）
    this.cancelButton = this.createButton(
      'キャンセル', 
      viewWidth / 2 - 100 + xOffset, 
      buttonY, 
      () => {
        this.onCancel();
      }
    );
    this.add(this.cancelButton);

    // 出撃準備ボタン（右側）
    this.proceedButton = this.createButton(
      '出撃準備', 
      viewWidth / 2 + 100 + xOffset, 
      buttonY, 
      () => {
        this.onProceed();
      }
    );
    this.add(this.proceedButton);

    // 初期状態では出撃準備ボタンを無効化
    // ボタンが作成された後に実行
    this.scene.time.delayedCall(0, () => {
      this.updateProceedButtonState();
    });
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
    
    // Store references for later access
    button.setData('background', buttonBg);
    button.setData('text', buttonText);

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
    // エリアの背景を取得してサイズを計算
    const areaBg = this.formationArea.list[0] as Phaser.GameObjects.Rectangle;
    const areaHeight = areaBg.height;

    // 指揮官スロット（中央配置）
    const commanderSlot = this.createSlotVisual(0, -areaHeight / 2 + 120, 'commander', 0);
    this.formationArea.add(commanderSlot);
    this.slotVisuals.set('commander-0', commanderSlot);

    // 一般兵スロット（横並び配置）
    const slotSize = 120;
    const slotSpacing = 20;
    const totalWidth =
      slotSize * ARMY_CONSTRAINTS.maxSoldiers + slotSpacing * (ARMY_CONSTRAINTS.maxSoldiers - 1);
    const startX = -totalWidth / 2 + slotSize / 2;

    for (let i = 0; i < ARMY_CONSTRAINTS.maxSoldiers; i++) {
      const slotX = startX + i * (slotSize + slotSpacing);
      const slotY = -areaHeight / 2 + 280;
      const soldierSlot = this.createSlotVisual(slotX, slotY, 'soldier', i);
      this.formationArea.add(soldierSlot);
      this.slotVisuals.set(`soldier-${i}`, soldierSlot);
    }
  }

  private createSlotVisual(
    x: number,
    y: number,
    type: 'commander' | 'soldier',
    index: number,
  ): Phaser.GameObjects.Container {
    const slotContainer = this.scene.add.container(x, y);

    // スロットのサイズ
    const slotWidth = 120;
    const slotHeight = 150;
    
    // スロットの背景（点線枠）
    const slotBg = this.scene.add.rectangle(0, 0, slotWidth, slotHeight, 0x444444);
    slotBg.setStrokeStyle(2, type === 'commander' ? 0xffff00 : 0xaaaaaa, 1);
    slotBg.setInteractive({ useHandCursor: true });
    slotBg.setData('slotType', type);
    slotBg.setData('slotIndex', index);

    slotContainer.add(slotBg);
    slotContainer.setData('background', slotBg);
    slotContainer.setData('slotType', type);
    slotContainer.setData('slotIndex', index);

    // クリックイベント
    slotBg.on('pointerover', () => {
      if (!this.getSlotCharacter(type, index)) {
        slotBg.setFillStyle(0x555555);
      }
    });

    slotBg.on('pointerout', () => {
      if (!this.selectedSlot || this.selectedSlot.type !== type || 
          (type === 'soldier' && this.selectedSlot.index !== index)) {
        slotBg.setFillStyle(0x444444);
      }
    });

    slotBg.on('pointerdown', () => {
      this.selectSlot(type, index);
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

  // スロット選択状態の管理
  public selectSlot(type: 'commander' | 'soldier', index?: number): void {
    // 以前の選択をクリア
    if (this.selectedSlot) {
      const prevKey = this.selectedSlot.type === 'commander' 
        ? 'commander-0' 
        : `soldier-${this.selectedSlot.index}`;
      const prevSlot = this.slotVisuals.get(prevKey);
      if (prevSlot) {
        const prevBg = prevSlot.getData('background') as Phaser.GameObjects.Rectangle;
        prevBg.setFillStyle(0x444444);
      }
    }

    // 新しい選択を設定
    this.selectedSlot = { type, index };
    
    // 選択スロットをハイライト
    const key = type === 'commander' ? 'commander-0' : `soldier-${index}`;
    const slot = this.slotVisuals.get(key);
    if (slot) {
      const bg = slot.getData('background') as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x666666);
    }
  }

  public getSelectedSlot(): { type: string; index?: number } | null {
    return this.selectedSlot;
  }

  // スロットに割り当てられたキャラクターを取得
  private getSlotCharacter(type: 'commander' | 'soldier', index?: number): Character | null {
    const slot = this.formationSlots.find(s => 
      s.slotType === type && (type === 'commander' || s.index === index)
    );
    return slot ? slot.character : null;
  }

  private onProceed(): void {
    // 指揮官が選択されているかチェック
    const commanderSlot = this.formationSlots.find((slot) => slot.slotType === 'commander');
    if (!commanderSlot || !commanderSlot.character) {
      // エラーメッセージを表示
      console.warn('指揮官が選択されていません');
      return;
    }

    // 編成データを作成
    const soldiers = this.formationSlots
      .filter((slot) => slot.slotType === 'soldier')
      .map((slot) => slot.character);

    const formationData: FormationData = {
      commander: commanderSlot.character,
      soldiers,
    };

    // コールバックを実行（アイテム選択画面へ遷移）
    if (this.onProceedToItemSelectionCallback) {
      this.onProceedToItemSelectionCallback(formationData);
    }

    this.destroy();
  }

  // 出撃準備ボタンの状態更新
  private updateProceedButtonState(): void {
    if (!this.proceedButton) return;
    
    const commanderSlot = this.formationSlots.find(s => s.slotType === 'commander');
    const hasCommander = commanderSlot && commanderSlot.character !== null;

    const bg = this.proceedButton.getData('background') as Phaser.GameObjects.Rectangle;
    const text = this.proceedButton.getData('text') as Phaser.GameObjects.Text;

    if (hasCommander) {
      // ボタンを有効化
      bg.setFillStyle(0x555555);
      bg.setInteractive({ useHandCursor: true });
      text.setColor('#ffffff');
    } else {
      // ボタンを無効化
      bg.setFillStyle(0x333333);
      bg.disableInteractive();
      text.setColor('#666666');
    }
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
    const existingSoldierDisplays = this.waitingSoldiersArea.list.filter(
      (child: any) => child.getData && child.getData('isSoldierDisplay'),
    );
    existingSoldierDisplays.forEach((display: any) => display.destroy());

    // エリアサイズを取得
    const areaBg = this.waitingSoldiersArea.list[0] as Phaser.GameObjects.Rectangle;
    const areaWidth = areaBg.width;
    const areaHeight = areaBg.height;

    // グリッド形式：2列×N行
    const cardWidth = 140;
    const cardHeight = 180;
    const spacing = 20;
    const startX = -areaWidth / 2 + cardWidth / 2 + 20;
    const startY = -areaHeight / 2 + 80;
    const columns = 2;

    this.waitingSoldiers.forEach((soldier, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const xPos = startX + col * (cardWidth + spacing);
      const yPos = startY + row * (cardHeight + spacing);
      const soldierDisplay = this.createSoldierDisplay(soldier, xPos, yPos);
      this.waitingSoldiersArea.add(soldierDisplay);
    });
  }

  private createSoldierDisplay(
    soldier: WaitingSoldier,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setData('isSoldierDisplay', true);
    container.setData('character', soldier.character);

    const cardWidth = 140;
    const cardHeight = 180;

    // カード背景
    const bg = this.scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x555555);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(1, 0x888888);
    
    // 利用可能かつ選択スロットがある場合のみインタラクティブに
    const isAssigned = this.assignedSoldiers.has(soldier.character);
    if (!isAssigned && soldier.isAvailable) {
      bg.setInteractive({ useHandCursor: true });
    }
    container.add(bg);

    // 顔画像のプレースホルダー
    const faceSize = 80;
    const facePlaceholder = this.scene.add.rectangle(
      0, 
      -cardHeight / 2 + faceSize / 2 + 10, 
      faceSize, 
      faceSize, 
      0x777777
    );
    facePlaceholder.setStrokeStyle(1, 0x999999);
    container.add(facePlaceholder);

    // キャラクター名
    const nameText = this.scene.add.text(
      0,
      20,
      soldier.character.getName(),
      {
        fontSize: '14px',
        color: isAssigned ? '#888888' : '#ffffff',
        fontStyle: 'bold',
      },
    );
    nameText.setOrigin(0.5);
    container.add(nameText);

    // 職業
    const jobType = soldier.character.getJobType();
    const jobText = this.scene.add.text(
      0,
      45,
      jobType,
      {
        fontSize: '12px',
        color: isAssigned ? '#666666' : '#ffff00',
      },
    );
    jobText.setOrigin(0.5);
    container.add(jobText);

    // ステータス
    const stats = soldier.character.getStats();
    const statsText = this.scene.add.text(
      0,
      70,
      `HP: ${stats.hp}/${stats.maxHp}`,
      {
        fontSize: '11px',
        color: isAssigned ? '#666666' : '#aaaaaa',
      },
    );
    statsText.setOrigin(0.5);
    container.add(statsText);

    // クリックイベント
    if (!isAssigned && soldier.isAvailable) {
      bg.on('pointerover', () => bg.setFillStyle(0x666666));
      bg.on('pointerout', () => bg.setFillStyle(0x555555));
      bg.on('pointerdown', () => this.assignSoldier(soldier.character));
    }

    // 割り当て済みの場合はグレーアウト
    if (isAssigned) {
      bg.setFillStyle(0x333333);
      container.setAlpha(0.5);
    }

    return container;
  }

  // 兵士の割り当て
  public assignSoldier(soldier: Character): void {
    if (!this.selectedSlot) {
      console.warn('スロットが選択されていません');
      return;
    }

    // 選択中のスロットを取得
    const slot = this.formationSlots.find(s => 
      s.slotType === this.selectedSlot!.type && 
      (this.selectedSlot!.type === 'commander' || s.index === this.selectedSlot!.index)
    );

    if (!slot) return;

    // 既に別のスロットに割り当てられている場合は解除
    const existingSlot = this.formationSlots.find(s => s.character === soldier);
    if (existingSlot) {
      this.removeSoldier(existingSlot.slotType, existingSlot.index);
    }

    // 現在のスロットに別の兵士がいる場合は解除
    if (slot.character) {
      this.removeSoldier(slot.slotType, slot.index);
    }

    // 兵士を割り当て
    slot.character = soldier;
    this.assignedSoldiers.add(soldier);

    // スロットの表示を更新
    this.updateSlotDisplay(slot.slotType, slot.index);

    // 待機兵士リストを更新
    this.updateWaitingSoldiersDisplay();

    // ボタン状態を更新
    this.updateProceedButtonState();
  }

  // 兵士の解除
  public removeSoldier(slotType: 'commander' | 'soldier', index?: number): void {
    const slot = this.formationSlots.find(s => 
      s.slotType === slotType && (slotType === 'commander' || s.index === index)
    );

    if (!slot || !slot.character) return;

    // 兵士を解除
    this.assignedSoldiers.delete(slot.character);
    slot.character = null;

    // スロットの表示を更新
    this.updateSlotDisplay(slotType, index);

    // 待機兵士リストを更新
    this.updateWaitingSoldiersDisplay();

    // ボタン状態を更新
    this.updateProceedButtonState();
  }

  // スロット表示の更新
  private updateSlotDisplay(type: 'commander' | 'soldier', index?: number): void {
    const key = type === 'commander' ? 'commander-0' : `soldier-${index}`;
    const slotContainer = this.slotVisuals.get(key);
    if (!slotContainer) return;

    // 既存の内容をクリア（背景以外）
    const toRemove = slotContainer.list.filter((child: any) => 
      child !== slotContainer.getData('background')
    );
    toRemove.forEach((child: any) => child.destroy());

    // スロットに割り当てられたキャラクターを取得
    const character = this.getSlotCharacter(type, index);
    if (!character) return;

    // 顔画像のプレースホルダー
    const faceSize = 60;
    const facePlaceholder = this.scene.add.rectangle(
      0, 
      -20, 
      faceSize, 
      faceSize, 
      0x777777
    );
    facePlaceholder.setStrokeStyle(1, 0x999999);
    slotContainer.add(facePlaceholder);

    // 名前
    const nameText = this.scene.add.text(
      0,
      30,
      character.getName(),
      {
        fontSize: '12px',
        color: '#ffffff',
      },
    );
    nameText.setOrigin(0.5);
    slotContainer.add(nameText);

    // バツマーク
    const removeButton = this.scene.add.container(50, -60);
    const removeBg = this.scene.add.circle(0, 0, 10, 0xff0000);
    removeBg.setInteractive({ useHandCursor: true });
    const removeX = this.scene.add.text(0, 0, '×', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    removeX.setOrigin(0.5);
    removeButton.add([removeBg, removeX]);
    slotContainer.add(removeButton);

    // バツマークのクリックイベント
    removeBg.on('pointerover', () => removeBg.setFillStyle(0xff3333));
    removeBg.on('pointerout', () => removeBg.setFillStyle(0xff0000));
    removeBg.on('pointerdown', () => this.removeSoldier(type, index));
  }

  public show(): void {
    this.setVisible(true);
  }

  public hide(): void {
    this.setVisible(false);
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 親クラスのdestroy
    super.destroy();
  }
}
