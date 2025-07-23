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
  soldiers: Character[];
}

export class ArmyFormationUI extends Phaser.GameObjects.Container {
  private onCancelledCallback?: () => void;
  private onProceedCallback?: (data: FormationData) => void;

  // UI要素
  private background: Phaser.GameObjects.Rectangle;
  private modalBackground: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;

  // レイアウト設定（中央集約管理）
  private readonly layoutConfig = {
    panelPadding: 20,
    buttonHeight: 40,
    buttonWidth: 100,
    buttonSpacing: 20,
    tableHeaderY: -120,
    tableRowHeight: 25,
    tableWidth: 440,
  };

  // メインコンテンツコンテナ
  private contentContainer!: Phaser.GameObjects.Container;

  // データ管理
  private waitingSoldiers: Character[] = [];
  private selectedCommander: Character | null = null;
  private selectedSoldiers: Character[] = [];
  private soldierRows: Map<string, Phaser.GameObjects.Container> = new Map();

  // ボタン
  private proceedButton!: Phaser.GameObjects.Container;
  private cancelButton!: Phaser.GameObjects.Container;

  constructor(config: ArmyFormationUIConfig) {
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

    this.onCancelledCallback = config.onCancelled;
    this.onProceedCallback = config.onProceedToItemSelection;

    // 画面全体を覆う半透明の背景
    this.modalBackground = config.scene.add.rectangle(
      0, // コンテナの中心からの相対位置
      0,
      viewWidth, // ビューポート全体をカバー
      viewHeight, // ビューポート全体をカバー
      0x000000,
      0.5,
    );
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景
    const panelWidth = viewWidth * 0.9; // 画面の90%
    const panelHeight = viewHeight * 0.85; // 画面の85%
    this.background = config.scene.add.rectangle(
      0, // コンテナの中心からの相対位置
      0,
      panelWidth,
      panelHeight,
      0x222222,
      0.95,
    );
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル
    const titleText = `軍団編成`;
    this.titleText = config.scene.add.text(
      0,
      -panelHeight / 2 + this.layoutConfig.panelPadding,
      titleText,
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
      },
    );
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // コンテンツコンテナを作成
    this.contentContainer = config.scene.add.container(0, this.layoutConfig.panelPadding);
    this.add(this.contentContainer);

    // ボタンの作成
    this.createButtons(panelHeight);

    // 兵士テーブルの作成
    this.createSoldierTable();

    // コンテナをシーンに追加
    config.scene.add.existing(this as any);

    // UIレイヤーの最前面に表示
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();

