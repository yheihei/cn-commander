import * as Phaser from 'phaser';
import { Army } from '../army/Army';
import { ArmyManager } from '../army/ArmyManager';
import { MapManager } from '../map/MapManager';
import { MovementCommandSystem } from '../movement/MovementCommand';
import { MovementMode } from '../types/MovementTypes';
import { Position } from '../types/CharacterTypes';
import { UIManager } from '../ui/UIManager';
import { WaypointMarker } from '../ui/WaypointMarker';
import { AttackTargetInputHandler } from './AttackTargetInputHandler';
import { VisionSystem } from '../vision/VisionSystem';
import { BaseManager } from '../base/BaseManager';
import { Base } from '../base/Base';

export class MovementInputHandler {
  private scene: Phaser.Scene;
  private armyManager: ArmyManager;
  private _mapManager: MapManager;
  private baseManager: BaseManager;
  private commandSystem: MovementCommandSystem;
  private uiManager: UIManager;
  private visionSystem: VisionSystem;

  private selectedArmy: Army | null = null;
  private currentMode: MovementMode = MovementMode.NORMAL;
  private waypointBuffer: Position[] = [];
  private waypointMarkers: WaypointMarker[] = [];
  private pathLines: Phaser.GameObjects.Graphics | null = null;
  private isSettingPath: boolean = false;
  private isSelectingAction: boolean = false;
  private isAttackTargetMode: boolean = false;

