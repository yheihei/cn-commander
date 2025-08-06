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
    itemListWidth: 180,
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

  // アイテム選択用の背景要素を保持
  private itemBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private itemTexts: Phaser.GameObjects.Text[] = [];

  private baseId: string;
  private productionManager: ProductionManager;
  private onCancelCallback?: () => void;

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
      -panelHeight / 2 + this.layoutConfig.panelPadding,
      '生産工場',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
        padding: { x: 10, y: 5 },
      },
    );
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // 左側：生産可能アイテムリスト（新しい方法で実装）
    this.createItemListNew(panelWidth, panelHeight);

    // 中央：数量指定UI
    this.createQuantityInput(panelWidth, panelHeight);

    // 右側：生産キューリスト
    this.createQueueList(panelWidth, panelHeight);

    // ボタンの作成
    this.createButtons(panelHeight);

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();
    
    console.log('ProductionFactoryMenu(Fixed) initialized');
  }

  /**
   * 新しいアイテムリスト作成方法（クリック問題を解決）
   */
  private createItemListNew(panelWidth: number, panelHeight: number): void {
    const startX = -panelWidth / 2 + this.layoutConfig.panelPadding * 2 - 20;
    const startY = -panelHeight / 2 + 50;

    // ProductionManagerからアイテムリストを取得
    const productionItems = this.productionManager.getProductionItems();

    // ヘッダー
    const headerText = this.scene.add.text(startX, startY, '生産可能アイテム', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    this.add(headerText);
    
    // アイテムリスト（直接Containerに追加）
    productionItems.forEach((item, index) => {
      const y = startY + 30 + index * this.layoutConfig.rowHeight;

      // 背景（選択時のハイライト用）
      const itemBg = this.scene.add.rectangle(
        startX,
        y,
        this.layoutConfig.itemListWidth - 20,
        this.layoutConfig.rowHeight - 2,
        0x444444,
        1.0,
      );
      itemBg.setOrigin(0, 0.5);
      itemBg.setStrokeStyle(1, 0x666666);
      
      // アイテム名と費用
      const itemText = this.scene.add.text(
        startX, 
        y, 
        `${item.name} (${item.productionCost}両)`, 
        {
          fontSize: '11px',
          color: '#ffffff',
          resolution: 2,
        }
      );
      itemText.setOrigin(0, 0.5);

      // Containerに直接追加
      this.add(itemBg);
      this.add(itemText);
      
      // 配列に保存（後で参照するため）
      this.itemBackgrounds.push(itemBg);
      this.itemTexts.push(itemText);
      
      // インタラクティブ設定（追加後に設定）
      itemBg.setInteractive({ useHandCursor: true });
      
      // クリックイベント
      itemBg.on('pointerdown', () => {
        console.log(`Item clicked (fixed): index=${index}, item=${item.name}`);
        this.selectItemNew(index);
      });

      itemBg.on('pointerover', () => {
        if (this.selectedItemIndex !== index) {
          itemBg.setFillStyle(0x555555);
        }
      });

      itemBg.on('pointerout', () => {
        if (this.selectedItemIndex !== index) {
          itemBg.setFillStyle(0x444444);
        }
      });
    });
  }

  /**
   * 新しいアイテム選択メソッド
   */
  private selectItemNew(index: number): void {
    console.log(`selectItemNew called: index=${index}`);
    
    // 前の選択をクリア
    if (this.selectedItemIndex >= 0 && this.selectedItemIndex < this.itemBackgrounds.length) {
      const prevBg = this.itemBackgrounds[this.selectedItemIndex];
      if (prevBg) {
        prevBg.setFillStyle(0x444444);
      }
    }

    // 新しい選択
    this.selectedItemIndex = index;
    if (index >= 0 && index < this.itemBackgrounds.length) {
      const bg = this.itemBackgrounds[index];
      if (bg) {
        bg.setFillStyle(0x00aa00); // 緑色で選択を表示
      }
    }

    // ボタン状態を更新
    this.updateButtonState();
  }

  private createQuantityInput(_panelWidth: number, panelHeight: number): void {
    const startX = -40;
    const startY = -panelHeight / 2 + 55;

    // ラベル
    const labelText = this.scene.add.text(startX, startY-5, '生産数', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 }
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
      padding: { top: 5 }
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
    const newQuantity = this.selectedQuantity + delta;
    
    // 1〜99の範囲内に制限
    if (newQuantity >= 1 && newQuantity <= 99) {
      this.selectedQuantity = newQuantity;
      this.quantityText.setText(this.selectedQuantity.toString());
    }
  }

  private createQueueList(_panelWidth: number, panelHeight: number): void {
    const startX = 10;
    const startY = -panelHeight / 2 + 50;

    // ヘッダー
    const headerText = this.scene.add.text(startX, startY, '生産キュー', {
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
      const lineBg = this.scene.add.rectangle(
        startX,
        y,
        this.layoutConfig.queueListWidth,
        this.layoutConfig.rowHeight - 2,
        0x333333,
        0.5,
      );
      lineBg.setOrigin(0, 0.5);
      lineBg.setStrokeStyle(1, 0x555555);
      this.add(lineBg);

      // ライン番号と状態
      const lineText = this.scene.add.text(startX + 10, y, `${i + 1}. [空き]`, {
        fontSize: '11px',
        color: '#999999',
        resolution: 2,
      });
      lineText.setOrigin(0, 0.5);
      this.add(lineText);
      
      // 参照を保存
      this.queueLineTexts.push(lineText);
    }
    
    // 初期表示を更新
    this.updateQueueDisplay();
  }
  
  private updateQueueDisplay(): void {
    const queues = this.productionManager.getProductionQueues(this.baseId);
    const progressData = this.productionManager.getProgressData(this.baseId);
    
    queues.forEach((queue, index) => {
      const lineText = this.queueLineTexts[index];
      if (!lineText) return;
      
      if (queue && progressData[index]) {
        // キューがある場合は「アイテム名 現在数/合計数」形式で表示
        lineText.setText(`${index + 1}. ${progressData[index]!.displayText}`);
        lineText.setColor('#ffffff');
      } else {
        // 空きラインの場合
        lineText.setText(`${index + 1}. [空き]`);
        lineText.setColor('#999999');
      }
    });
  }

  private createButtons(panelHeight: number): void {
    // ボタンをパネルの下部に配置
    const buttonY =
      panelHeight / 2 - this.layoutConfig.buttonHeight - this.layoutConfig.panelPadding + 20;

    // キャンセルボタン
    const buttonX = -this.layoutConfig.buttonWidth / 2 - this.layoutConfig.buttonSpacing / 2;
    this.cancelButton = this.createButton('キャンセル', buttonX, buttonY, () => {
      this.onCancel();
    });
    this.add(this.cancelButton);

    // 生産を追加ボタン
    const startButtonX = this.layoutConfig.buttonWidth / 2 + this.layoutConfig.buttonSpacing / 2;
    this.startButton = this.createButton('生産を追加', startButtonX, buttonY, () => {
      this.onStartProduction();
    });
    this.add(this.startButton);

    // 初期状態では生産開始ボタンを無効化
    this.updateButtonState();
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
      this.layoutConfig.buttonWidth,
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

    // Store references for later access
    button.setData('background', buttonBg);
    button.setData('text', buttonText);

    buttonBg.on('pointerover', () => {
      if (button.getData('enabled') !== false) {
        buttonBg.setFillStyle(0x777777);
      }
    });

    buttonBg.on('pointerout', () => {
      if (button.getData('enabled') !== false) {
        buttonBg.setFillStyle(0x555555);
      }
    });

    buttonBg.on('pointerdown', () => {
      if (button.getData('enabled') !== false) {
        onClick();
      }
    });

    return button;
  }

  private updateButtonState(): void {
    const isEnabled = this.selectedItemIndex >= 0;
    const bg = this.startButton.getData('background') as Phaser.GameObjects.Rectangle;
    const text = this.startButton.getData('text') as Phaser.GameObjects.Text;

    if (isEnabled) {
      bg.setFillStyle(0x555555);
      text.setColor('#ffffff');
      this.startButton.setData('enabled', true);
    } else {
      bg.setFillStyle(0x333333);
      text.setColor('#777777');
      this.startButton.setData('enabled', false);
    }
  }

  private setupInputHandlers(): void {
    // 背景クリックでキャンセル
    this.modalBackground.setInteractive();
    this.modalBackground.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // メインパネル内のクリックは無視
        const panelBounds = this.background.getBounds();
        const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
        if (!panelBounds.contains(worldPoint.x, worldPoint.y)) {
          event.stopPropagation();
          this.onCancel();
        }
      },
    );

    // 右クリックでキャンセル
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() && this.visible) {
        this.onCancel();
      }
    });
  }

  private onCancel(): void {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
  }

  private onStartProduction(): void {
    console.log(`onStartProduction called: selectedIndex=${this.selectedItemIndex}, quantity=${this.selectedQuantity}`);
    
    if (this.selectedItemIndex < 0) {
      console.warn('No item selected');
      return;
    }

    // 選択されたアイテムタイプを取得
    const itemType = this.itemTypeMapping[this.selectedItemIndex];
    if (!itemType) {
      console.warn(`Invalid item type for index ${this.selectedItemIndex}`);
      return;
    }
    
    console.log(`Selected item type: ${itemType}`);

    // 空きラインがあるか確認
    if (!this.productionManager.hasAvailableSlot(this.baseId)) {
      console.warn('No available production lines');
      // TODO: エラーメッセージを表示
      return;
    }

    // キューに追加（「0/指定数」形式で追加される）
    const lineIndex = this.productionManager.addToQueue(
      this.baseId,
      itemType,
      this.selectedQuantity
    );

    if (lineIndex !== null) {
      console.log(`Production added to line ${lineIndex + 1}`);
      
      // キュー表示を更新
      this.updateQueueDisplay();
      
      // 選択をリセット
      if (this.selectedItemIndex >= 0 && this.selectedItemIndex < this.itemBackgrounds.length) {
        const bg = this.itemBackgrounds[this.selectedItemIndex];
        if (bg) {
          bg.setFillStyle(0x444444); // 元の色に戻す
        }
      }
      
      this.selectedItemIndex = -1;
      this.selectedQuantity = 1;
      this.quantityText.setText('1');
      this.updateButtonState();
    }
  }

  public show(): void {
    console.log(`ProductionFactoryMenu(Fixed).show() called for base: ${this.baseId}`);
    
    // 拠点を初期化（まだ初期化されていない場合）
    this.productionManager.initializeBase(this.baseId);
    console.log(`Initialized/checked production lines for base: ${this.baseId}`);
    
    this.setVisible(true);
    // 表示時にキューを更新
    this.updateQueueDisplay();
  }

  public hide(): void {
    this.setVisible(false);
    this.selectedItemIndex = -1;
    this.selectedQuantity = 1;
    if (this.quantityText) {
      this.quantityText.setText('1');
    }
    this.updateButtonState();
  }

  public updatePosition(centerX: number, centerY: number): void {
    this.setPosition(centerX, centerY);
  }

  public destroy(): void {
    // 入力イベントのクリーンアップ
    this.scene.input.off('pointerdown');
    
    // 配列をクリア
    this.itemBackgrounds = [];
    this.itemTexts = [];
    this.queueLineTexts = [];
    
    super.destroy();
  }
}