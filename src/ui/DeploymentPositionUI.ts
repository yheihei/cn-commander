import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { MapManager } from '../map/MapManager';
import { ArmyManager } from '../army/ArmyManager';
import { BaseManager } from '../base/BaseManager';
import { Army } from '../army/Army';
import { ItemEquippedFormationData } from './ItemSelectionUI';
import { MAP_CONFIG } from '../config/mapConfig';

export interface DeploymentPositionUIConfig {
  scene: Phaser.Scene;
  base: Base;
  mapManager: MapManager;
  armyManager: ArmyManager;
  baseManager: BaseManager;
  itemEquippedFormationData: ItemEquippedFormationData;
  onDeploymentComplete?: (army: Army) => void;
  onBack?: () => void;
}

interface Position {
  x: number; // タイルX座標
  y: number; // タイルY座標
}

export class DeploymentPositionUI extends Phaser.GameObjects.Container {
  private base: Base;
  private mapManager: MapManager;
  private armyManager: ArmyManager;
  private baseManager: BaseManager;
  private itemEquippedFormationData: ItemEquippedFormationData;
  private onDeploymentCompleteCallback?: (army: Army) => void;
  private onBackCallback?: () => void;

  // UI要素
  private modalBackground: Phaser.GameObjects.Rectangle;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private instructionText: Phaser.GameObjects.Text;
  private mapContainer: Phaser.GameObjects.Container;
  private tileHighlights: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  // レイアウト設定
  private readonly layoutConfig = {
    panelWidth: 400,
    panelHeight: 400,
    tileSize: 48,
    mapSize: 5, // 5x5マス表示
  };

  // 入力制御
  private inputEnabled: boolean = false;
  private rightClickHandler?: () => void;
  private pointerDownHandler?: (pointer: Phaser.Input.Pointer) => void;

  constructor(config: DeploymentPositionUIConfig) {
    // カメラのズーム値を考慮
    const cam = config.scene.cameras.main;
    const zoom = cam.zoom || 2.25;
    const viewWidth = 1280 / zoom;
    const viewHeight = 720 / zoom;

    // 画面中央に配置
    const viewLeft = cam.worldView.x;
    const viewTop = cam.worldView.y;
    const centerX = viewLeft + viewWidth / 2;
    const centerY = viewTop + viewHeight / 2;

    super(config.scene, centerX, centerY);

    // シーンを明示的に設定（テスト環境での互換性のため）
    if (!this.scene) {
      (this as any).scene = config.scene;
    }

    this.base = config.base;
    this.mapManager = config.mapManager;
    this.armyManager = config.armyManager;
    this.baseManager = config.baseManager;
    this.itemEquippedFormationData = config.itemEquippedFormationData;
    this.onDeploymentCompleteCallback = config.onDeploymentComplete;
    this.onBackCallback = config.onBack;

    // 画面全体を覆う半透明の背景
    this.modalBackground = config.scene.add.rectangle(0, 0, viewWidth, viewHeight, 0x000000, 0.5);
    this.modalBackground.setOrigin(0.5);
    this.add(this.modalBackground);

    // メインパネルの背景
    this.background = config.scene.add.rectangle(
      0,
      0,
      this.layoutConfig.panelWidth,
      this.layoutConfig.panelHeight,
      0x222222,
      0.95,
    );
    this.background.setStrokeStyle(3, 0xffffff);
    this.background.setOrigin(0.5);
    this.add(this.background);

    // タイトル
    this.titleText = config.scene.add.text(
      0,
      -this.layoutConfig.panelHeight / 2 + 20,
      '出撃位置を選択してください',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: 2,
      },
    );
    this.titleText.setOrigin(0.5, 0);
    this.add(this.titleText);

    // マップコンテナ
    this.mapContainer = config.scene.add.container(0, 0);
    this.add(this.mapContainer);

    // 説明文
    this.instructionText = config.scene.add.text(
      0,
      this.layoutConfig.panelHeight / 2 - 40,
      '■: 選択可能    右クリック: キャンセル',
      {
        fontSize: '12px',
        color: '#ffffff',
        resolution: 2,
      },
    );
    this.instructionText.setOrigin(0.5, 1);
    this.add(this.instructionText);

