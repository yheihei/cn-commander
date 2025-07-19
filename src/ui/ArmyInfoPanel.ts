import * as Phaser from 'phaser';
import { Army } from '../army/Army';
import { Character } from '../character/Character';
import { MovementMode } from '../types/MovementTypes';
import { IItem } from '../types/ItemTypes';

export interface ArmyInfoPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ArmyInfoPanel extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private memberContainers: Phaser.GameObjects.Container[] = [];
  private statusText: Phaser.GameObjects.Text;

  private panelWidth: number;

  constructor(config: ArmyInfoPanelConfig) {
    super(config.scene, config.x, config.y);

    this.panelWidth = config.width;

    // パネルの背景
    this.background = config.scene.add.rectangle(0, 0, config.width, config.height, 0x222222, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.background.setOrigin(0, 0);
    this.add(this.background);

    // フォントサイズ
    const baseFontSize = 12; // 基本フォントサイズ
    const smallFontSize = 10; // 小さいフォントサイズ

    // タイトル
    this.titleText = config.scene.add.text(8, 10, '軍団情報', {
      fontSize: `${baseFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2, // 高解像度で描画
      padding: { x: 0, y: 2 },
    });
    this.add(this.titleText);

    // 状態テキスト
    this.statusText = config.scene.add.text(8, 26, '', {
      fontSize: `${smallFontSize}px`,
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    this.add(this.statusText);

    // コンテナをシーンに追加
    config.scene.add.existing(this);

    // UIレイヤーに配置（ActionMenuより少し後ろ）
    this.setDepth(998);

    // 初期状態は非表示
    this.setVisible(false);
  }

  public updateArmyInfo(army: Army): void {
    // 既存のメンバーコンテナをクリア
    this.clearMemberContainers();

    // 軍団名を更新
    this.titleText.setText(`軍団: ${army.getName()}`);

    // 状態を更新
    const movementState = army.getMovementState();
    const statusText = this.getStatusText(movementState.mode, movementState.isMoving);

    // 攻撃目標を含めて状態テキストを更新
    const attackTarget = army.getAttackTarget();
    let fullStatusText = `状態: ${statusText}`;
    if (attackTarget && attackTarget.isActive()) {
      fullStatusText += `\n攻撃目標: ${attackTarget.getName()}`;
    }
    this.statusText.setText(fullStatusText);

    // メンバー情報を表示
    const members = army.getAllMembers();
    let yOffset = 40;

    members.forEach((member, index) => {
      const memberContainer = this.createMemberInfo(member, yOffset, index === 0);
      this.memberContainers.push(memberContainer);
      this.add(memberContainer);
      yOffset += 60;
    });
  }

  private createMemberInfo(
    character: Character,
    yOffset: number,
    isCommander: boolean,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(8, yOffset);

    // 背景
    const bg = this.scene.add.rectangle(0, 0, this.panelWidth - 16, 55, 0x333333, 0.5);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, isCommander ? 0xff8888 : 0x666666);
    container.add(bg);

    // 顔画像を追加（左側に配置）
    const faceImage = this.scene.add.image(4, 4, 'characterFace');
    faceImage.setOrigin(0, 0);
    faceImage.setDisplaySize(47, 47);
    container.add(faceImage);

    // 名前と職業（顔画像の右側に配置）
    const textStartX = 59; // 4 + 47 + 8 (画像位置 + 画像幅 + 余白)

    const nameText = this.scene.add.text(
      textStartX,
      4,
      `${isCommander ? '[指揮官] ' : ''}${character.getName()}`,
      {
        fontSize: '10px',
        color: isCommander ? '#ffaa00' : '#ffffff',
        resolution: 2,
      },
    );
    container.add(nameText);

    const jobText = this.scene.add.text(textStartX, 18, `職業: ${character.getJobType()}`, {
      fontSize: '9px',
      color: '#cccccc',
      resolution: 2,
      padding: { x: 0, y: 4 },
    });
    container.add(jobText);

    // HP情報
    const stats = character.getStats();
    const hpRatio = stats.hp / stats.maxHp;

    // HPバーの背景
    const hpBarBg = this.scene.add.rectangle(textStartX, 32, 80, 6, 0x444444);
    hpBarBg.setOrigin(0, 0);
    container.add(hpBarBg);

    // HPバー
    const hpBarColor = hpRatio > 0.5 ? 0x00ff00 : hpRatio > 0.25 ? 0xffff00 : 0xff0000;
    const hpBar = this.scene.add.rectangle(textStartX, 32, 80 * hpRatio, 6, hpBarColor);
    hpBar.setOrigin(0, 0);
    container.add(hpBar);

    // HP数値
    const hpText = this.scene.add.text(textStartX + 84, 30, `${stats.hp}/${stats.maxHp}`, {
      fontSize: '8px',
      color: '#ffffff',
      resolution: 2,
    });
    container.add(hpText);

    // アイテム情報
    const itemHolder = character.getItemHolder();
    const items = itemHolder.items;
    if (items.length > 0) {
      const itemText = this.scene.add.text(
        textStartX,
        44,
        `装備: ${items.map((item: IItem) => item.name).join(', ')}`,
        {
          fontSize: '8px',
          color: '#aaaaaa',
          resolution: 2,
          padding: { x: 0, y: 2 },
        },
      );
      container.add(itemText);
    }

    return container;
  }

  private getStatusText(mode: MovementMode, isMoving: boolean): string {
    if (!isMoving && mode !== MovementMode.STANDBY) {
      return '停止中';
    }

    switch (mode) {
      case MovementMode.NORMAL:
        return '通常移動中';
      case MovementMode.COMBAT:
        return '戦闘移動中';
      case MovementMode.STANDBY:
        return '待機中';
      default:
        return '不明';
    }
  }

  private clearMemberContainers(): void {
    this.memberContainers.forEach((container) => container.destroy());
    this.memberContainers = [];
  }

  public show(): void {
    this.setVisible(true);
    this.setActive(true);
  }

  public hide(): void {
    this.setVisible(false);
    this.setActive(false);
    this.clearMemberContainers();
  }

  public getWidth(): number {
    return this.panelWidth;
  }

  public destroy(): void {
    this.clearMemberContainers();
    super.destroy();
  }
}
