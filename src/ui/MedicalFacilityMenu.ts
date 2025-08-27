import * as Phaser from 'phaser';
import { BaseManager } from '../base/BaseManager';
import { ArmyManager } from '../army/ArmyManager';
import { MedicalManager } from '../medical/MedicalManager';
import { Army } from '../army/Army';

export interface MedicalFacilityMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  baseId: string;
  baseManager: BaseManager;
  armyManager: ArmyManager;
  medicalManager: MedicalManager;
  money: number;
  onStartTreatment?: (armyId: string, cost: number) => boolean;
  onCancel?: () => void;
}

export class MedicalFacilityMenu extends Phaser.GameObjects.Container {
  private modalBackground: Phaser.GameObjects.Rectangle;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private treatableTitle: Phaser.GameObjects.Text;
  private treatingTitle: Phaser.GameObjects.Text;
  private treatableList: Phaser.GameObjects.Container;
  private treatingList: Phaser.GameObjects.Container;
  private startButton: Phaser.GameObjects.Container;
  private closeButton: Phaser.GameObjects.Container;

  private selectedArmy: Army | null = null;
  private armySelections: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  private baseId: string;
  private baseManager: BaseManager;
  private armyManager: ArmyManager;
  private medicalManager: MedicalManager;
  private money: number;
  private onStartTreatmentCallback?: (armyId: string, cost: number) => boolean;
  private onCancelCallback?: () => void;