  constructor(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    mapManager: MapManager,
    baseManager: BaseManager,
    commandSystem: MovementCommandSystem,
    uiManager: UIManager,
    visionSystem: VisionSystem,
  ) {
    this.scene = scene;
    this.armyManager = armyManager;
    this._mapManager = mapManager;
    this.baseManager = baseManager;
    this.commandSystem = commandSystem;
    this.uiManager = uiManager;
    this.visionSystem = visionSystem;

    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    // 左クリック: 選択と移動指示
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.handleLeftClick(pointer.worldX, pointer.worldY);
      }
    });

    // 右クリック: キャンセル
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick();
      }
    });
  }

  private handleLeftClick(x: number, y: number): void {
    // 攻撃目標指定モード中は何もしない
    if (this.isAttackTargetMode) {
      console.log('MovementInputHandler: 攻撃目標指定モード中なのでクリックを無視');
      return;
    }

    // UIが表示されている場合は何もしない
    if (this.uiManager.isAnyMenuVisible()) {
      return;
    }

    if (!this.isSettingPath && !this.isSelectingAction) {
      // 軍団選択を試みる
      const clickedArmy = this.findArmyAtPosition(x, y);

      if (clickedArmy) {
        this.showActionMenu(clickedArmy);
      } else {
        // 軍団が見つからなかった場合、拠点を探す
        const clickedBase = this.findBaseAtPosition(x, y);
        if (clickedBase) {
          this.uiManager.showBaseInfo(clickedBase);
        } else {
          // 軍団も拠点も見つからなかった場合、BaseInfoPanelを非表示
          this.uiManager.hideBaseInfo();
        }
      }
    } else if (this.isSettingPath) {
      // 経路点を追加
      this.addWaypoint(x, y);
    }
  }

  private handleRightClick(): void {
    if (this.isAttackTargetMode) {
      // 攻撃目標指定モードをキャンセル
      this.isAttackTargetMode = false;
      this.uiManager.hideGuideMessage();
      console.log('MovementInputHandler: 右クリックで攻撃目標指定モードをキャンセル');
    } else if (this.isSettingPath) {
      // 経路設定をキャンセル
      this.cancelPathSetting();
    } else {
      // 軍団の選択を解除
      this.deselectArmy();
      // BaseInfoPanelも非表示
      this.uiManager.hideBaseInfo();
    }
  }

  private findArmyAtPosition(x: number, y: number): Army | null {
    const armies = this.armyManager.getActiveArmies();

    for (const army of armies) {
      const commander = army.getCommander();
      const commanderBounds = commander.getBounds();

      if (commanderBounds.contains(x, y)) {
        return army;
      }
    }

    return null;
  }

  private findBaseAtPosition(x: number, y: number): Base | null {
    const bases = this.baseManager.getAllBases();

    for (const base of bases) {
      // BaseはPhaser.GameObjects.Containerを継承している
      const bounds = base.getBounds();
      if (bounds.contains(x, y)) {
        return base;
      }
    }

    return null;
  }

  private showActionMenu(army: Army): void {
    this.isSelectingAction = true;

    // 前の選択を解除
    if (this.selectedArmy) {
      this.unhighlightCommander(this.selectedArmy);
    }

    this.selectedArmy = army;
    this.highlightCommander(army);

    // 攻撃目標の有無を確認
    const hasAttackTarget = army.hasAttackTarget();

    // アクションメニューを表示
    this.uiManager.showActionMenu(
      army,
      () => {
        // 移動が選択された
        this.isSelectingAction = false;
        this.startMovementProcess();
      },
      () => {
        // 待機が選択された
        this.isSelectingAction = false;
        this.setArmyStandby();
      },
      () => {
        // 攻撃目標指定が選択された
        this.isSelectingAction = false;
        this.startAttackTargetSelection();
      },
      () => {
        // 攻撃目標解除が選択された
        this.isSelectingAction = false;
        this.clearAttackTarget();
      },
      () => {
        // キャンセルされた
        this.isSelectingAction = false;
        this.deselectArmy();
      },
      hasAttackTarget,
    );
  }

  private startMovementProcess(): void {
    if (!this.selectedArmy) return;

    // 移動モード選択UIを表示
    this.uiManager.showMovementModeMenu(
      () => {
        // 通常移動が選択された
        this.currentMode = MovementMode.NORMAL;
        this.showPathMessageAndStartSetting();
      },
      () => {
        // 戦闘移動が選択された
        this.currentMode = MovementMode.COMBAT;
        this.showPathMessageAndStartSetting();
      },
      () => {
        // キャンセルされた
        this.deselectArmy();
      },
    );
  }

  private showPathMessageAndStartSetting(): void {
    // 1秒待ってから経路選択モードを開始（誤クリック防止）
    this.scene.time.delayedCall(1000, () => {
      if (this.selectedArmy && !this.isSettingPath) {
        this.startPathSetting();
      }
    });
  }

  private deselectArmy(): void {
    if (this.selectedArmy) {
      this.unhighlightCommander(this.selectedArmy);
    }

    this.selectedArmy = null;
    this.isSettingPath = false;
    this.isSelectingAction = false;
    this.waypointBuffer = [];
    this.uiManager.hideActionMenu();
    this.uiManager.hideMovementModeMenu();
    this.uiManager.hideArmyInfo();
  }

  private startPathSetting(): void {
    this.isSettingPath = true;
    this.waypointBuffer = [];
  }

  private addWaypoint(x: number, y: number): void {
    if (this.waypointBuffer.length >= 4) {
      // 最大経路点数に達しているので無視
      return;
    }

    // 経路の妥当性を検証
    const gridPos = this._mapManager.pixelToGrid(x, y);
    if (
      gridPos.x < 0 ||
      gridPos.x >= this._mapManager.getMapWidth() ||
      gridPos.y < 0 ||
      gridPos.y >= this._mapManager.getMapHeight()
    ) {
      return; // マップ外の座標は無視
    }

    this.waypointBuffer.push({ x, y });

    // 経路点の視覚的フィードバック（実装は別途必要）
    this.showWaypointMarker(x, y, this.waypointBuffer.length);

    // 4つ目の経路点が追加されたら、2秒後に移動を開始
    if (this.waypointBuffer.length === 4) {
      // 経路設定モードを無効化（これ以上のクリックを防ぐ）
      this.isSettingPath = false;

      // 2秒後に移動を開始
      this.scene.time.delayedCall(2000, () => {
        this.confirmMovement();
      });
    }
  }

  private confirmMovement(): void {
    if (!this.selectedArmy || this.waypointBuffer.length === 0) return;

    // 移動コマンドを設定
    this.commandSystem.setPath(this.selectedArmy, this.waypointBuffer, this.currentMode);

    // 状態をリセット
    this.isSettingPath = false;
    this.waypointBuffer = [];
    this.clearWaypointMarkers();
  }

  private cancelPathSetting(): void {
    if (this.waypointBuffer.length > 0) {
      // 1箇所でも地点が選択されていれば、現在指定した経路で移動を開始する
      this.confirmMovement();
    } else {
      // まだ1箇所も地点が選択されていなければ、移動指定のキャンセルとみなし、今の行動を継続する
      this.isSettingPath = false;
      this.deselectArmy();
    }
  }

  // 移動モードの切り替え
  public setMovementMode(mode: MovementMode): void {
    this.currentMode = mode;

    // 選択中の軍団があれば、その移動モードも更新
    if (this.selectedArmy) {
      this.selectedArmy.setMovementMode(mode);
    }
  }

  // 軍団を待機状態にする
  private setArmyStandby(): void {
    if (!this.selectedArmy) return;

    // 待機モードに設定
    this.selectedArmy.setMovementMode(MovementMode.STANDBY);

    // 移動を停止
    this.selectedArmy.stopMovement();

    // 選択を解除（情報パネルは表示したまま）
    this.unhighlightCommander(this.selectedArmy);
    this.selectedArmy = null;
    this.isSelectingAction = false;
  }

  public getMovementMode(): MovementMode {
    return this.currentMode;
  }

  public getSelectedArmy(): Army | null {
    return this.selectedArmy;
  }

  // 視覚的フィードバック用のメソッド（実装は別途必要）
  private highlightCommander(army: Army): void {
    // 指揮官にハイライト効果を追加
    const commander = army.getCommander();
    commander.setTint(0xffff00); // 黄色でハイライト
  }

  private unhighlightCommander(army: Army): void {
    // 指揮官のハイライトを解除
    const commander = army.getCommander();
    commander.clearTint();
  }

  private showWaypointMarker(x: number, y: number, index: number): void {
    // 経路点マーカーを表示
    const marker = new WaypointMarker(this.scene, x, y, index);
    this.waypointMarkers.push(marker);

    // 経路の線を描画
    this.drawPathLines();
  }

  private drawPathLines(): void {
    // 既存の線をクリア
    if (!this.pathLines) {
      this.pathLines = this.scene.add.graphics();
      this.pathLines.setDepth(99); // マーカーより手前
    }
    this.pathLines.clear();

    // 経路点が2つ以上ある場合のみ線を描画
    if (this.waypointBuffer.length >= 2) {
      this.pathLines.lineStyle(2, 0xff0000, 0.7);

      // 最初の点から始める
      const startPos = this.waypointBuffer[0];
      this.pathLines.moveTo(startPos.x, startPos.y);

      // 各点を結ぶ
      for (let i = 1; i < this.waypointBuffer.length; i++) {
        const pos = this.waypointBuffer[i];
        this.pathLines.lineTo(pos.x, pos.y);
      }

      this.pathLines.strokePath();
    }
  }

  private clearWaypointMarkers(): void {
    // 全ての経路点マーカーを削除
    this.waypointMarkers.forEach((marker) => marker.destroy());
    this.waypointMarkers = [];

    // 経路の線も削除
    if (this.pathLines) {
      this.pathLines.clear();
    }
  }

  private startAttackTargetSelection(): void {
    if (!this.selectedArmy) return;

    // 攻撃目標選択モード開始時に軍団情報パネルを非表示にする
    this.uiManager.hideArmyInfo();

    // 攻撃目標指定モードフラグを設定
    this.isAttackTargetMode = true;
    console.log('MovementInputHandler: 攻撃目標指定モード開始');

    // ガイドメッセージを先に表示
    this.uiManager.showGuideMessage('攻撃目標を選択してください');

    // 1秒待ってから攻撃目標選択モードを開始（誤クリック防止）
    this.scene.time.delayedCall(1000, () => {
      if (!this.selectedArmy || !this.isAttackTargetMode) {
        // 既にキャンセルされている場合は何もしない
        this.uiManager.hideGuideMessage();
        return;
      }

      // 攻撃目標選択モードを開始
      new AttackTargetInputHandler(
        this.scene,
        this.armyManager,
        this.visionSystem,
        this.selectedArmy,
        (target: Army) => {
          // 目標が選択された
          if (this.selectedArmy) {
            this.selectedArmy.setAttackTarget(target);
            console.log(
              `${this.selectedArmy.getName()} の攻撃目標を ${target.getName()} に設定しました`,
            );
          }
          // モードを解除
          this.isAttackTargetMode = false;
          console.log('MovementInputHandler: 攻撃目標指定モード終了');
        },
        () => {
          // キャンセルされた
          this.isAttackTargetMode = false;
          console.log('MovementInputHandler: 攻撃目標指定モードキャンセル');
        },
        this.uiManager,
      );
    });
  }

  private clearAttackTarget(): void {
    if (!this.selectedArmy) return;

    // 攻撃目標を解除
    this.selectedArmy.clearAttackTarget();
    console.log(`${this.selectedArmy.getName()} の攻撃目標を解除しました`);

    // 軍団情報パネルを更新
    this.uiManager.updateArmyInfo(this.selectedArmy);
  }

  public destroy(): void {
    this.scene.input.off('pointerdown');
    this.deselectArmy();
    this.uiManager.destroy();
    if (this.pathLines) {
      this.pathLines.destroy();
    }
  }
}
