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
  Math: {
    Distance: {
      Between: jest.fn((x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      }),
    },
  },
  Geom: {
    Rectangle: Object.assign(
      class MockRectangle {
        constructor(
          public x: number,
          public y: number,
          public width: number,
          public height: number,
        ) {}
        contains = jest.fn((x: number, y: number) => {
          return (
            x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height
          );
        });
      },
      {
        Contains: jest.fn((rect: any, x: number, y: number) => {
          return (
            x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
          );
        }),
      },
    ),
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
      container: jest.fn((x, y) => {
        const container: any = {
          x,
          y,
          list: [],
          input: null,
          eventListeners: new Map(),
          add: jest.fn(function (this: any, child: any) {
            this.list.push(child);
            return this;
          }),
          setVisible: jest.fn().mockReturnThis(),
          setInteractive: jest.fn(function (this: any, _hitArea?: any, _callback?: any) {
            this.input = { enabled: _hitArea === false ? false : true };
            return this;
          }),
          on: jest.fn(function (this: any, event: string, handler: Function) {
            if (!this.eventListeners.has(event)) {
              this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(handler);
            return this;
          }),
          removeAllListeners: jest.fn(function (this: any, event?: string) {
            if (event) {
              this.eventListeners.delete(event);
            } else {
              this.eventListeners.clear();
            }
            return this;
          }),
          destroy: jest.fn(),
        };
        return container;
      }),
      rectangle: jest.fn((x, y, width, height, fillColor, fillAlpha) => {
        const rect: any = {
          x,
          y,
          width,
          height,
          fillColor,
          fillAlpha,
          data: new Map(),
          eventListeners: new Map(),
          alpha: fillAlpha || 1,
          input: null,
          setStrokeStyle: jest.fn().mockReturnThis(),
          setFillStyle: jest.fn(function (this: any, color: number, alpha?: number) {
            this.fillColor = color;
            if (alpha !== undefined) {
              this.fillAlpha = alpha;
            }
            return this;
          }),
          setAlpha: jest.fn(function (this: any, alpha: number) {
            this.alpha = alpha;
            return this;
          }),
          setInteractive: jest.fn(function (this: any, _hitArea?: any, _callback?: any) {
            this.input = { enabled: true };
            return this;
          }),
          disableInteractive: jest.fn(function (this: any) {
            this.input = { enabled: false };
            return this;
          }),
          setOrigin: jest.fn().mockReturnThis(),
          setData: jest.fn(function (this: any, key: string, value: any) {
            this.data.set(key, value);
            return this;
          }),
          getData: jest.fn(function (this: any, key: string) {
            return this.data.get(key);
          }),
          on: jest.fn(function (this: any, event: string, handler: Function) {
            if (!this.eventListeners.has(event)) {
              this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(handler);
            return this;
          }),
          emit: jest.fn(function (this: any, event: string, ...args: any[]) {
            const handlers = this.eventListeners.get(event);
            if (handlers) {
              handlers.forEach((handler: any) => handler(...args));
            }
            return this;
          }),
          destroy: jest.fn(),
        };
        return rect;
      }),
      existing: jest.fn(),
      image: jest.fn((x, y, texture) => ({
        x,
        y,
        texture,
        setOrigin: jest.fn().mockReturnThis(),
        setDisplaySize: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      })),
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
      parentContainer: any = null;
      rotation: number = 0;

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
      setScale = jest.fn().mockReturnThis();
      setDepth = jest.fn().mockReturnThis();
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
    Image: class MockImage {
      constructor(
        public scene: any,
        public x: number,
        public y: number,
        public texture: string,
      ) {}
      setOrigin = jest.fn().mockReturnThis();
      setDisplaySize = jest.fn().mockReturnThis();
      setPosition = jest.fn().mockReturnThis();
      setDepth = jest.fn().mockReturnThis();
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
      setAlpha = jest.fn().mockReturnThis();
      setColor = jest.fn().mockReturnThis();
      destroy = jest.fn();
    },
    Rectangle: class MockRectangle {
      private eventListeners: Map<string, Function[]> = new Map();

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
      setOrigin = jest.fn().mockReturnThis();
      setFillStyle = jest.fn().mockReturnThis();
      disableInteractive = jest.fn().mockReturnThis();

      on = jest.fn((event: string, handler: Function) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(handler);
        return this;
      });

      emit = jest.fn((event: string, ...args: any[]) => {
        const handlers = this.eventListeners.get(event);
        if (handlers) {
          handlers.forEach((handler) => handler(...args));
        }
        return this;
      });

      destroy = jest.fn();
    },
    Container: class MockContainer {
      x: number;
      y: number;
      visible: boolean = true;
      list: any[] = [];
      depth: number = 0;
      data: Map<string, any> = new Map();
      input: any = null;
      eventListeners: Map<string, Function[]> = new Map();

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
        // Set parentContainer reference
        if (child && typeof child === 'object') {
          child.parentContainer = this;
        }
        return this;
      });
      remove = jest.fn(function (this: any, child: any) {
        const index = this.list.indexOf(child);
        if (index !== -1) {
          this.list.splice(index, 1);
          if (child && typeof child === 'object') {
            child.parentContainer = null;
          }
        }
        return this;
      });
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
      setDepth = jest.fn(function (this: any, depth: number) {
        this.depth = depth;
        return this;
      });
      setScrollFactor = jest.fn().mockReturnThis();
      setData = jest.fn(function (this: any, key: string, value: any) {
        this.data.set(key, value);
        return this;
      });
      getData = jest.fn(function (this: any, key: string) {
        return this.data.get(key);
      });
      setAlpha = jest.fn().mockReturnThis();
      setInteractive = jest.fn(function (this: any, _hitArea?: any, _callback?: any) {
        this.input = { enabled: true };
        return this;
      });
      on = jest.fn(function (this: any, event: string, handler: Function) {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(handler);
        return this;
      });
      removeAllListeners = jest.fn(function (this: any, event?: string) {
        if (event) {
          this.eventListeners.delete(event);
        } else {
          this.eventListeners.clear();
        }
        return this;
      });
      destroy = jest.fn();
    },
  },
}));

