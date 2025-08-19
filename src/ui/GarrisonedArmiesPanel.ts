import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { Army } from '../army/Army';
import { Character } from '../character/Character';

export interface GarrisonedArmiesPanelConfig {
  scene: Phaser.Scene;
  base: Base;
  armies: Army[];
  onProceedToItemSelection?: (army: Army) => void;
  onCancel?: () => void;
}

export class GarrisonedArmiesPanel extends Phaser.GameObjects.Container {
  private onCancelCallback?: () => void;
  private onProceedCallback?: (army: Army) => void;

  // UI要素
  private modalBackground: Phaser.GameObjects.Rectangle;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // レイアウト設定（ArmyFormationUIと同じ）
  private readonly layoutConfig = {
    panelPadding: 20,
    buttonHeight: 40,
    buttonWidth: 100,
    buttonSpacing: 20,
    tableHeaderY: -105,
    tableYOffset: 40,
    tableRowHeight: 25,
    tableWidth: 440,
    buttonMarginTop: 0,
  };

  // メインコンテンツコンテナ
  private contentContainer!: Phaser.GameObjects.Container;

  // データ管理
  private armies: Army[];
  private currentArmyIndex: number = 0;
  private base: Base;

  // ページネーション
  private prevButton?: Phaser.GameObjects.Container;
  private nextButton?: Phaser.GameObjects.Container;
  private pageText?: Phaser.GameObjects.Text;

  // メンバー表示用コンテナ
  private memberRows: Phaser.GameObjects.Container[] = [];

  // ボタン
  private proceedButton!: Phaser.GameObjects.Container;
  private cancelButton!: Phaser.GameObjects.Container;

  constructor(config: GarrisonedArmiesPanelConfig) {
    // カメラのズーム値を考慮
    const cam = config.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    // ワールド座標系に配置
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    super(config.scene, centerX, centerY);

    this.onCancelCallback = config.onCancel;
    this.onProceedCallback = config.onProceedToItemSelection;
    this.armies = config.armies;
    this.base = config.base;

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

    // メインコンテンツコンテナ
    this.contentContainer = config.scene.add.container(0, 0);
    this.add(this.contentContainer);

    // タイトル
    this.titleText = config.scene.add.text(0, -panelHeight / 2 + 30, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: {top: 5,},
    });
    this.titleText.setOrigin(0.5);
    this.contentContainer.add(this.titleText);

    // UIを構築
    this.createUI();

    // 最初の軍団を表示
    this.displayCurrentArmy();

    // シーンに追加
    config.scene.add.existing(this);

    // 最前面に表示
    this.setDepth(1001);