    // コンテナをシーンに追加
    config.scene.add.existing(this);
    this.setDepth(1000);

    // 入力イベントの設定
    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    // モーダル背景のクリックを無効化
    this.modalBackground.setInteractive();
    this.modalBackground.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // 右クリックハンドラ
    this.rightClickHandler = () => {
      if (this.inputEnabled && this.onBackCallback) {
        this.onBackCallback();
      }
    };

    // ポインターダウンハンドラ
    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.rightClickHandler?.();
      }
    };

    this.scene.input.on('pointerdown', this.pointerDownHandler);
  }

  public show(): void {
    this.setVisible(true);

    // 1秒間の入力無効化（誤クリック防止）
    this.inputEnabled = false;

    this.scene.time.delayedCall(1000, () => {
      this.inputEnabled = true;
      this.showDeployablePositions();
    });
  }

  public hide(): void {
    this.setVisible(false);
  }

  public showDeployablePositions(): void {
    // 既存のハイライトをクリア
    this.tileHighlights.forEach((highlight) => highlight.destroy());
    this.tileHighlights.clear();
    this.mapContainer.removeAll(true);

    // base.getPosition()は既にタイル座標を返す
    const basePos = this.base.getPosition();
    console.log(`showDeployablePositions - 拠点位置: grid(${basePos.x}, ${basePos.y})`);
    const deployablePositions = this.getDeployablePositions();

    // 5x5マップの中心を拠点位置に
    const centerOffset = Math.floor(this.layoutConfig.mapSize / 2);

    for (let dy = -centerOffset; dy <= centerOffset; dy++) {
      for (let dx = -centerOffset; dx <= centerOffset; dx++) {
        const gridX = basePos.x + dx;
        const gridY = basePos.y + dy;
        const tileKey = `${gridX},${gridY}`;

        // タイルの表示位置
        const displayX = dx * this.layoutConfig.tileSize;
        const displayY = dy * this.layoutConfig.tileSize;

        // 拠点タイル
        if (dx === 0 && dy === 0) {
          const baseTile = this.scene.add.rectangle(
            displayX,
            displayY,
            this.layoutConfig.tileSize - 4,
            this.layoutConfig.tileSize - 4,
            0x4444ff,
          );
          baseTile.setStrokeStyle(2, 0xffffff);
          this.mapContainer.add(baseTile);

          const baseLabel = this.scene.add.text(displayX, displayY, '拠', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            resolution: 2,
          });
          baseLabel.setOrigin(0.5);
          this.mapContainer.add(baseLabel);
        }
        // 選択可能位置
        else if (deployablePositions.some((pos) => pos.x === gridX && pos.y === gridY)) {
          const highlight = this.scene.add.rectangle(
            displayX,
            displayY,
            this.layoutConfig.tileSize - 4,
            this.layoutConfig.tileSize - 4,
            0xff0000,
            0.5,
          );
          highlight.setStrokeStyle(2, 0xff0000);
          highlight.setInteractive({ useHandCursor: true });

          highlight.on('pointerover', () => {
            highlight.setFillStyle(0xff0000, 0.8);
          });

          highlight.on('pointerout', () => {
            highlight.setFillStyle(0xff0000, 0.5);
          });

          highlight.on('pointerdown', () => {
            if (this.inputEnabled) {
              console.log(`クリックされたタイル: grid(${gridX}, ${gridY}), 相対位置(${dx}, ${dy})`);
              this.onPositionSelected({ x: gridX, y: gridY });
            }
          });

          this.mapContainer.add(highlight);
          this.tileHighlights.set(tileKey, highlight);
        }
        // その他のタイル
        else {
          const normalTile = this.scene.add.rectangle(
            displayX,
            displayY,
            this.layoutConfig.tileSize - 4,
            this.layoutConfig.tileSize - 4,
            0x444444,
            0.3,
          );
          normalTile.setStrokeStyle(1, 0x666666);
          this.mapContainer.add(normalTile);
        }
      }
    }
  }

  private getDeployablePositions(): Position[] {
    const positions: Position[] = [];
    // base.getPosition()は既にタイル座標を返す
    const basePos = this.base.getPosition();
    const deploymentRange = 2; // 拠点から2マス以内

    // マンハッタン距離で2マス以内の位置を計算
    for (let dy = -deploymentRange; dy <= deploymentRange; dy++) {
      for (let dx = -deploymentRange; dx <= deploymentRange; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > 0 && distance <= deploymentRange) {
          const gridX = basePos.x + dx;
          const gridY = basePos.y + dy;

          // マップ範囲内かチェック
          const mapWidth = this.mapManager.getMapWidth();
          const mapHeight = this.mapManager.getMapHeight();

          if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
            // 移動可能な地形かチェック（基本的に全て許可）
            const tile = this.mapManager.getTileAt(gridX, gridY);
            if (tile && tile.isWalkable()) {
              positions.push({ x: gridX, y: gridY });
            }
          }
        }
      }
    }

    return positions;
  }

  private onPositionSelected(position: Position): void {
    // 入力を無効化して二重実行を防ぐ
    this.inputEnabled = false;
    console.log(`選択された位置: grid(${position.x}, ${position.y})`);

    // 軍団を生成
    const army = this.createArmyAtPosition(position);

    if (army) {
      // 待機兵士から削除
      const allMembers = [
        this.itemEquippedFormationData.commander,
        ...this.itemEquippedFormationData.soldiers,
      ];
      this.baseManager.removeWaitingSoldiers(this.base.getId(), allMembers);

      // 完了コールバック
      if (this.onDeploymentCompleteCallback) {
        this.onDeploymentCompleteCallback(army);
      }
    }
  }

  private createArmyAtPosition(position: Position): Army | null {
    const { commander, soldiers } = this.itemEquippedFormationData;

    // キャラクターをシーンから一旦削除（既にシーンに追加されているため）
    // Armyコンテナに追加されるときに、正しい位置で再配置される
    if (commander.scene) {
      commander.removeFromDisplayList();
      commander.removeFromUpdateList();
    }
    soldiers.forEach((soldier) => {
      if (soldier.scene) {
        soldier.removeFromDisplayList();
        soldier.removeFromUpdateList();
      }
    });

    // キャラクターを表示状態にする（setVisibleメソッドがある場合のみ）
    if (typeof commander.setVisible === 'function') {
      commander.setVisible(true);
    }
    soldiers.forEach((soldier) => {
      if (typeof soldier.setVisible === 'function') {
        soldier.setVisible(true);
      }
    });

    // ArmyManagerを使って軍団を作成
    const army = this.armyManager.createArmyAtGrid(
      commander,
      position.x,
      position.y,
      this.base.getOwner(),
    );

    if (army) {
      // 一般兵を追加
      soldiers.forEach((soldier) => {
        army.addSoldier(soldier);
      });

      console.log(
        `軍団が出撃しました: ${army.getName()} at grid(${position.x}, ${position.y}), pixel(${army.x}, ${army.y})`,
      );

      // デバッグ：拠点の位置も確認（base.getPosition()は既にタイル座標）
      const baseTilePos = this.base.getPosition();
      const basePixelPos = {
        x: baseTilePos.x * MAP_CONFIG.tileSize,
        y: baseTilePos.y * MAP_CONFIG.tileSize,
      };
      console.log(
        `拠点位置: grid(${baseTilePos.x}, ${baseTilePos.y}), pixel(${basePixelPos.x}, ${basePixelPos.y})`,
      );
    }

    return army;
  }

  public destroy(): void {
    // イベントリスナーのクリーンアップ
    if (this.pointerDownHandler) {
      this.scene.input.off('pointerdown', this.pointerDownHandler);
    }

    // ハイライトのクリーンアップ
    this.tileHighlights.forEach((highlight) => highlight.destroy());
    this.tileHighlights.clear();

    super.destroy();
  }
}