  constructor(config: MedicalFacilityMenuConfig) {
    // カメラのズーム値を考慮（ArmyFormationUIと同じパターン）
    const cam = config.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    // ワールド座標系で中央に配置
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    super(config.scene, centerX, centerY);

    this.baseId = config.baseId;
    this.baseManager = config.baseManager;
    this.armyManager = config.armyManager;
    this.medicalManager = config.medicalManager;
    this.money = config.money;
    this.onStartTreatmentCallback = config.onStartTreatment;
    this.onCancelCallback = config.onCancel;

    // 画面全体を覆う半透明の背景（モーダル）
    this.modalBackground = config.scene.add.rectangle(0, 0, viewWidth, viewHeight, 0x000000, 0.5);
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景（ビューポートの90%サイズ）
    const panelWidth = viewWidth * 0.9;
    const panelHeight = viewHeight * 0.9;
    this.background = config.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x222222, 0.95);
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル（パネル上部）
    this.titleText = config.scene.add.text(0, -panelHeight / 2 + 20, '医療施設', {
      fontSize: '20px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 10, y: 5 },
    });
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // 治療可能軍団のタイトル（左側）
    const listTitleY = -panelHeight / 2 + 60;
    this.treatableTitle = config.scene.add.text(-panelWidth / 4, listTitleY, '治療可能軍団', {
      fontSize: '16px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    this.treatableTitle.setOrigin(0.5);
    this.add(this.treatableTitle);

    // 治療中のタイトル（右側）
    this.treatingTitle = config.scene.add.text(panelWidth / 4, listTitleY, '治療中', {
      fontSize: '16px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    this.treatingTitle.setOrigin(0.5);
    this.add(this.treatingTitle);

    // リストコンテナ（表示領域を拡大）
    const listStartY = listTitleY + 30;
    this.treatableList = config.scene.add.container(-panelWidth / 4, listStartY);
    this.add(this.treatableList);

    this.treatingList = config.scene.add.container(panelWidth / 4, listStartY);
    this.add(this.treatingList);

    // ボタン（パネル下部）
    const buttonY = panelHeight / 2 - 50;
    this.startButton = this.createButton('治療開始', -80, buttonY, () => {
      this.onStartTreatment();
    });
    this.add(this.startButton);

    this.closeButton = this.createButton('閉じる', 80, buttonY, () => {
      this.onCancel();
    });
    this.add(this.closeButton);

    // Containerを配置
    config.scene.add.existing(this);
    this.setDepth(1000);

    // リストを初期化
    this.updateLists();

    // 入力イベントの設定
    this.setupInputHandlers();
    this.setupOutsideClickHandler();
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const buttonBg = this.scene.add.rectangle(0, 0, 100, 35, 0x666666);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);
    button.setData('bg', buttonBg);
    button.setData('text', buttonText);

    buttonBg.on('pointerover', () => {
      if (button.getData('enabled') !== false) {
        buttonBg.setFillStyle(0x888888);
      }
    });

    buttonBg.on('pointerout', () => {
      if (button.getData('enabled') !== false) {
        buttonBg.setFillStyle(0x666666);
      }
    });

    buttonBg.on('pointerdown', () => {
      if (button.getData('enabled') !== false) {
        onClick();
      }
    });

    return button;
  }

  private updateLists(): void {
    // 既存のリストをクリア
    this.treatableList.removeAll(true);
    this.treatingList.removeAll(true);
    this.armySelections.clear();

    // 駐留軍団を取得
    const stationedArmies = this.baseManager.getStationedArmies(this.baseId);
    let treatableY = 0;

    // 治療可能な軍団を表示
    stationedArmies.forEach((army: Army) => {
      if (!this.medicalManager.isInTreatment(army.getId())) {
        const members = army.getAllMembers();
        let currentHP = 0;
        let maxHP = 0;

        members.forEach((member) => {
          currentHP += member.getCurrentHP();
          maxHP += member.getMaxHP();
        });

        // HPが満タンでない軍団のみ表示
        if (currentHP < maxHP) {
          const armyItem = this.createArmyItem(army, treatableY, currentHP, maxHP);
          this.treatableList.add(armyItem);
          treatableY += 45;
        }
      }
    });

    // 治療可能な軍団がない場合
    if (treatableY === 0) {
      const noArmyText = this.scene.add.text(0, 0, '治療が必要な\n軍団がありません', {
        fontSize: '12px',
        fontFamily: 'monospace, "Courier New", Courier',
        color: '#999999',
        align: 'center',
        resolution: 2,
        padding: { top: 5 },
      });
      noArmyText.setOrigin(0.5);
      this.treatableList.add(noArmyText);
    }

    // 治療中の軍団を表示
    const treatments = this.medicalManager.getTreatmentsByBase(this.baseId);
    let treatingY = 0;

    treatments.forEach((treatment) => {
      const army = this.armyManager.getArmyById(treatment.armyId);
      if (!army) return;

      const remainingTime = this.medicalManager.getRemainingTime(treatment.armyId);
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;

      const treatmentItem = this.createTreatmentItem(
        army,
        treatingY,
        `${minutes}:${seconds.toString().padStart(2, '0')}`,
      );
      this.treatingList.add(treatmentItem);
      treatingY += 50;
    });

    // 治療中の軍団がない場合
    if (treatingY === 0) {
      const noTreatmentText = this.scene.add.text(0, 0, '治療中の\n軍団はありません', {
        fontSize: '12px',
        fontFamily: 'monospace, "Courier New", Courier',
        color: '#999999',
        align: 'center',
        resolution: 2,
        padding: { top: 5 },
      });
      noTreatmentText.setOrigin(0.5);
      this.treatingList.add(noTreatmentText);
    }

    // ボタンの状態を更新
    this.updateButtonState();
  }

  private createArmyItem(
    army: Army,
    y: number,
    currentHP: number,
    maxHP: number,
  ): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, y);

    // 選択背景（少し大きめに）
    const bg = this.scene.add.rectangle(0, 0, 180, 38, 0x555555, 0.3);
    bg.setStrokeStyle(1, 0x777777);
    bg.setInteractive({ useHandCursor: true });
    item.add(bg);

    // 軍団名
    const nameText = this.scene.add.text(0, -6, `${army.getCommander().getName()}軍団`, {
      fontSize: '12px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { top: 2 },
    });
    nameText.setOrigin(0.5);
    item.add(nameText);

    // HP表示
    const hpColor = currentHP < maxHP * 0.5 ? '#ff6666' : '#ffffff';
    const hpText = this.scene.add.text(0, 7, `${currentHP}/${maxHP}`, {
      fontSize: '10px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: hpColor,
      resolution: 2,
      padding: { top: 2 },
    });
    hpText.setOrigin(0.5);
    item.add(hpText);

    // クリックイベント
    bg.on('pointerdown', () => {
      this.selectArmy(army, bg);
    });

    bg.on('pointerover', () => {
      if (this.selectedArmy !== army) {
        bg.setFillStyle(0x666666, 0.5);
      }
    });

    bg.on('pointerout', () => {
      if (this.selectedArmy !== army) {
        bg.setFillStyle(0x555555, 0.3);
      }
    });

    this.armySelections.set(army.getId(), bg);

    return item;
  }

