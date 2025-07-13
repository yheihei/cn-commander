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
    gain: { value: 1 },
  })),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 },
  })),
  destination: {},
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
  Geom: {
    Rectangle: class MockRectangle {
      constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
      ) {}
      contains = jest.fn((x: number, y: number) => {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
      });
    },
  },
  Game: jest.fn().mockImplementation((config) => ({
    config,
    scene: {
      add: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      get: jest.fn(),
    },
    loop: {
      actualFps: 30,
    },
    destroy: jest.fn(),
  })),
  HEADLESS: 'headless',
  Scene: class MockScene {
    add = {
      text: jest.fn(),
      graphics: jest.fn(() => ({
        fillStyle: jest.fn().mockReturnThis(),
        fillRect: jest.fn().mockReturnThis(),
        fillCircle: jest.fn().mockReturnThis(),
        lineStyle: jest.fn().mockReturnThis(),
        strokeRect: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        strokePath: jest.fn().mockReturnThis(),
        clear: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      })),
      sprite: jest.fn((x, y, texture, frame) => ({
        x,
        y,
        texture,
        frame,
        setDisplaySize: jest.fn(),
        setInteractive: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
      })),
      container: jest.fn((x, y) => ({
        x,
        y,
        add: jest.fn(),
        setVisible: jest.fn(),
        destroy: jest.fn(),
      })),
      rectangle: jest.fn((x, y, width, height, fillColor, fillAlpha) => ({
        x,
        y,
        width,
        height,
        fillColor,
        fillAlpha,
        setStrokeStyle: jest.fn().mockReturnThis(),
        setInteractive: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        emit: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      })),
      existing: jest.fn(),
    };
    load = {
      on: jest.fn(),
      json: jest.fn(),
      spritesheet: jest.fn(),
    };
    cache = {
      json: {
        get: jest.fn(),
      },
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
        getWorldPoint: jest.fn(),
        worldView: {
          left: 0,
          right: 1280,
          top: 0,
          bottom: 720,
        },
      },
    };
    input = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };
    time = {
      delayedCall: jest.fn((delay, callback) => {
        setTimeout(callback, delay);
      }),
    };
  },
  GameObjects: {
    Sprite: class MockSprite {
      constructor(
        public scene: any,
        public x: number,
        public y: number,
        public texture: string,
        public frame?: string | number,
      ) {}
      setDisplaySize = jest.fn().mockReturnThis();
      setInteractive = jest.fn().mockReturnThis();
      setOrigin = jest.fn().mockReturnThis();
      setTint = jest.fn().mockReturnThis();
      clearTint = jest.fn().mockReturnThis();
      setPosition = jest.fn(function (this: any, x?: number, y?: number) {
        if (x !== undefined) this.x = x;
        if (y !== undefined) this.y = y;
        return this;
      });
      on = jest.fn().mockReturnThis();
      getBounds = jest.fn(() => ({
        contains: jest.fn((x, y) => {
          // 簡易的な境界判定の実装
          const sprite = this as any;
          const halfWidth = 8;
          const halfHeight = 8;
          return (
            x >= sprite.x - halfWidth &&
            x <= sprite.x + halfWidth &&
            y >= sprite.y - halfHeight &&
            y <= sprite.y + halfHeight
          );
        }),
      }));
      getCenter = jest.fn((output) => {
        const center = output || { x: 0, y: 0 };
        center.x = this.x || 0;
        center.y = this.y || 0;
        return center;
      });
      destroy = jest.fn();
    },
    Graphics: class MockGraphics {
      fillStyle = jest.fn().mockReturnThis();
      fillRect = jest.fn().mockReturnThis();
      fillCircle = jest.fn().mockReturnThis();
      lineStyle = jest.fn().mockReturnThis();
      strokeRect = jest.fn().mockReturnThis();
      moveTo = jest.fn().mockReturnThis();
      lineTo = jest.fn().mockReturnThis();
      strokePath = jest.fn().mockReturnThis();
      clear = jest.fn().mockReturnThis();
      setPosition = jest.fn().mockReturnThis();
      setDepth = jest.fn().mockReturnThis();
      destroy = jest.fn();
    },
    Text: class MockText {
      constructor(
        public scene: any,
        public x: number,
        public y: number,
        public text: string,
        public style: any,
      ) {}
      setOrigin = jest.fn().mockReturnThis();
      setText = jest.fn().mockReturnThis();
      destroy = jest.fn();
    },
    Rectangle: class MockRectangle {
      constructor(
        public scene: any,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public fillColor?: number,
        public fillAlpha?: number,
      ) {}
      setStrokeStyle = jest.fn().mockReturnThis();
      setInteractive = jest.fn().mockReturnThis();
      on = jest.fn().mockReturnThis();
      emit = jest.fn().mockReturnThis();
      destroy = jest.fn();
    },
    Container: class MockContainer {
      x: number;
      y: number;
      visible: boolean = true;
      list: any[] = [];

      constructor(
        public scene: any,
        x: number,
        y: number,
      ) {
        this.x = x;
        this.y = y;
        this.list = [];
      }
      add = jest.fn(function (this: any, child: any) {
        this.list.push(child);
        return this;
      });
      remove = jest.fn().mockReturnThis();
      setVisible = jest.fn(function (this: any, visible: boolean) {
        this.visible = visible;
        return this;
      });
      setActive = jest.fn().mockReturnThis();
      getBounds = jest.fn(() => ({
        contains: jest.fn((x, y) => {
          // 簡易的な境界判定の実装
          const sprite = this as any;
          const halfWidth = 8;
          const halfHeight = 8;
          return (
            x >= sprite.x - halfWidth &&
            x <= sprite.x + halfWidth &&
            y >= sprite.y - halfHeight &&
            y <= sprite.y + halfHeight
          );
        }),
      }));
      getAt = jest.fn(function (this: any, index: number) {
        return this.list[index];
      });
      setPosition = jest.fn(function (this: any, x?: number, y?: number) {
        if (x !== undefined) this.x = x;
        if (y !== undefined) this.y = y;
        return this;
      });
      once = jest.fn().mockReturnThis();
      setDepth = jest.fn().mockReturnThis();
      destroy = jest.fn();
    },
  },
}));

