import Phaser from 'phaser';

interface ProductionFactoryMenuConfig {
  scene: Phaser.Scene;
  onCancel?: () => void;
  onStartProduction?: () => void;
}

/**
 * 生産工場UI
 * ArmyFormationUIと同じデザインパターンで実装
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
  private itemListContainer!: Phaser.GameObjects.Container;
  private queueListContainer!: Phaser.GameObjects.Container;
  private selectedItemIndex: number = -1;

  private onCancelCallback?: () => void;
  private onStartProductionCallback?: () => void;

  // 仮の生産アイテムデータ
  private readonly productionItems = [
    { name: '忍者刀', cost: 300, time: 60 },
    { name: '手裏剣', cost: 200, time: 60 },
    { name: '弓', cost: 400, time: 60 },
    { name: '兵糧丸', cost: 50, time: 60 },
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

    this.onCancelCallback = config.onCancel;
    this.onStartProductionCallback = config.onStartProduction;

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

    // 左側：生産可能アイテムリスト
    this.createItemList(panelWidth, panelHeight);

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
  }

  private createItemList(panelWidth: number, panelHeight: number): void {
    const startX = -panelWidth / 2 + this.layoutConfig.panelPadding * 2;
    const startY = -panelHeight / 2 + 50;

    this.itemListContainer = this.scene.add.container(startX, startY);
    this.add(this.itemListContainer);

    // ヘッダー
    const headerText = this.scene.add.text(0, 0, '生産可能アイテム', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    this.itemListContainer.add(headerText);

    // アイテムリスト
    this.productionItems.forEach((item, index) => {
      const y = 30 + index * this.layoutConfig.rowHeight;

      // 背景（選択時のハイライト用）
      const itemBg = this.scene.add.rectangle(
        0,
        y,
        this.layoutConfig.itemListWidth,
        this.layoutConfig.rowHeight - 2,
        0x444444,
        0,
      );
      itemBg.setOrigin(0, 0.5);
      itemBg.setInteractive({ useHandCursor: true });
      itemBg.setData('index', index);

      // アイテム名と費用
      const itemText = this.scene.add.text(10, y, `${item.name} (${item.cost}両)`, {
        fontSize: '11px',
        color: '#ffffff',
        resolution: 2,
      });
      itemText.setOrigin(0, 0.5);

      this.itemListContainer.add([itemBg, itemText]);

      // クリックイベント
      itemBg.on('pointerdown', () => {
        this.selectItem(index);
      });

      itemBg.on('pointerover', () => {
        if (this.selectedItemIndex !== index) {
          itemBg.setAlpha(0.3);
        }
      });

      itemBg.on('pointerout', () => {
        if (this.selectedItemIndex !== index) {
          itemBg.setAlpha(0);
        }
      });
    });
  }

  private createQueueList(_panelWidth: number, panelHeight: number): void {
    const startX = 10;
    const startY = -panelHeight / 2 + 50;

    this.queueListContainer = this.scene.add.container(startX, startY);
    this.add(this.queueListContainer);

    // ヘッダー
    const headerText = this.scene.add.text(0, 0, '生産キュー', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 5 },
    });
    this.queueListContainer.add(headerText);

    // 6つの生産ライン
    for (let i = 0; i < 6; i++) {
      const y = 30 + i * this.layoutConfig.rowHeight;

      // ライン背景
      const lineBg = this.scene.add.rectangle(
        0,
        y,
        this.layoutConfig.queueListWidth,
        this.layoutConfig.rowHeight - 2,
        0x333333,
        0.5,
      );
      lineBg.setOrigin(0, 0.5);
      lineBg.setStrokeStyle(1, 0x555555);

      // ライン番号と状態
      const lineText = this.scene.add.text(10, y, `${i + 1}. [空き]`, {
        fontSize: '11px',
        color: '#999999',
        resolution: 2,
      });
      lineText.setOrigin(0, 0.5);

      this.queueListContainer.add([lineBg, lineText]);
    }
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

    // 生産開始ボタン
    const startButtonX = this.layoutConfig.buttonWidth / 2 + this.layoutConfig.buttonSpacing / 2;
    this.startButton = this.createButton('生産開始', startButtonX, buttonY, () => {
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

  private selectItem(index: number): void {
    // 前の選択をクリア
    if (this.selectedItemIndex >= 0) {
      const items = this.itemListContainer.list as Phaser.GameObjects.GameObject[];
      const prevBg = items[this.selectedItemIndex * 2 + 2] as Phaser.GameObjects.Rectangle;
      if (prevBg) {
        prevBg.setAlpha(0);
      }
    }

    // 新しい選択
    this.selectedItemIndex = index;
    const items = this.itemListContainer.list as Phaser.GameObjects.GameObject[];
    const bg = items[index * 2 + 2] as Phaser.GameObjects.Rectangle;
    if (bg) {
      bg.setAlpha(0.5);
    }

    // ボタン状態を更新
    this.updateButtonState();
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
    if (this.selectedItemIndex >= 0) {
      const item = this.productionItems[this.selectedItemIndex];
      console.log(`生産開始: ${item.name}`);
      if (this.onStartProductionCallback) {
        this.onStartProductionCallback();
      }
    }
  }

  public show(): void {
    this.setVisible(true);
  }

  public hide(): void {
    this.setVisible(false);
    this.selectedItemIndex = -1;
    this.updateButtonState();
  }

  public updatePosition(centerX: number, centerY: number): void {
    this.setPosition(centerX, centerY);
  }

  public destroy(): void {
    // 入力イベントのクリーンアップ
    this.scene.input.off('pointerdown');
    super.destroy();
  }
}