  private createTreatmentItem(
    army: Army,
    y: number,
    timeStr: string,
  ): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, y);

    // 軍団名
    const nameText = this.scene.add.text(0, -12, `${army.getCommander().getName()}軍団`, {
      fontSize: '13px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
    });
    nameText.setOrigin(0.5);
    item.add(nameText);

    // 残り時間
    const timeText = this.scene.add.text(0, 3, timeStr, {
      fontSize: '11px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#66ff66',
      resolution: 2,
    });
    timeText.setOrigin(0.5);
    item.add(timeText);

    // 費用
    const costText = this.scene.add.text(0, 18, '500両', {
      fontSize: '10px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffff66',
      resolution: 2,
    });
    costText.setOrigin(0.5);
    item.add(costText);

    return item;
  }

  private selectArmy(army: Army, bg: Phaser.GameObjects.Rectangle): void {
    // 前の選択を解除
    if (this.selectedArmy) {
      const prevBg = this.armySelections.get(this.selectedArmy.getId());
      if (prevBg) {
        prevBg.setFillStyle(0x555555, 0.3);
      }
    }

    // 新しい選択
    this.selectedArmy = army;
    bg.setFillStyle(0x7799ff, 0.5);
    this.updateButtonState();
  }

  private updateButtonState(): void {
    const enabled = this.selectedArmy !== null && this.money >= MedicalManager.getTreatmentCost();

    const bg = this.startButton.getData('bg') as Phaser.GameObjects.Rectangle;
    const text = this.startButton.getData('text') as Phaser.GameObjects.Text;

    if (enabled) {
      bg.setFillStyle(0x666666);
      text.setColor('#ffffff');
      this.startButton.setData('enabled', true);
    } else {
      bg.setFillStyle(0x333333);
      text.setColor('#666666');
      this.startButton.setData('enabled', false);
    }
  }

  private onStartTreatment(): void {
    if (!this.selectedArmy) return;

    const base = this.baseManager.getBase(this.baseId);
    if (!base) return;

    // 治療開始コールバック（資金処理）
    if (this.onStartTreatmentCallback) {
      const success = this.onStartTreatmentCallback(
        this.selectedArmy.getId(),
        MedicalManager.getTreatmentCost(),
      );

      if (!success) {
        console.log('治療開始に失敗しました');
        return;
      }
    }

    // 治療開始
    const started = this.medicalManager.startTreatment(this.selectedArmy, base, this.money);
    if (started) {
      this.selectedArmy = null;
      this.updateLists();
    }
  }

  private onCancel(): void {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.hide();
  }

  private setupInputHandlers(): void {
    // メニュー自体へのクリックはイベントを停止
    this.background.setInteractive();
    this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });
  }

  private setupOutsideClickHandler(): void {
    // モーダル背景のクリックで閉じる
    this.modalBackground.setInteractive();
    this.modalBackground.on('pointerdown', () => {
      this.onCancel();
    });

    // 右クリックで閉じる
    const rightClickHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.onCancel();
      }
    };

    this.scene.input.on('pointerdown', rightClickHandler);
    this.once('destroy', () => {
      this.scene.input.off('pointerdown', rightClickHandler);
    });
  }

  public show(): void {
    this.setVisible(true);
    this.setActive(true);
  }

  public hide(): void {
    this.destroy();
  }

  public update(): void {
    // 治療状況を定期的に更新
    this.updateLists();
  }

  public updateMoney(money: number): void {
    this.money = money;
    this.updateButtonState();
  }

  public updatePosition(): void {
    // カメラが移動してもUIが中央に固定されるように更新
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    this.setPosition(centerX, centerY);
  }
}
