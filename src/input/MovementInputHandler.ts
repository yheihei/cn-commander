import * as Phaser from "phaser";
import { Army } from "../army/Army";
import { ArmyManager } from "../army/ArmyManager";
import { MapManager } from "../map/MapManager";
import { MovementCommandSystem } from "../movement/MovementCommand";
import { MovementMode } from "../types/MovementTypes";
import { Position } from "../types/CharacterTypes";

export class MovementInputHandler {
  private scene: Phaser.Scene;
  private armyManager: ArmyManager;
  private _mapManager: MapManager;
  private commandSystem: MovementCommandSystem;

  private selectedArmy: Army | null = null;
  private currentMode: MovementMode = MovementMode.NORMAL;
  private waypointBuffer: Position[] = [];
  private isSettingPath: boolean = false;

  constructor(
    scene: Phaser.Scene,
    armyManager: ArmyManager,
    mapManager: MapManager,
    commandSystem: MovementCommandSystem,
  ) {
    this.scene = scene;
    this.armyManager = armyManager;
    this._mapManager = mapManager;
    this.commandSystem = commandSystem;

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
    if (!this.isSettingPath) {
      // 軍団選択を試みる
      const clickedArmy = this.findArmyAtPosition(x, y);

      if (clickedArmy) {
        this.selectArmy(clickedArmy);
      } else if (this.selectedArmy) {
        // 移動経路の設定を開始
        this.startPathSetting();
        this.addWaypoint(x, y);
      }
    } else {
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

  private selectArmy(army: Army): void {
    this.selectedArmy = army;
    this.isSettingPath = false;
    this.waypointBuffer = [];

    // 指揮官にマーカーを表示（実装は別途必要）
    this.highlightCommander(army);
  }

  private deselectArmy(): void {
    if (this.selectedArmy) {
      this.unhighlightCommander(this.selectedArmy);
    }

    this.selectedArmy = null;
    this.isSettingPath = false;
    this.waypointBuffer = [];
  }

  private startPathSetting(): void {
    this.isSettingPath = true;
    this.waypointBuffer = [];
  }

  private addWaypoint(x: number, y: number): void {
    if (this.waypointBuffer.length >= 4) {
      // 最大経路点数に達したら移動を開始
      this.confirmMovement();
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
  }

  private cancelPathSetting(): void {
    this.isSettingPath = false;
    this.waypointBuffer = [];
    this.clearWaypointMarkers();
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

  private showWaypointMarker(_x: number, _y: number, _index: number): void {
    // 経路点マーカーを表示（実装は別途必要）
  }

  private clearWaypointMarkers(): void {
    // 全ての経路点マーカーを削除（実装は別途必要）
  }

  public destroy(): void {
    this.scene.input.off("pointerdown");
    this.deselectArmy();
  }
}
