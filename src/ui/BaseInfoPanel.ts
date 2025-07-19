import * as Phaser from 'phaser';
import { Base } from '../base/Base';

export interface BaseInfoPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BaseInfoPanel extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private ownerText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private defenseText: Phaser.GameObjects.Text;
  private incomeText: Phaser.GameObjects.Text;

  private panelWidth: number;

  constructor(config: BaseInfoPanelConfig) {
    super(config.scene, config.x, config.y);

    this.panelWidth = config.width;

    // パネルの背景
    this.background = config.scene.add.rectangle(0, 0, config.width, config.height, 0x222222, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.background.setOrigin(0, 0);
    this.add(this.background);

    // フォントサイズ
    const baseFontSize = 12;
    const smallFontSize = 10;

    // タイトル（拠点名）
    this.titleText = config.scene.add.text(8, 10, '', {
      fontSize: `${baseFontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    this.add(this.titleText);

    // 所属
    this.ownerText = config.scene.add.text(8, 28, '', {
      fontSize: `${smallFontSize}px`,
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    this.add(this.ownerText);

    // HP
    this.hpText = config.scene.add.text(8, 44, '', {
      fontSize: `${smallFontSize}px`,
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    this.add(this.hpText);

    // 防御力
    this.defenseText = config.scene.add.text(8, 60, '', {
      fontSize: `${smallFontSize}px`,
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    this.add(this.defenseText);

    // 収入
    this.incomeText = config.scene.add.text(8, 76, '', {
      fontSize: `${smallFontSize}px`,
      color: '#ffffff',
      resolution: 2,
      padding: { x: 0, y: 2 },
    });
    this.add(this.incomeText);

    // コンテナをシーンに追加
    config.scene.add.existing(this);

    // UIレイヤーに配置（ArmyInfoPanelと同じ深度）
    this.setDepth(998);

    // 初期状態は非表示
    this.setVisible(false);
  }

  public show(base: Base): void {
    // 拠点名を更新
    this.titleText.setText(base.getName());

    // 所属を更新
    const ownerText = this.getOwnerText(base.getOwner());
    const ownerColor = this.getOwnerColor(base.getOwner());
    this.ownerText.setText(`所属: ${ownerText}`);
    this.ownerText.setStyle({ color: ownerColor });

    // HPを更新
    this.hpText.setText(`HP: ${base.getCurrentHp()}/${base.getMaxHp()}`);

    // 防御力を更新
    this.defenseText.setText(`防御力: ${base.getDefenseBonus()}`);

    // 収入を更新
    this.incomeText.setText(`収入: ${base.getIncome()}両/分`);

    // パネルを表示
    this.setVisible(true);
    this.setActive(true);
  }

  private getOwnerText(owner: 'player' | 'enemy' | 'neutral'): string {
    switch (owner) {
      case 'player':
        return '味方拠点';
      case 'enemy':
        return '敵拠点';
      case 'neutral':
        return '中立拠点';
      default:
        return '不明';
    }
  }

  private getOwnerColor(owner: 'player' | 'enemy' | 'neutral'): string {
    switch (owner) {
      case 'player':
        return '#88ccff';
      case 'enemy':
        return '#ff8888';
      case 'neutral':
        return '#cccccc';
      default:
        return '#ffffff';
    }
  }

  public hide(): void {
    this.setVisible(false);
    this.setActive(false);
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public getWidth(): number {
    return this.panelWidth;
  }

  public destroy(): void {
    super.destroy();
  }
}
