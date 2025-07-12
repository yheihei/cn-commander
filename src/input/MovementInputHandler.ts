import * as Phaser from "phaser";
import { Army } from "../army/Army";
import { ArmyManager } from "../army/ArmyManager";
import { MapManager } from "../map/MapManager";
import { MovementCommandSystem } from "../movement/MovementCommand";
import { MovementMode } from "../types/MovementTypes";
import { Position } from "../types/CharacterTypes";
import { UIManager } from "../ui/UIManager";
import { WaypointMarker } from "../ui/WaypointMarker";

export class MovementInputHandler {
  private scene: Phaser.Scene;
  private armyManager: ArmyManager;
  private _mapManager: MapManager;
  private commandSystem: MovementCommandSystem;
  private uiManager: UIManager;

  private selectedArmy: Army | null = null;
  private currentMode: MovementMode = MovementMode.NORMAL;
  private waypointBuffer: Position[] = [];
  private waypointMarkers: WaypointMarker[] = [];
  private pathLines: Phaser.GameObjects.Graphics | null = null;
  private isSettingPath: boolean = false;
  private isSelectingAction: boolean = false;

  constructor(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    mapManager: MapManager,
    commandSystem: MovementCommandSystem,
    uiManager: UIManager,
  ) {
    this.scene = scene;
    this.armyManager = armyManager;
    this._mapManager = mapManager;
    this.commandSystem = commandSystem;
    this.uiManager = uiManager;

    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    // 左クリック: 選択と移動指示
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.handleLeftClick(pointer.worldX, pointer.worldY);
      }
    });

    // 右クリック: キャンセル
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick();
      }
    });
  }

  private handleLeftClick(x: number, y: number): void {
    // UIが表示されている場合は何もしない
    if (this.uiManager.isAnyMenuVisible()) {
      return;
    }

    if (!this.isSettingPath && !this.isSelectingAction) {
      // 軍団選択を試みる
      const clickedArmy = this.findArmyAtPosition(x, y);

      if (clickedArmy) {
        this.showActionMenu(clickedArmy);
      }
    } else if (this.isSettingPath) {
      // 経路点を追加
      this.addWaypoint(x, y);
    }
  }

  private handleRightClick(): void {
    if (this.isSettingPath) {
      // 経路設定をキャンセル
      this.cancelPathSetting();
    } else {
      // 軍団の選択を解除
      this.deselectArmy();
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

  private showActionMenu(army: Army): void {
    this.isSelectingAction = true;
    
    // 前の選択を解除
    if (this.selectedArmy) {
      this.unhighlightCommander(this.selectedArmy);
    }
    
    this.selectedArmy = army;
    this.highlightCommander(army);
    
    // アクションメニューを表示
    this.uiManager.showActionMenu(
      army,
      () => {
        // 移動が選択された
        this.isSelectingAction = false;
        this.startMovementProcess();
      },
      () => {
        // キャンセルされた
        this.isSelectingAction = false;
        this.deselectArmy();
      }
    );
  }


  private startMovementProcess(): void {
    if (!this.selectedArmy) return;
    
    // 移動モード選択UIを表示
    this.uiManager.showMovementModeMenu(
      this.selectedArmy,
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
      }
    );
  }

  private showPathMessageAndStartSetting(): void {
    // 移動経路選択のメッセージを表示
    this.uiManager.showPathSelectionMessage(() => {
      // メッセージがクリックで非表示になった
      console.log("パス選択メッセージがクリックされました");
    });

    // 1秒待ってから経路選択モードを開始
    this.scene.time.delayedCall(1000, () => {
      // まだ選択中の軍団がある場合のみ経路設定を開始
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
    this.uiManager.hidePathSelectionMessage();
  }

  private startPathSetting(): void {
    this.isSettingPath = true;
    this.waypointBuffer = [];
    // 経路選択モード開始時にメッセージを非表示
    this.uiManager.hidePathSelectionMessage();
  }

  private addWaypoint(x: number, y: number): void {
    if (this.waypointBuffer.length >= 4) {
      // 最大経路点数に達しているので無視
      return;
    }

    // 経路の妥当性を検証
    const gridPos = this._mapManager.pixelToGrid(x, y);
    if (gridPos.x < 0 || gridPos.x >= this._mapManager.getMapWidth() ||
        gridPos.y < 0 || gridPos.y >= this._mapManager.getMapHeight()) {
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
    this.commandSystem.setPath(
      this.selectedArmy,
      this.waypointBuffer,
      this.currentMode,
    );

    // 状態をリセット
    this.isSettingPath = false;
    this.waypointBuffer = [];
    this.clearWaypointMarkers();
    this.uiManager.hidePathSelectionMessage();
  }

  private cancelPathSetting(): void {
    this.isSettingPath = false;
    this.waypointBuffer = [];
    this.clearWaypointMarkers();
    this.uiManager.hidePathSelectionMessage();
  }

  // 移動モードの切り替え
  public setMovementMode(mode: MovementMode): void {
    this.currentMode = mode;

    // 選択中の軍団があれば、その移動モードも更新
    if (this.selectedArmy) {
      this.selectedArmy.setMovementMode(mode);
    }
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
    this.waypointMarkers.forEach(marker => marker.destroy());
    this.waypointMarkers = [];
    
    // 経路の線も削除
    if (this.pathLines) {
      this.pathLines.clear();
    }
  }

  public destroy(): void {
    this.scene.input.off("pointerdown");
    this.deselectArmy();
    this.uiManager.destroy();
    if (this.pathLines) {
      this.pathLines.destroy();
    }
  }
}