// テストユーティリティ
export const createMockScene = () => {
  const mockScene = {
    add: {
      existing: jest.fn(),
      group: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn(),
      })),
      text: jest.fn((x, y, text, style) => {
        const textObj: any = {
          x,
          y,
          text,
          style,
          data: new Map(),
          alpha: 1,
          setOrigin: jest.fn().mockReturnThis(),
          setText: jest.fn(function (this: any, newText: string) {
            this.text = newText;
            return this;
          }),
          setVisible: jest.fn().mockReturnThis(),
          setStyle: jest.fn().mockReturnThis(),
          setColor: jest.fn().mockReturnThis(),
          setAlpha: jest.fn(function (this: any, alpha: number) {
            this.alpha = alpha;
            return this;
          }),
          setData: jest.fn(function (this: any, key: string, value: any) {
            this.data.set(key, value);
            return this;
          }),
          getData: jest.fn(function (this: any, key: string) {
            return this.data.get(key);
          }),
          destroy: jest.fn(),
        };
        return textObj;
      }),
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
      image: jest.fn((x: number, y: number, texture: string) => ({
        x,
        y,
        texture,
        setOrigin: jest.fn().mockReturnThis(),
        setDisplaySize: jest.fn().mockReturnThis(),
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
          rotation: 0,
          setDisplaySize: jest.fn().mockReturnThis(),
          setInteractive: jest.fn().mockReturnThis(),
          setOrigin: jest.fn().mockReturnThis(),
          setTint: jest.fn().mockReturnThis(),
          clearTint: jest.fn().mockReturnThis(),
          setScale: jest.fn().mockReturnThis(),
          setDepth: jest.fn().mockReturnThis(),
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
        const container: any = {
          x: x || 0,
          y: y || 0,
          visible: true,
          list: [],
          data: new Map(),
          add: jest.fn(function (this: any, child: any) {
            if (Array.isArray(child)) {
              // 配列の場合は各要素を追加
              child.forEach((item) => {
                this.list.push(item);
                if (item && typeof item === 'object') {
                  item.parentContainer = this;
                }
              });
            } else {
              this.list.push(child);
              // Set parentContainer reference
              if (child && typeof child === 'object') {
                child.parentContainer = this;
              }
            }
            return this;
          }),
          remove: jest.fn(function (this: any, child: any) {
            const index = this.list.indexOf(child);
            if (index !== -1) {
              this.list.splice(index, 1);
              if (child && typeof child === 'object') {
                child.parentContainer = null;
              }
            }
            return this;
          }),
          setData: jest.fn(function (this: any, key: string, value: any) {
            this.data.set(key, value);
            return this;
          }),
          getData: jest.fn(function (this: any, key: string) {
            return this.data.get(key);
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
          setScrollFactor: jest.fn().mockReturnThis(),
          setAlpha: jest.fn().mockReturnThis(),
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
        ) => {
          const rect: any = {
            x,
            y,
            width,
            height,
            fillColor,
            fillAlpha,
            data: new Map(),
            eventListeners: new Map(),
            setStrokeStyle: jest.fn().mockReturnThis(),
            setFillStyle: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            disableInteractive: jest.fn().mockReturnThis(),
            removeInteractive: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis(),
            setData: jest.fn(function (this: any, key: string, value: any) {
              this.data.set(key, value);
              return this;
            }),
            getData: jest.fn(function (this: any, key: string) {
              return this.data.get(key);
            }),
            on: jest.fn(function (this: any, event: string, handler: Function) {
              if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
              }
              this.eventListeners.get(event).push(handler);
              return this;
            }),
            emit: jest.fn(function (this: any, event: string, ...args: any[]) {
              const handlers = this.eventListeners.get(event);
              if (handlers) {
                handlers.forEach((handler: any) => handler(...args));
              }
              return this;
            }),
            destroy: jest.fn(),
          };
          return rect;
        },
      ),
      circle: jest.fn(
        (x: number, y: number, radius: number, fillColor?: number, fillAlpha?: number) => {
          const circle: any = {
            x,
            y,
            radius,
            fillColor,
            fillAlpha,
            data: new Map(),
            setFillStyle: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            setData: jest.fn(function (this: any, key: string, value: any) {
              this.data.set(key, value);
              return this;
            }),
            getData: jest.fn(function (this: any, key: string) {
              return this.data.get(key);
            }),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
          };
          return circle;
        },
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
    time: {
      delayedCall: jest.fn((delay, callback) => {
        setTimeout(callback, delay);
      }),
      addEvent: jest.fn((config) => {
        const event = {
          destroy: jest.fn(),
          callback: config.callback || jest.fn(),
          delay: config.delay || 1000,
          loop: config.loop || false,
        };

        // jestのfakeTimersと連携
        if (config.callback) {
          const executeCallback = () => {
            config.callback();
            if (config.loop) {
              setTimeout(executeCallback, config.delay);
            }
          };
          setTimeout(executeCallback, config.delay);
        }

        return event;
      }),
      now: Date.now(),
    },
    anims: {
      exists: jest.fn(() => false),
      create: jest.fn((config) => {
        return {
          key: config.key,
          frames: config.frames,
          frameRate: config.frameRate,
          repeat: config.repeat,
        };
      }),
    },
    tweens: {
      add: jest.fn((config) => {
        // 即座にonCompleteを呼ぶ
        if (config.onComplete) {
          setTimeout(() => config.onComplete(), 0);
        }
        return {
          stop: jest.fn(),
          destroy: jest.fn(),
        };
      }),
    },
    events: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
    },
    sound: {
      play: jest.fn(),
    },
    input: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      setDefaultCursor: jest.fn(),
    },
  };

  return mockScene;
};

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
