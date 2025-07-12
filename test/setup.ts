// Jest Canvas Mock
import 'jest-canvas-mock';

// グローバルなモックとテスト環境の設定
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  width: number = 0;
  height: number = 0;
  
  constructor() {
    setTimeout(() => {
      this.width = 100;
      this.height = 100;
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// AudioContextのモック
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  })),
  destination: {}
})) as any;

// WebGLRenderingContextのモック
global.WebGLRenderingContext = jest.fn() as any;

// requestAnimationFrameのモック
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16);
}) as any;

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
}) as any;

// Phaser固有のモック設定
jest.mock('phaser', () => ({
  Game: jest.fn().mockImplementation((config) => ({
    config,
    scene: {
      add: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      get: jest.fn()
    },
    loop: {
      actualFps: 30
    },
    destroy: jest.fn()
  })),
  HEADLESS: 'headless',
  Scene: class MockScene {
    add = {
      text: jest.fn(),
      graphics: jest.fn(() => ({
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        strokePath: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn()
      })),
      sprite: jest.fn((x, y, texture, frame) => ({
        x,
        y,
        texture,
        frame,
        setDisplaySize: jest.fn(),
        setInteractive: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      })),
      container: jest.fn((x, y) => ({
        x,
        y,
        add: jest.fn(),
        setVisible: jest.fn(),
        destroy: jest.fn()
      }))
    };
    load = {
      on: jest.fn(),
      json: jest.fn(),
      spritesheet: jest.fn()
    };
    cache = {
      json: {
        get: jest.fn()
      }
    };
    cameras = {
      main: {
        width: 1280,
        height: 720,
        centerX: 640,
        centerY: 360,
        setBounds: jest.fn(),
        setZoom: jest.fn(),
        setScroll: jest.fn(),
        centerOn: jest.fn(),
        getWorldPoint: jest.fn()
      }
    };
  },
  GameObjects: {
    Sprite: class MockSprite {
      constructor(public scene: any, public x: number, public y: number, public texture: string, public frame?: string | number) {}
      setDisplaySize = jest.fn();
      setInteractive = jest.fn();
      on = jest.fn();
      destroy = jest.fn();
    },
    Graphics: class MockGraphics {
      fillStyle = jest.fn();
      fillRect = jest.fn();
      lineStyle = jest.fn();
      strokeRect = jest.fn();
      moveTo = jest.fn();
      lineTo = jest.fn();
      strokePath = jest.fn();
      clear = jest.fn();
      destroy = jest.fn();
    },
    Text: class MockText {
      constructor(public scene: any, public x: number, public y: number, public text: string, public style: any) {}
      setOrigin = jest.fn();
      destroy = jest.fn();
    },
    Container: class MockContainer {
      constructor(public scene: any, public x: number, public y: number) {}
      add = jest.fn();
      setVisible = jest.fn();
      destroy = jest.fn();
    }
  }
}));

// テストユーティリティ
export const createMockScene = () => {
  const mockScene = {
    add: {
      existing: jest.fn(),
      text: jest.fn(() => ({
        setOrigin: jest.fn(),
        destroy: jest.fn()
      })),
      graphics: jest.fn(() => ({
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        strokePath: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn()
      })),
      sprite: jest.fn((x: number, y: number, texture: string, frame?: string | number) => ({
        x,
        y,
        texture,
        frame,
        setDisplaySize: jest.fn(),
        setInteractive: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      })),
      container: jest.fn((x?: number, y?: number) => ({
        x: x || 0,
        y: y || 0,
        add: jest.fn(),
        setVisible: jest.fn(),
        destroy: jest.fn()
      }))
    },
    load: {
      on: jest.fn(),
      json: jest.fn(),
      spritesheet: jest.fn()
    },
    cache: {
      json: {
        get: jest.fn()
      }
    },
    cameras: {
      main: {
        width: 1280,
        height: 720,
        centerX: 640,
        centerY: 360,
        setBounds: jest.fn(),
        setZoom: jest.fn(),
        setScroll: jest.fn(),
        centerOn: jest.fn(),
        getWorldPoint: jest.fn()
      }
    }
  };
  
  return mockScene;
};

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});