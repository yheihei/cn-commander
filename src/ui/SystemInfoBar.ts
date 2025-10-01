import Phaser from 'phaser';

/**
 * システム情報バー
 * 画面右上に所持金と収入/分を表示
 */
export class SystemInfoBar extends Phaser.GameObjects.Container {
  private background!: Phaser.GameObjects.Rectangle;
  private moneyText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;

  private static readonly WIDTH = 200;
  private static readonly HEIGHT = 60;
  private static readonly BG_COLOR = 0x000000;
  private static readonly BG_ALPHA = 0.8;
  private static readonly BORDER_COLOR = 0xffffff;
  private static readonly BORDER_WIDTH = 2;
  private static readonly TEXT_COLOR = '#ffffff';
  private static readonly FONT_SIZE = '14px';

  constructor(config: { scene: Phaser.Scene; x: number; y: number }) {
    super(config.scene, config.x, config.y);

    this.createVisuals();
    config.scene.add.existing(this);
    this.setDepth(500); // オブジェクトより前、他のUIより後ろ
  }

  private createVisuals(): void {
    // 背景
    this.background = this.scene.add.rectangle(
      0,
      0,
      SystemInfoBar.WIDTH,
      SystemInfoBar.HEIGHT,
      SystemInfoBar.BG_COLOR,
      SystemInfoBar.BG_ALPHA,
    );
    this.background.setStrokeStyle(SystemInfoBar.BORDER_WIDTH, SystemInfoBar.BORDER_COLOR);
    this.add(this.background);

    // 所持金テキスト
    this.moneyText = this.scene.add.text(-SystemInfoBar.WIDTH / 2 + 10, -10, '💰 0両', {
      fontSize: SystemInfoBar.FONT_SIZE,
      color: SystemInfoBar.TEXT_COLOR,
      resolution: 2,
    });
    this.moneyText.setOrigin(0, 0.5);
    this.add(this.moneyText);

    // 収入テキスト
    this.incomeText = this.scene.add.text(-SystemInfoBar.WIDTH / 2 + 10, 10, '📈 +0/分', {
      fontSize: SystemInfoBar.FONT_SIZE,
      color: SystemInfoBar.TEXT_COLOR,
      resolution: 2,
    });
    this.incomeText.setOrigin(0, 0.5);
    this.add(this.incomeText);
  }

  /**
   * 表示内容を更新
   * @param money - 現在の所持金
   * @param income - 収入/分
   */
  public updateDisplay(money: number, income: number): void {
    this.moneyText.setText(`💰 ${money.toLocaleString()}両`);
    this.incomeText.setText(`📈 +${income.toLocaleString()}/分`);
  }

  /**
   * 表示
   */
  public show(): void {
    this.setVisible(true);
  }

  /**
   * 非表示
   */
  public hide(): void {
    this.setVisible(false);
  }
}
