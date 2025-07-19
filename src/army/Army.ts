import * as Phaser from 'phaser';
import {
  ArmyConfig,
  SightArea,
  FormationType,
  ArmyMovement,
  ARMY_CONSTRAINTS,
  FactionType,
} from '../types/ArmyTypes';
import { Character } from '../character/Character';
import { Position } from '../types/CharacterTypes';
import { MovementMode, MovementState } from '../types/MovementTypes';
import { AttackTargetMarker } from '../ui/AttackTargetMarker';

export class Army extends Phaser.GameObjects.Container {
  private id: string;
  private armyName: string;
  private commander: Character;
  private soldiers: Character[] = [];
  private formation: FormationType = 'standard';
  private movement: ArmyMovement | null = null;
  private movementState: MovementState = {
    isMoving: false,
    currentPath: null,
    currentSpeed: 0,
    mode: MovementMode.NORMAL,
    targetPosition: null,
  };
  private owner: FactionType;
  private discovered: boolean = false;
  private attackTarget: Army | null = null;
  private attackTargetMarker: AttackTargetMarker | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ArmyConfig) {
    super(scene, x, y);

    this.id = config.id;
    this.armyName = config.name;
    this.commander = config.commander;
    this.owner = config.owner;

    this.add(this.commander);
    this.commander.setPosition(0, 0);

    // 指揮官マークをコンテナに追加
    const marker = this.commander.getCommanderMarker();
    if (marker) {
      this.add(marker);
    }

    if (config.soldiers) {
      config.soldiers.forEach((soldier) => this.addSoldier(soldier));
    }

    this.arrangeFormation();

    // 所属に応じた視覚的識別
    this.applyFactionVisuals();

    scene.add.existing(this);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.armyName;
  }

  getCommander(): Character {
    return this.commander;
  }

  getSoldiers(): Character[] {
    return [...this.soldiers];
  }

  getAllMembers(): Character[] {
    return [this.commander, ...this.soldiers];
  }

  isActive(): boolean {
    return this.getAliveMembers().length > 0;
  }

  getMemberCount(): number {
    return 1 + this.soldiers.length;
  }

  getOwner(): FactionType {
    return this.owner;
  }

  isPlayerArmy(): boolean {
    return this.owner === 'player';
  }

  isEnemyArmy(): boolean {
    return this.owner === 'enemy';
  }

  isNeutralArmy(): boolean {
    return this.owner === 'neutral';
  }

  isHostileTo(other: Army): boolean {
    if (this.owner === 'neutral' || other.owner === 'neutral') {
      return false;
    }
    return this.owner !== other.owner;
  }

  isAlliedWith(other: Army): boolean {
    return this.owner === other.owner;
  }

  setDiscovered(discovered: boolean): void {
    this.discovered = discovered;
    // プレイヤー軍団は常に表示、それ以外は発見状態に応じて表示/非表示
    this.setVisible(discovered || this.isPlayerArmy());
  }

  isDiscovered(): boolean {
    return this.discovered;
  }

  getAliveMembers(): Character[] {
    return this.getAllMembers().filter((member) => member.isAlive());
  }

  getAverageMovementSpeed(): number {
    const aliveMembers = this.getAliveMembers();
    if (aliveMembers.length === 0) return 0;

    const totalSpeed = aliveMembers.reduce((sum, member) => {
      return sum + member.getStats().moveSpeed;
    }, 0);

    return totalSpeed / aliveMembers.length;
  }

  getTotalSight(): SightArea[] {
    return this.getAliveMembers().map((member) => ({
      character: member,
      range: member.getStats().sight,
      center: {
        x: this.x + member.x,
        y: this.y + member.y,
      },
    }));
  }

  addSoldier(soldier: Character): boolean {
    if (this.soldiers.length >= ARMY_CONSTRAINTS.maxSoldiers) {
      return false;
    }

    this.soldiers.push(soldier);
    this.add(soldier);

    // 兵士が指揮官の場合、マークも追加
    const marker = soldier.getCommanderMarker();
    if (marker) {
      this.add(marker);
    }

    // 所属に応じたビジュアルを適用
    this.applyFactionVisuals();

    this.arrangeFormation();
    return true;
  }

  removeSoldier(soldierId: string): void {
    const index = this.soldiers.findIndex((s) => s.getId() === soldierId);
    if (index !== -1) {
      const soldier = this.soldiers.splice(index, 1)[0];
      this.remove(soldier);
      this.arrangeFormation();
    }
  }

  setFormation(formation: FormationType): void {
    this.formation = formation;
    this.arrangeFormation();
  }

  private applyFactionVisuals(): void {
    // 所属に応じて色を設定
    let tintColor: number | undefined;
    let markerColor: number | undefined;

    switch (this.owner) {
      case 'enemy':
        tintColor = 0xff8888; // 赤色
        markerColor = 0xff0000; // 赤色
        break;
      case 'neutral':
        tintColor = 0x88ff88; // 緑色
        markerColor = 0x00ff00; // 緑色
        break;
      case 'player':
      default:
        // プレイヤー軍団は元の色のまま
        tintColor = undefined;
        markerColor = 0x0088ff; // 青色
        break;
    }

    // 全メンバーにtintを適用
    if (tintColor !== undefined) {
      this.getAllMembers().forEach((member) => {
        member.setTint(tintColor);
      });
    }

    // 指揮官マーカーの色を変更
    const commanderMarker = this.commander.getCommanderMarker();
    if (commanderMarker && markerColor !== undefined) {
      commanderMarker.clear();
      commanderMarker.fillStyle(markerColor, 1);
      commanderMarker.fillCircle(0, 0, 5);
    }
  }

  private arrangeFormation(): void {
    const halfTile = 8;

    switch (this.formation) {
      case 'standard': {
        // 正方形に配置（各メンバーをグリッドの中央に配置）
        // Container中心からの相対位置で各グリッドの中央に配置
        const positions = [
          { x: -halfTile, y: -halfTile }, // 左上
          { x: halfTile, y: -halfTile }, // 右上
          { x: -halfTile, y: halfTile }, // 左下
          { x: halfTile, y: halfTile }, // 右下
        ];

        // 指揮官を最初の位置に配置
        this.commander.setPosition(positions[0].x, positions[0].y);

        // 兵士を残りの位置に配置
        this.soldiers.forEach((soldier, index) => {
          if (index < 3) {
            const pos = positions[index + 1];
            soldier.setPosition(pos.x, pos.y);
          }
        });
        break;
      }

      case 'defensive':
        // 防御陣形：指揮官を後方中央、兵士を前方に横一列
        this.commander.setPosition(0, halfTile);
        this.soldiers.forEach((soldier, index) => {
          const xOffset = (index - 1) * 16;
          soldier.setPosition(xOffset, -halfTile);
        });
        break;

      case 'offensive':
        // 攻撃陣形：指揮官を前方中央、兵士を後方に横一列
        this.commander.setPosition(0, -halfTile);
        this.soldiers.forEach((soldier, index) => {
          const xOffset = (index - 1) * 16;
          soldier.setPosition(xOffset, halfTile);
        });
        break;
    }
  }

  moveToPosition(position: Position): void {
    this.movement = {
      targetPosition: position,
      path: [position],
      currentPathIndex: 0,
      isMoving: true,
    };
  }

  update(_time: number, delta: number): void {
    if (this.movement && this.movement.isMoving) {
      const baseSpeed = this.getAverageMovementSpeed();

      // 移動モードによる速度補正
      let speedModifier = 1.0;
      if (this.movementState.mode === MovementMode.COMBAT) {
        speedModifier = 0.6;
      }

      const speed = baseSpeed * speedModifier;
      const moveDistance = (speed * delta) / 1000;

      const target = this.movement.targetPosition;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= moveDistance) {
        this.x = target.x;
        this.y = target.y;
        this.movement.isMoving = false;
      } else {
        this.x += (dx / distance) * moveDistance;
        this.y += (dy / distance) * moveDistance;
      }
    }

    // 攻撃目標マーカーの位置を更新
    if (this.attackTargetMarker) {
      this.attackTargetMarker.update();
    }

    // 攻撃目標が無効になった場合はクリア
    if (this.attackTarget && !this.attackTarget.isActive()) {
      this.clearAttackTarget();
    }

    this.removeDeadMembers();
  }

  private removeDeadMembers(): void {
    const deadSoldiers = this.soldiers.filter((s) => !s.isAlive());
    deadSoldiers.forEach((soldier) => {
      this.removeSoldier(soldier.getId());
    });
  }

  // 移動システム関連のメソッド

  startMovement(target: Position, mode: MovementMode): void {
    this.movementState.isMoving = true;
    this.movementState.targetPosition = target;
    this.movementState.mode = mode;

    // update メソッドで使用される movement プロパティも設定
    this.movement = {
      targetPosition: target,
      path: [target],
      currentPathIndex: 0,
      isMoving: true,
    };
  }

  stopMovement(): void {
    this.movementState.isMoving = false;
    this.movementState.targetPosition = null;
    this.movementState.currentPath = null;
    this.movementState.currentSpeed = 0;

    // movement プロパティもクリア
    this.movement = null;
  }

  getMovementState(): MovementState {
    return { ...this.movementState };
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  getMovementMode(): MovementMode {
    return this.movementState.mode;
  }

  setMovementMode(mode: MovementMode): void {
    this.movementState.mode = mode;
  }

  isMoving(): boolean {
    return this.movementState.isMoving;
  }

  setMovementSpeed(pixelsPerSecond: number): void {
    this.movementState.currentSpeed = pixelsPerSecond;
  }

  removeMember(character: Character): void {
    // 指揮官の場合
    if (this.commander === character) {
      this.remove(this.commander);
      // 指揮官が撃破されたら軍団は機能しなくなる
      // 実際のゲームロジックに応じて処理を追加
    } else {
      // 兵士の場合
      const index = this.soldiers.indexOf(character);
      if (index !== -1) {
        this.soldiers.splice(index, 1);
        this.remove(character);
      }
    }

    // 軍団のメンバーが0になったら軍団を削除
    if (this.getMemberCount() === 0) {
      this.destroy();
    }
  }

  // 攻撃目標関連のメソッド

  setAttackTarget(target: Army | null): void {
    // 既存のマーカーを削除
    if (this.attackTargetMarker) {
      this.attackTargetMarker.destroy();
      this.attackTargetMarker = null;
    }

    this.attackTarget = target;
    console.log(
      `Army.setAttackTarget: ${this.getName()} の攻撃目標を ${target ? target.getName() : 'null'} に設定`,
    );

    // 新しい目標が設定されたらマーカーを作成
    if (target && target.isActive()) {
      this.attackTargetMarker = new AttackTargetMarker(this.scene, target);
      console.log(`Army.setAttackTarget: マーカーを作成しました`);
    }
  }

  getAttackTarget(): Army | null {
    return this.attackTarget;
  }

  hasAttackTarget(): boolean {
    return this.attackTarget !== null && this.attackTarget.isActive();
  }

  clearAttackTarget(): void {
    // マーカーを削除
    if (this.attackTargetMarker) {
      this.attackTargetMarker.destroy();
      this.attackTargetMarker = null;
    }
    this.attackTarget = null;
  }

  destroy(): void {
    // 攻撃目標マーカーを削除
    if (this.attackTargetMarker) {
      this.attackTargetMarker.destroy();
      this.attackTargetMarker = null;
    }

    this.getAllMembers().forEach((member) => member.destroy());
    super.destroy();
  }
}
