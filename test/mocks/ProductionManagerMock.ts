import { ProductionManager } from '../../src/production/ProductionManager';

/**
 * ProductionManagerのモック作成
 */
export function createMockProductionManager(): ProductionManager {
  const mockScene = {
    add: {
      existing: jest.fn(),
    },
    registry: {
      get: jest.fn(),
      set: jest.fn(),
    },
  } as any;

  return new ProductionManager(mockScene);
}
