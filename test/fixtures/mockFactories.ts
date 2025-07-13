import { Army } from '../../src/army/Army';
import { Character } from '../../src/character/Character';
import { MapManager } from '../../src/map/MapManager';
import { MovementMode, MovementState } from '../../src/types/MovementTypes';
import { CharacterStats } from '../../src/types/CharacterTypes';

// モック軍団の作成
export function createMockArmy(
  id: string,
  config?: {
    commander?: Partial<CharacterStats>;
    soldiers?: Partial<CharacterStats>[];
  },
): Army {
  const mockCommander = createMockCharacter('commander', config?.commander);
  const mockSoldiers =
    config?.soldiers?.map((stats, i) => createMockCharacter(`soldier${i}`, stats)) || [];

  const army = {
    getId: jest.fn(() => id),
    getName: jest.fn(() => `Army ${id}`),
    getCommander: jest.fn(() => mockCommander),
    getSoldiers: jest.fn(() => mockSoldiers),
    getAllMembers: jest.fn(() => [mockCommander, ...mockSoldiers]),
    getAliveMembers: jest.fn(() => [mockCommander, ...mockSoldiers]),
    getAverageMovementSpeed: jest.fn(() => {
      const allMembers = [mockCommander, ...mockSoldiers];
      const totalSpeed = allMembers.reduce((sum, member) => sum + member.getStats().moveSpeed, 0);
      return totalSpeed / allMembers.length;
    }),
    isActive: jest.fn(() => true),
    isMoving: jest.fn(() => false),
    x: 0,
    y: 0,
    setPosition: jest.fn((x: number, y: number) => {
      army.x = x;
      army.y = y;
    }),
    startMovement: jest.fn(),
    stopMovement: jest.fn(),
    getMovementState: jest.fn(
      () =>
        ({
          isMoving: false,
          currentPath: null,
          currentSpeed: 0,
          mode: MovementMode.NORMAL,
          targetPosition: null,
        }) as MovementState,
    ),
    setMovementMode: jest.fn(),
    setMovementSpeed: jest.fn(),
  } as unknown as Army;

  return army;
}

// モックキャラクターの作成
export function createMockCharacter(id: string, stats?: Partial<CharacterStats>): Character {
  const defaultStats: CharacterStats = {
    hp: 50,
    maxHp: 50,
    attack: 30,
    defense: 20,
    speed: 15,
    moveSpeed: 10,
    sight: 8,
    ...stats,
  };

  return {
    getId: jest.fn(() => id),
    getName: jest.fn(() => `Character ${id}`),
    getStats: jest.fn(() => defaultStats),
    isAlive: jest.fn(() => defaultStats.hp > 0),
    x: 0,
    y: 0,
    setPosition: jest.fn(),
    getBounds: jest.fn(() => ({
      contains: jest.fn(() => false),
    })),
    setTint: jest.fn(),
    clearTint: jest.fn(),
  } as unknown as Character;
}

// モックマップマネージャーの作成
export function createMockMapManager(): MapManager {
  return {
    pixelToGrid: jest.fn((x: number, y: number) => ({
      x: Math.floor(x / 16),
      y: Math.floor(y / 16),
    })),
    gridToPixel: jest.fn((x: number, y: number) => ({
      x: x * 16 + 8,
      y: y * 16 + 8,
    })),
    getTileAt: jest.fn(() => ({
      getTileType: jest.fn(() => 'plain'),
      isWalkable: jest.fn(() => true),
    })),
    getMapWidth: jest.fn(() => 512),
    getMapHeight: jest.fn(() => 512),
  } as unknown as MapManager;
}

// モックシーンの作成
export function createMockScene(): Phaser.Scene {
  return {
    add: {
      existing: jest.fn(),
    },
    input: {
      on: jest.fn(),
      off: jest.fn(),
    },
  } as unknown as Phaser.Scene;
}