    // 入力イベントの設定
    this.setupInputHandlers();
  }

  private createUI(): void {
    // タイトルを設定
    this.titleText.setText(`駐留軍団管理 - ${this.base.getName()}`);

    // 軍団名とページ番号
    this.createArmyHeader();

    // テーブルヘッダーとメンバー表示エリアを作成
    this.createMemberTable();

    // ページネーションコントロール（複数軍団がある場合）
    if (this.armies.length > 1) {
      this.createPaginationControls();
    }

    // ボタンを作成
    this.createButtons();
  }

  private createArmyHeader(): void {
    const headerY = -80;
    const armyNameText = this.scene.add.text(-220, headerY, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    armyNameText.setOrigin(0, 0.5);
    this.contentContainer.add(armyNameText);
    armyNameText.setData('type', 'armyName');

    // ページ番号
    const pageText = this.scene.add.text(200, headerY, '', {
      fontSize: '12px',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    pageText.setOrigin(1, 0.5);
    this.contentContainer.add(pageText);
    pageText.setData('type', 'pageNumber');
  }

  private createMemberTable(): void {
    const tableX = -this.layoutConfig.tableWidth / 2;
    const tableY = this.layoutConfig.tableHeaderY + this.layoutConfig.tableYOffset;

    // ヘッダーの作成
    this.createTableHeader(tableX, tableY);
  }

  private createTableHeader(x: number, y: number): void {
    const headers = [
      { text: '名前', width: 80 },
      { text: '職業', width: 50 },
      { text: 'HP', width: 40 },
      { text: '攻撃', width: 40 },
      { text: '防御', width: 40 },
      { text: '速さ', width: 40 },
      { text: '移動', width: 40 },
      { text: '視界', width: 40 },
      { text: '役職', width: 50 },
    ];

    let currentX = x;
    headers.forEach((header) => {
      const text = this.scene.add.text(currentX, y, header.text, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
        padding: { x: 0, y: 4 },
      });
      this.contentContainer.add(text);
      currentX += header.width;
    });

    // ヘッダー下線
    const line = this.scene.add.rectangle(
      x + this.layoutConfig.tableWidth / 2,
      y + 15,
      this.layoutConfig.tableWidth,
      1,
      0xffffff,
    );
    line.setOrigin(0.5, 0.5);
    this.contentContainer.add(line);
  }

  private displayCurrentArmy(): void {
    if (this.armies.length === 0) return;

    // 既存のメンバー行をクリア
    this.clearMemberRows();

    const currentArmy = this.armies[this.currentArmyIndex];

    // 軍団名を更新
    const armyNameText = this.contentContainer.list.find(
      (child: any) => child.getData && child.getData('type') === 'armyName',
    ) as Phaser.GameObjects.Text;
    if (armyNameText) {
      armyNameText.setText(`軍団名: ${currentArmy.getName()}`);
    }

    // ページ番号を更新
    const pageText = this.contentContainer.list.find(
      (child: any) => child.getData && child.getData('type') === 'pageNumber',
    ) as Phaser.GameObjects.Text;
    if (pageText) {
      pageText.setText(`軍団 ${this.currentArmyIndex + 1}/${this.armies.length}`);
    }

    // メンバーを表示
    const members = currentArmy.getAllMembers();
    const tableX = -this.layoutConfig.tableWidth / 2;
    const startY = this.layoutConfig.tableHeaderY + 20 + this.layoutConfig.tableYOffset;

    members.forEach((member, index) => {
      const isCommander = index === 0; // 最初のメンバーが指揮官
      this.createMemberRow(
        member,
        tableX,
        startY + index * this.layoutConfig.tableRowHeight,
        index,
        isCommander,
      );
    });
  }

  private createMemberRow(
    member: Character,
    x: number,
    y: number,
    index: number,
    isCommander: boolean,
  ): void {
    const rowContainer = this.scene.add.container(0, 0);

    // 偶数行の背景
    if (index % 2 === 0) {
      const bg = this.scene.add.rectangle(
        x + this.layoutConfig.tableWidth / 2,
        y + 10,
        this.layoutConfig.tableWidth,
        24,
        0x333333,
      );
      bg.setOrigin(0.5, 0.5);
      rowContainer.add(bg);
    }

    // メンバーデータの表示
    const stats = member.getStats();
    const columns = [
      { text: member.getName(), width: 80 },
      { text: this.getJobDisplayName(member.getJobType()), width: 50 },
      { text: `${stats.hp}/${stats.maxHp}`, width: 40 },
      { text: stats.attack.toString(), width: 40 },
      { text: stats.defense.toString(), width: 40 },
      { text: stats.speed.toString(), width: 40 },
      { text: stats.moveSpeed.toString(), width: 40 },
      { text: stats.sight.toString(), width: 40 },
      { text: isCommander ? '指揮官' : '', width: 50 },
    ];

    let currentX = x;
    columns.forEach((column) => {
      const textColor = isCommander && column.text === '指揮官' ? '#ffaa00' : '#ffffff';
      const text = this.scene.add.text(currentX, y, column.text, {
        fontSize: '11px',
        color: textColor,
        resolution: 2,
      });
      rowContainer.add(text);
      currentX += column.width;
    });

    this.contentContainer.add(rowContainer);
    this.memberRows.push(rowContainer);
  }

  private clearMemberRows(): void {
    this.memberRows.forEach((row) => row.destroy());
    this.memberRows = [];
  }

  private createPaginationControls(): void {
    const paginationY = 80;

    // 前へボタン
    this.prevButton = this.createNavigationButton('< 前へ', -180, paginationY, () => {
      this.navigateToPreviousArmy();
    });
    this.contentContainer.add(this.prevButton);

    // 次へボタン
    this.nextButton = this.createNavigationButton('次へ >', 180, paginationY, () => {
      this.navigateToNextArmy();
    });
    this.contentContainer.add(this.nextButton);
  }

  private createNavigationButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(0, 0, 80, 30, 0x555555);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '10px',
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

  private navigateToPreviousArmy(): void {
    if (this.armies.length <= 1) return;

    this.currentArmyIndex--;
    if (this.currentArmyIndex < 0) {
      this.currentArmyIndex = this.armies.length - 1;
    }

    this.displayCurrentArmy();
    this.updatePaginationText();
  }

  private navigateToNextArmy(): void {
    if (this.armies.length <= 1) return;

    this.currentArmyIndex++;
    if (this.currentArmyIndex >= this.armies.length) {
      this.currentArmyIndex = 0;
    }

    this.displayCurrentArmy();
    this.updatePaginationText();
  }

  private updatePaginationText(): void {
    if (this.pageText) {
      this.pageText.setText(`ページ ${this.currentArmyIndex + 1}/${this.armies.length}`);
    }
  }

  private createButtons(): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewHeight = 720 / zoom;
    const panelHeight = viewHeight * 0.9;
    const buttonY = panelHeight / 2 - 60;

    // アイテム装備へボタン
    this.proceedButton = this.createButton('アイテム装備へ', -60, buttonY, () => {
      this.onProceed();
    });
    this.contentContainer.add(this.proceedButton);

    // キャンセルボタン
    this.cancelButton = this.createButton('キャンセル', 60, buttonY, () => {
      this.onCancel();
    });
    this.contentContainer.add(this.cancelButton);
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
      0x666666,
    );
    buttonBg.setStrokeStyle(2, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
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

    buttonBg.on('pointerdown', onClick);

    return button;
  }

  private setupInputHandlers(): void {
    // 背景クリックでキャンセルしないようにする
    this.modalBackground.setInteractive();
    this.background.setInteractive();

    // ESCキーでキャンセル
    const escKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (escKey) {
      escKey.once('down', () => {
        this.onCancel();
      });
    }
  }

  private onProceed(): void {
    if (this.onProceedCallback && this.armies[this.currentArmyIndex]) {
      const currentArmy = this.armies[this.currentArmyIndex];
      this.onProceedCallback(currentArmy);
    }
  }

  private onCancel(): void {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.destroy();
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
        return jobType;
    }
  }

  public show(): void {
    this.setVisible(true);
    this.setActive(true);
  }

  public hide(): void {
    this.setVisible(false);
    this.setActive(false);
  }

  public destroy(): void {
    this.clearMemberRows();
    super.destroy();
  }
}