// テストユーティリティ
export const createMockScene = () => {
  const mockScene = {
    add: {
      existing: jest.fn(),
      text: jest.fn(() => ({
        setOrigin: jest.fn().mockReturnThis(),
        setText: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      })),
      graphics: jest.fn(() => ({
        fillStyle: jest.fn().mockReturnThis(),
        fillRect: jest.fn().mockReturnThis(),
        fillCircle: jest.fn().mockReturnThis(),
        lineStyle: jest.fn().mockReturnThis(),
        strokeRect: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        strokePath: jest.fn().mockReturnThis(),
        clear: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      })),
      sprite: jest.fn((x: number, y: number, texture: string, frame?: string | number) => {
        const sprite: any = {
          x,
          y,
          texture,
          frame,
          setDisplaySize: jest.fn(),
          setInteractive: jest.fn(),
          setOrigin: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          clearTint: jest.fn().mockReturnThis(),
          on: jest.fn(),
          getBounds: jest.fn(function (this: any) {
            return {
              contains: jest.fn((cx: number, cy: number) => {
                const halfWidth = 8;
                const halfHeight = 8;
                return (
                  cx >= sprite.x - halfWidth &&
                  cx <= sprite.x + halfWidth &&
                  cy >= sprite.y - halfHeight &&
                  cy <= sprite.y + halfHeight
                );
              }),
            };
          }),
          getCenter: jest.fn((output?: any) => {
            const center = output || { x: 0, y: 0 };
            center.x = sprite.x;
            center.y = sprite.y;
            return center;
          }),
          destroy: jest.fn(),
        };
        return sprite;
      }),
      container: jest.fn((x?: number, y?: number) => {
        const container = {
          x: x || 0,
          y: y || 0,
          visible: true,
          list: [],
          add: jest.fn(function (this: any, child: any) {
            this.list.push(child);
            return this;
          }),
          setVisible: jest.fn(function (this: any, visible: boolean) {
            this.visible = visible;
            return this;
          }),
          setActive: jest.fn().mockReturnThis(),
          getBounds: jest.fn(() => ({
            contains: jest.fn(() => false),
          })),
          getAt: jest.fn(function (this: any, index: number) {
            return this.list[index];
          }),
          setDepth: jest.fn().mockReturnThis(),
          destroy: jest.fn(),
        };
        return container;
      }),
      rectangle: jest.fn(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          fillColor?: number,
          fillAlpha?: number,
        ) => ({
          x,
          y,
          width,
          height,
          fillColor,
          fillAlpha,
          setStrokeStyle: jest.fn().mockReturnThis(),
          setInteractive: jest.fn().mockReturnThis(),
          on: jest.fn().mockReturnThis(),
          emit: jest.fn().mockReturnThis(),
          destroy: jest.fn(),
        }),
      ),
    },
    load: {
      on: jest.fn(),
      json: jest.fn(),
      spritesheet: jest.fn(),
    },
    cache: {
      json: {
        get: jest.fn(),
      },
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
        getWorldPoint: jest.fn(),
        worldView: {
          left: 0,
          right: 1280,
          top: 0,
          bottom: 720,
        },
      },
    },
    input: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    time: {
      delayedCall: jest.fn((delay, callback) => {
        setTimeout(callback, delay);
      }),
    },
  };

  return mockScene;
};

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