    // 他のUIと同じく、updateで位置を更新するパターンを使用
    // setScrollFactorは使用しない
  }

  private createButtons(panelHeight: number): void {
    // ボタンをパネルの下部に配置
    const buttonY =
      panelHeight / 2 - this.layoutConfig.buttonHeight - this.layoutConfig.panelPadding;

    // キャンセルボタン（左側）
    const buttonX = -this.layoutConfig.buttonWidth / 2 - this.layoutConfig.buttonSpacing / 2;
    this.cancelButton = this.createButton('キャンセル', buttonX, buttonY, () => {
      this.onCancel();
    });
    this.add(this.cancelButton);

    // アイテム選択ボタン（右側）
    const proceedButtonX = this.layoutConfig.buttonWidth / 2 + this.layoutConfig.buttonSpacing / 2;
    this.proceedButton = this.createButton('アイテム選択', proceedButtonX, buttonY, () => {
      this.onProceed();
    });
    this.add(this.proceedButton);

    // 初期状態では無効化
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

  private getJobDisplayName(jobType: string): string {
    const jobNameMap: { [key: string]: string } = {
      wind: '風忍',
      iron: '鉄忍',
      shadow: '影忍',
      medicine: '薬忍',
    };
    return jobNameMap[jobType] || jobType;
  }

  private createSoldierTable(): void {
    // テーブルの基準位置（contentContainer内での相対位置）
    const tableX = -this.layoutConfig.tableWidth / 2; // 中央揃え
    const tableY = this.layoutConfig.tableHeaderY;

    // ヘッダーの作成
    this.createTableHeader(tableX, tableY);

    // 待機兵士の行を作成
    this.createSoldierRows();
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
      { text: '選択', width: 50 },
    ];

    let currentX = x;
    headers.forEach((header) => {
      const text = this.scene.add.text(currentX, y, header.text, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
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

  private createSoldierRows(): void {
    // 後でUIManagerから待機兵士を設定する
  }

  public setWaitingSoldiers(soldiers: Character[]): void {
    this.waitingSoldiers = soldiers;

    // 既存の行をクリア
    this.soldierRows.forEach((row) => row.destroy());
    this.soldierRows.clear();

    // 新しい行を作成
    const tableX = -this.layoutConfig.tableWidth / 2; // 中央揃え
    const tableY = this.layoutConfig.tableHeaderY + 30;

    this.waitingSoldiers.forEach((soldier, index) => {
      this.createSoldierRow(
        soldier,
        tableX,
        tableY + index * this.layoutConfig.tableRowHeight,
        index,
      );
    });
  }

  private createSoldierRow(soldier: Character, x: number, y: number, index: number): void {
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

    // 行の枠（インタラクティブ領域）
    const rowBg = this.scene.add.rectangle(
      x + this.layoutConfig.tableWidth / 2,
      y + 10,
      this.layoutConfig.tableWidth,
      24,
      0x000000,
      0,
    );
    rowBg.setOrigin(0.5, 0.5);
    rowBg.setInteractive({ useHandCursor: true });
    rowContainer.add(rowBg);

    // 兵士データの表示
    const stats = soldier.getStats();
    const columns = [
      { text: soldier.getName(), width: 80 },
      { text: this.getJobDisplayName(soldier.getJobType()), width: 50 },
      { text: `${stats.hp}/${stats.maxHp}`, width: 40 },
      { text: stats.attack.toString(), width: 40 },
      { text: stats.defense.toString(), width: 40 },
      { text: stats.speed.toString(), width: 40 },
      { text: stats.moveSpeed.toString(), width: 40 },
      { text: stats.sight.toString(), width: 40 },
    ];

    let currentX = x;
    columns.forEach((column) => {
      const text = this.scene.add.text(currentX, y, column.text, {
        fontSize: '11px',
        color: '#ffffff',
        resolution: 2,
      });
      rowContainer.add(text);
      currentX += column.width;
    });

    // 選択マーク用のテキスト（初期は空）
    const selectionMark = this.scene.add.text(currentX + 15, y, '', {
      fontSize: '14px',
      fontStyle: 'bold',
      resolution: 2,
    });
    selectionMark.setOrigin(0.5, 0);
    rowContainer.add(selectionMark);

    // 行のクリックイベント
    rowBg.on('pointerdown', (pointer?: Phaser.Input.Pointer) => {
      if (pointer && pointer.rightButtonDown && pointer.rightButtonDown()) {
        this.onSoldierRightClick(soldier);
      } else {
        this.onSoldierClick(soldier);
      }
    });
    rowBg.on('pointerover', () => {
      if (!this.isSelected(soldier)) {
        rowBg.setFillStyle(0x444444, 0.3);
      }
    });
    rowBg.on('pointerout', () => {
      if (!this.isSelected(soldier)) {
        rowBg.setFillStyle(0x000000, 0);
      }
    });

    this.contentContainer.add(rowContainer);
    this.soldierRows.set(soldier.getId(), rowContainer);

    // データを保存
    rowContainer.setData('soldier', soldier);
    rowContainer.setData('selectionMark', selectionMark);
    rowContainer.setData('rowBg', rowBg);
  }

  private onSoldierClick(soldier: Character): void {
    // 既に選択されている場合は何もしない
    if (this.isSelected(soldier)) {
      return;
    }

    // 最大選択数チェック
    if (this.selectedCommander && this.selectedSoldiers.length >= 3) {
      return;
    }

    // 選択処理
    if (!this.selectedCommander) {
      // 最初の選択は指揮官
      this.selectedCommander = soldier;
      this.updateSoldierRowSelection(soldier, 'commander');
    } else {
      // 2人目以降は一般兵
      this.selectedSoldiers.push(soldier);
      this.updateSoldierRowSelection(soldier, 'soldier');
    }

    this.updateButtonState();
  }

  private onSoldierRightClick(soldier: Character): void {
    if (this.selectedCommander === soldier) {
      // 指揮官の選択解除 = 全選択解除
      this.selectedCommander = null;
      this.selectedSoldiers = [];

      // 全ての選択表示をクリア
      this.soldierRows.forEach((row) => {
        const mark = row.getData('selectionMark') as Phaser.GameObjects.Text;
        const bg = row.getData('rowBg') as Phaser.GameObjects.Rectangle;
        mark.setText('');
        bg.setFillStyle(0x000000, 0);
      });
    } else {
      // 一般兵の選択解除
      const index = this.selectedSoldiers.indexOf(soldier);
      if (index >= 0) {
        this.selectedSoldiers.splice(index, 1);
        this.updateSoldierRowSelection(soldier, null);
      }
    }

    this.updateButtonState();
  }

  private isSelected(soldier: Character): boolean {
    return this.selectedCommander === soldier || this.selectedSoldiers.includes(soldier);
  }

  private updateSoldierRowSelection(
    soldier: Character,
    type: 'commander' | 'soldier' | null,
  ): void {
    const row = this.soldierRows.get(soldier.getId());
    if (!row) return;

    const mark = row.getData('selectionMark') as Phaser.GameObjects.Text;
    const bg = row.getData('rowBg') as Phaser.GameObjects.Rectangle;

    if (type === 'commander') {
      mark.setText('指');
      mark.setColor('#ff0000');
      bg.setFillStyle(0x660000, 0.3);
    } else if (type === 'soldier') {
      mark.setText('兵');
      mark.setColor('#0088ff');
      bg.setFillStyle(0x000066, 0.3);
    } else {
      mark.setText('');
      bg.setFillStyle(0x000000, 0);
    }
  }

  private updateButtonState(): void {
    if (!this.proceedButton) return;

    const hasSelection = this.selectedCommander !== null;
    const buttonBg = this.proceedButton.getData('background') as Phaser.GameObjects.Rectangle;
    const buttonText = this.proceedButton.getData('text') as Phaser.GameObjects.Text;

    if (hasSelection) {
      buttonBg.setFillStyle(0x555555);
      buttonBg.setInteractive({ useHandCursor: true });
      buttonText.setAlpha(1);
    } else {
      buttonBg.setFillStyle(0x333333);
      buttonBg.disableInteractive();
      buttonText.setAlpha(0.5);
    }
  }

  private onProceed(): void {
    if (this.selectedCommander && this.onProceedCallback) {
      const formationData: FormationData = {
        commander: this.selectedCommander,
        soldiers: this.selectedSoldiers,
      };
      this.onProceedCallback(formationData);
    }
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    this.removeAllListeners();

    // 行のクリーンアップ
    this.soldierRows.forEach((row) => row.destroy());
    this.soldierRows.clear();

    // 親クラスのdestroy
    super.destroy();
  }
}
