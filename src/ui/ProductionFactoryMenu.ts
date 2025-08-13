import Phaser from 'phaser';
import { ProductionManager, ProductionItemType } from '../production/ProductionManager';

interface ProductionFactoryMenuConfig {
  scene: Phaser.Scene;
  baseId: string;
  productionManager: ProductionManager;
  onCancel?: () => void;
}

/**
 * 生産工場UI（修正版）
 * アイテムクリック問題を解決
 */
export class ProductionFactoryMenu extends Phaser.GameObjects.Container {
  private readonly layoutConfig = {
    panelPadding: 20,
    buttonHeight: 40,
    buttonWidth: 100,
    buttonSpacing: 20,
    itemListWidth: 160,
    queueListWidth: 230,
    rowHeight: 25,
  };

  private modalBackground!: Phaser.GameObjects.Rectangle;
  private background!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private cancelButton!: Phaser.GameObjects.Container;
  private startButton!: Phaser.GameObjects.Container;
  private selectedItemIndex: number = -1;
  private selectedQuantity: number = 1;

  // 数量指定UI要素
  private quantityText!: Phaser.GameObjects.Text;
  private quantityMinusButton!: Phaser.GameObjects.Container;
  private quantityPlusButton!: Phaser.GameObjects.Container;

  // キューライン表示要素
  private queueLineTexts: Phaser.GameObjects.Text[] = [];
  private queueProgressBars: Phaser.GameObjects.Container[] = [];
  private queueRemainingTexts: Phaser.GameObjects.Text[] = [];

  // アイテム選択用の背景要素を保持
  private itemBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private itemTexts: Phaser.GameObjects.Text[] = [];

  private baseId: string;
  private productionManager: ProductionManager;
  private onCancelCallback?: () => void;
  private rightClickHandler?: (pointer: Phaser.Input.Pointer) => void;

  // アイテムタイプのマッピング
  private readonly itemTypeMapping = [
    ProductionItemType.NINJA_SWORD,
    ProductionItemType.SHURIKEN,
    ProductionItemType.BOW,
    ProductionItemType.FOOD_PILL,
  ];

  constructor(config: ProductionFactoryMenuConfig) {
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

    this.baseId = config.baseId;
    this.productionManager = config.productionManager;
    this.onCancelCallback = config.onCancel;

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
    this.titleText = config.scene.add.text(
      0,
      -panelHeight / 2 + this.layoutConfig.panelPadding + 10,
      '生産工場',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
        padding: { top: 5 },
      },
    );
    this.titleText.setOrigin(0.5);
    this.add(this.titleText);

    // 左側：生産可能アイテムリスト
    this.createItemListNew(panelWidth, panelHeight);

    // 中央：数量指定
    this.createQuantityInput(panelWidth, panelHeight);

    // 右側：生産ライン表示
    this.createQueueList(panelWidth, panelHeight);

    // ボタン
    this.createButtons(panelHeight);

    // 入力ハンドラー
    this.setupInputHandlers();

    config.scene.add.existing(this);
    this.setDepth(1000); // 最前面に表示

