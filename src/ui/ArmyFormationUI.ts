import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { Character } from '../character/Character';

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
  private onCancelledCallback?: () => void;

  // UI要素
  private background: Phaser.GameObjects.Rectangle;
  private modalBackground: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // メインコンテンツコンテナ
  private contentContainer!: Phaser.GameObjects.Container;

  // データ管理
  private selectedSlot: { type: 'commander' | 'soldier'; index?: number } | null = null;
  private slotVisuals: Map<string, Phaser.GameObjects.Container> = new Map();

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

    // ボタンの作成
    this.createButtons(panelHeight);

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();

    // スクロール可能にする
    this.setScrollFactor(0);
  }

  private createButtons(panelHeight: number): void {
    // カメラのズーム値を考慮
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    
    // 全体的な座標オフセット
    const xOffset = 42;   // 左右方向への移動（正の値で右へ、負の値で左へ）
    const yOffset = 180; // 下方向へ移動（constructorと同じ値を使用）
    
    // ボタンをパネルの下部に配置
    const buttonY = viewHeight / 2 + panelHeight / 2 - 40 + yOffset;

    // キャンセルボタン（左側）
    this.cancelButton = this.createButton(
      'キャンセル', 
      viewWidth / 2 + 100 + xOffset + 120, 
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

  private onProceed(): void {

    this.destroy();
  }

  private onCancel(): void {
    if (this.onCancelledCallback) {
      this.onCancelledCallback();
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
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 親クラスのdestroy
    super.destroy();
  }
}