    // 初期状態では非表示
    this.visible = false;
  }

  /**
   * 生産可能アイテムリストの作成（新版）
   */
  private createItemListNew(panelWidth: number, panelHeight: number): void {
    const startX = -panelWidth / 2 + this.layoutConfig.panelPadding;
    const startY = -panelHeight / 2 + 50;

    // ヘッダー
    const headerText = this.scene.add.text(startX, startY, '生産可能アイテム', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    this.add(headerText);

    // ProductionManagerからアイテムリストを取得
    const items = this.productionManager.getProductionItems();

    // 各アイテムを表示
    let yOffset = startY + 30;
    this.itemTypeMapping.forEach((itemType, index) => {
      const item = items.find((i) => i.type === itemType);
      if (!item) return;

      // 背景（選択ハイライト用）
      const itemBg = this.scene.add.rectangle(
        startX,
        yOffset,
        this.layoutConfig.itemListWidth,
        this.layoutConfig.rowHeight,
        0x333333,
        0.3,
      );
      itemBg.setOrigin(0, 0.5);
      itemBg.setInteractive({ useHandCursor: true });
      this.add(itemBg);
      this.itemBackgrounds.push(itemBg);

      // アイテム名と価格
      const itemText = this.scene.add.text(
        startX + 10,
        yOffset,
        `${item.name} (${item.productionCost}両)`,
        {
          fontSize: '11px',
          color: '#ffffff',
          resolution: 2,
        },
      );
      itemText.setOrigin(0, 0.5);
      this.add(itemText);
      this.itemTexts.push(itemText);

      // 生産時間
      const timeText = this.scene.add.text(
        startX + this.layoutConfig.itemListWidth - 10,
        yOffset,
        `${item.productionTime}秒`,
        {
          fontSize: '10px',
          color: '#999999',
          resolution: 2,
        },
      );
      timeText.setOrigin(1, 0.5);
      this.add(timeText);

      // クリックイベント
      itemBg.on('pointerdown', () => {
        this.selectItemNew(index);
      });

      // ホバー効果
      itemBg.on('pointerover', () => {
        if (index !== this.selectedItemIndex) {
          itemBg.setFillStyle(0x444444, 0.5);
        }
      });

      itemBg.on('pointerout', () => {
        if (index !== this.selectedItemIndex) {
          itemBg.setFillStyle(0x333333, 0.3);
        }
      });

      yOffset += this.layoutConfig.rowHeight + 5;
    });
  }

  /**
   * アイテム選択処理（新版）
   */
  private selectItemNew(index: number): void {
    // 前の選択を解除
    if (this.selectedItemIndex >= 0) {
      this.itemBackgrounds[this.selectedItemIndex].setFillStyle(0x333333, 0.3);
      this.itemTexts[this.selectedItemIndex].setColor('#ffffff');
    }

    // 負のインデックスの場合は選択解除のみ
    if (index < 0) {
      this.selectedItemIndex = -1;
      this.updateButtonState();
      return;
    }

    // 新しい選択
    this.selectedItemIndex = index;
    this.itemBackgrounds[index].setFillStyle(0x5555ff, 0.5);
    this.itemTexts[index].setColor('#ffff00');

    // 数量を1にリセット
    this.selectedQuantity = 1;
    this.quantityText.setText(String(this.selectedQuantity));

    // ボタン状態更新
    this.updateButtonState();
  }

  /**
   * 数量指定UIの作成
   */
  private createQuantityInput(_panelWidth: number, panelHeight: number): void {
    const startX = -40;
    const startY = -panelHeight / 2 + 55;

    // ラベル
    const labelText = this.scene.add.text(startX, startY - 5, '生産数', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    labelText.setOrigin(0.5, 0);
    this.add(labelText);

    // 数量表示コンテナ
    const quantityBg = this.scene.add.rectangle(startX, startY + 31, 60, 35, 0x444444);
    quantityBg.setStrokeStyle(1, 0x666666);
    this.add(quantityBg);

    // 数量テキスト
    this.quantityText = this.scene.add.text(startX, startY + 31, '1', {
      fontSize: '16px',
      color: '#ffffff',
      resolution: 2,
      padding: { top: 5 },
    });
    this.quantityText.setOrigin(0.5);
    this.add(this.quantityText);

    // －ボタン
    this.quantityMinusButton = this.createQuantityButton('-', startX - 20, startY + 64, () => {
      this.adjustQuantity(-1);
    });
    this.add(this.quantityMinusButton);

    // ＋ボタン
    this.quantityPlusButton = this.createQuantityButton('+', startX + 20, startY + 64, () => {
      this.adjustQuantity(1);
    });
    this.add(this.quantityPlusButton);

    // 説明テキスト
    // const helpText = this.scene.add.text(startX, startY + 79, '（1〜99個）', {
    //   fontSize: '10px',
    //   color: '#999999',
    //   resolution: 2,
    // });
    // helpText.setOrigin(0.5, 0);
    // this.add(helpText);
  }

  private createQuantityButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(0, 0, 20, 20, 0x666666);
    buttonBg.setStrokeStyle(1, 0x888888);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x888888);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x666666);
    });

    buttonBg.on('pointerdown', () => {
      onClick();
    });

    return button;
  }

  private adjustQuantity(delta: number): void {
    this.selectedQuantity = Math.max(1, Math.min(99, this.selectedQuantity + delta));
    this.quantityText.setText(String(this.selectedQuantity));
  }

  private createQueueList(_panelWidth: number, panelHeight: number): void {
    const startX = 10;
    const startY = -panelHeight / 2 + 50;

    // ヘッダー
    const headerText = this.scene.add.text(startX, startY, '生産ライン', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    this.add(headerText);

    // 6つの生産ライン
    for (let i = 0; i < 6; i++) {
      const y = startY + 30 + i * this.layoutConfig.rowHeight;

      // ライン背景
      // const lineBg = this.scene.add.rectangle(
      //   startX,
      //   y,
      //   this.layoutConfig.queueListWidth,
      //   this.layoutConfig.rowHeight - 2,
      //   0x333333,
      //   0.5,
      // );
      // lineBg.setOrigin(0, 0.5);
      // lineBg.setStrokeStyle(1, 0x555555);
      // this.add(lineBg);

      // ライン番号と状態
      const lineText = this.scene.add.text(startX + 10, y, `${i + 1}. [空き]`, {
        fontSize: '11px',
        color: '#999999',
        resolution: 2,
      });
      lineText.setOrigin(0, 0.5);
      this.add(lineText);

      // 進捗バーコンテナ
      const progressContainer = this.createProgressBar(startX + 10, y + 10, 0);
      this.add(progressContainer);

      // 残り時間テキスト
      const remainingText = this.scene.add.text(
        startX + this.layoutConfig.queueListWidth - 10,
        y,
        '',
        {
          fontSize: '10px',
          color: '#66ff66',
          resolution: 2,
        },
      );
      remainingText.setOrigin(1, 0.5);
      this.add(remainingText);

      // 参照を保存
      this.queueLineTexts.push(lineText);
      this.queueProgressBars.push(progressContainer);
      this.queueRemainingTexts.push(remainingText);
    }

    // 初期表示を更新
    this.updateQueueDisplay();
  }

  /**
   * 進捗バーコンポーネントの作成
   */
  private createProgressBar(x: number, y: number, progress: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const barWidth = 100;
    const barHeight = 4;

    // 背景
    const bgBar = this.scene.add.rectangle(0, 0, barWidth, barHeight, 0x222222);
    bgBar.setOrigin(0, 0.5);
    bgBar.setStrokeStyle(1, 0x444444);

    // 進捗バー
    const progressBar = this.scene.add.rectangle(
      0,
      0,
      barWidth * progress,
      barHeight - 1,
      0x00ff00,
    );
    progressBar.setOrigin(0, 0.5);

    container.add([bgBar, progressBar]);
    container.setData('progressBar', progressBar);
    container.setData('maxWidth', barWidth);
    container.visible = false; // 初期は非表示

    return container;
  }

  /**
   * 進捗バーの更新
   */
  private updateProgressBar(container: Phaser.GameObjects.Container, progress: number): void {
    const progressBar = container.getData('progressBar') as Phaser.GameObjects.Rectangle;
    const maxWidth = container.getData('maxWidth') as number;
    progressBar.width = Math.max(0, Math.min(1, progress)) * maxWidth;
  }

  /**
   * 残り時間のフォーマット
   */
  private formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return '';

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private updateQueueDisplay(): void {
    const queues = this.productionManager.getProductionQueues(this.baseId);
    const progressData = this.productionManager.getProgressData(this.baseId);

    queues.forEach((queue, index) => {
      const lineText = this.queueLineTexts[index];
      const progressBar = this.queueProgressBars[index];
      const remainingText = this.queueRemainingTexts[index];

      if (!lineText || !progressBar || !remainingText) return;

      if (queue && progressData[index]) {
        const progress = progressData[index]!;

        // テキスト更新：「アイテム名 現在数/合計数」形式で表示
        lineText.setText(`${index + 1}. ${progress.displayText}`);
        lineText.setColor('#ffffff');

        // 進捗バー更新
        progressBar.visible = true;
        this.updateProgressBar(progressBar, progress.currentItemProgress);

        // 残り時間更新
        remainingText.setText(this.formatRemainingTime(progress.remainingTime));
        remainingText.visible = true;
      } else {
        // 空きラインの場合
        lineText.setText(`${index + 1}. [空き]`);
        lineText.setColor('#999999');
        progressBar.visible = false;
        remainingText.visible = false;
      }
    });
  }

  private createButtons(panelHeight: number): void {
    // ボタンをパネルの下部に配置
    const buttonY =
      panelHeight / 2 - this.layoutConfig.buttonHeight - this.layoutConfig.panelPadding + 20;

    // キャンセルボタン
    // 真ん中
    const buttonX = 0;
    this.cancelButton = this.createButton('とじる', buttonX, buttonY, () => {
      this.onCancel();
    });
    this.add(this.cancelButton);

    // 生産を追加ボタン
    // const startButtonX = this.layoutConfig.buttonWidth / 2 + this.layoutConfig.buttonSpacing / 2;
    const startButtonX = -40;
    const addButtonY = -panelHeight / 2 + 155;
    this.startButton = this.createButton(
      '追加→',
      startButtonX,
      addButtonY,
      () => {
        this.onStartProduction();
      },
      60,
    );
    this.add(this.startButton);

    // 初期状態では生産開始ボタンを無効化
    this.updateButtonState();
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
    width?: number,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(
      0,
      0,
      width ?? this.layoutConfig.buttonWidth,
      this.layoutConfig.buttonHeight,
      0x444444,
    );
    bg.setStrokeStyle(2, 0x666666);
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    label.setOrigin(0.5);

    button.add([bg, label]);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0x555555));
    bg.on('pointerout', () => bg.setFillStyle(0x444444));

    return button;
  }

  private updateButtonState(): void {
    // 生産開始ボタンの有効/無効を切り替え
    const startBg = this.startButton.getAt(0) as Phaser.GameObjects.Rectangle;
    const startLabel = this.startButton.getAt(1) as Phaser.GameObjects.Text;

    if (this.selectedItemIndex >= 0) {
      startBg.setFillStyle(0x4444ff);
      startLabel.setColor('#ffffff');
      startBg.setInteractive();
    } else {
      startBg.setFillStyle(0x333333);
      startLabel.setColor('#666666');
      startBg.disableInteractive();
    }
  }

  private setupInputHandlers(): void {
    // 右クリックでキャンセル
    this.rightClickHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() && this.visible) {
        this.onCancel();
      }
    };

    // モーダル背景クリックでキャンセル
    this.modalBackground.setInteractive();
    this.modalBackground.on('pointerdown', () => {
      this.onCancel();
    });

    // メインパネルのクリックではキャンセルしない
    this.background.setInteractive();
    this.background.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      // イベントの伝播を止める（Phaserではevent.stopPropagation()は使用しない）
      // 代わりに、モーダル背景のクリックイベントを無効化
    });

    // グローバルな右クリックイベントを登録
    this.scene.input.on('pointerdown', this.rightClickHandler);
  }

  private onCancel(): void {
    this.hide();
    this.onCancelCallback?.();
  }

  private onStartProduction(): void {
    if (this.selectedItemIndex < 0) return;

    const itemType = this.itemTypeMapping[this.selectedItemIndex];
    const quantity = this.selectedQuantity;

    // スロットの空き確認
    if (!this.productionManager.hasAvailableSlot(this.baseId)) {
      console.log('生産ラインが満杯です');
      return;
    }

    // 生産ラインに追加
    const lineIndex = this.productionManager.addToQueue(this.baseId, itemType, quantity);

    if (lineIndex !== null) {
      // アイテム名を取得
      const itemDef = this.productionManager
        .getProductionItems()
        .find((item) => item.type === itemType);
      const itemName = itemDef ? itemDef.name : '不明なアイテム';

      console.log(`生産開始: ${itemName} x${quantity}`);

      // キュー表示を更新
      this.updateQueueDisplay();

      // 選択をリセット
      this.selectItemNew(-1);
      this.selectedItemIndex = -1;
      this.selectedQuantity = 1;
      this.quantityText.setText('1');
      this.updateButtonState();
    } else {
      console.log(`生産開始失敗: キューが満杯またはエラー`);
    }
  }

  public show(): void {
    this.visible = true;
    // 表示時に最新のキュー状態を取得
    this.updateQueueDisplay();
  }

  public hide(): void {
    this.visible = false;
    // 選択状態をリセット
    if (this.selectedItemIndex >= 0) {
      this.itemBackgrounds[this.selectedItemIndex].setFillStyle(0x333333, 0.3);
      this.itemTexts[this.selectedItemIndex].setColor('#ffffff');
    }
    this.selectedItemIndex = -1;
    this.selectedQuantity = 1;
  }

  public updatePosition(): void {
    // UIManagerから呼ばれる位置更新（必要に応じて実装）
  }

  /**
   * 定期的な更新処理（UIManagerのupdateから呼ばれる）
   */
  public update(): void {
    if (this.visible) {
      this.updateQueueDisplay();
    }
  }

  public destroy(): void {
    // 右クリックハンドラーを削除
    if (this.rightClickHandler) {
      this.scene.input.off('pointerdown', this.rightClickHandler);
    }
    super.destroy();
  }
}
