/**
 * Indicator Service
 * Manages Web Workers for background indicator calculations
 * Handles worker pool, message passing, and caching
 */

import type { 
  IndicatorConfig, 
  IndicatorResult, 
  IndicatorType,
  OhlcvData,
  CalculateMessage 
} from '../types/indicators';

// Worker pool configuration
const MAX_WORKERS = 4;
const WORKER_IDLE_TIMEOUT = 30000; // 30 seconds

interface WorkerTask {
  id: string;
  config: IndicatorConfig;
  ohlcv: OhlcvData[];
  resolve: (result: IndicatorResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  lastUsed: number;
  currentTaskId: string | null;
}

class IndicatorService {
  private workers: PooledWorker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private resultsCache: Map<string, IndicatorResult> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Initialize the worker pool
   */
  initialize(): void {
    if (this.workers.length === 0) {
      for (let i = 0; i < MAX_WORKERS; i++) {
        this.createWorker();
      }
      console.log(`[IndicatorService] Initialized with ${MAX_WORKERS} workers`);
    }
  }

  /**
   * Calculate an indicator in the background
   */
  async calculateIndicator(
    config: IndicatorConfig,
    ohlcv: OhlcvData[]
  ): Promise<IndicatorResult> {
    this.initialize();

    // Check cache first
    const cacheKey = this.getCacheKey(config, ohlcv);
    const cached = this.resultsCache.get(cacheKey);
    if (cached) {
      console.log(`[IndicatorService] Cache hit for ${config.type} (${config.id})`);
      return cached;
    }

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: config.id,
        config,
        ohlcv,
        resolve: (result) => {
          // Cache the result
          this.resultsCache.set(cacheKey, result);
          this.cleanupCache();
          resolve(result);
        },
        reject,
        timestamp: Date.now()
      };

      // Check if there's already a task for this indicator
      const existingTask = this.activeTasks.get(config.id);
      if (existingTask) {
        // Replace the existing task
        existingTask.reject(new Error('Superseded by new calculation'));
      }

      this.activeTasks.set(config.id, task);
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Calculate multiple indicators in parallel
   */
  async calculateMultipleIndicators(
    configs: IndicatorConfig[],
    ohlcv: OhlcvData[]
  ): Promise<IndicatorResult[]> {
    const promises = configs
      .filter(config => config.visible)
      .map(config => this.calculateIndicator(config, ohlcv));
    
    return Promise.all(promises);
  }

  /**
   * Cancel a specific indicator calculation
   */
  cancelCalculation(indicatorId: string): void {
    const task = this.activeTasks.get(indicatorId);
    if (task) {
      task.reject(new Error('Calculation cancelled'));
      this.activeTasks.delete(indicatorId);
      
      // Remove from queue if still pending
      const queueIndex = this.taskQueue.findIndex(t => t.id === indicatorId);
      if (queueIndex > -1) {
        this.taskQueue.splice(queueIndex, 1);
      }
    }
  }

  /**
   * Cancel all calculations
   */
  cancelAll(): void {
    this.taskQueue.forEach(task => {
      task.reject(new Error('All calculations cancelled'));
    });
    this.taskQueue = [];
    
    this.activeTasks.forEach((task, id) => {
      task.reject(new Error('All calculations cancelled'));
    });
    this.activeTasks.clear();

    // Terminate all workers and recreate
    this.workers.forEach(pw => pw.worker.terminate());
    this.workers = [];
    this.initialize();
  }

  /**
   * Clear the results cache
   */
  clearCache(): void {
    this.resultsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.resultsCache.size,
      keys: Array.from(this.resultsCache.keys())
    };
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cancelAll();
    this.workers.forEach(pw => pw.worker.terminate());
    this.workers = [];
  }

  // Private methods

  private createWorker(): PooledWorker {
    const worker = new Worker(
      new URL('../workers/indicator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const pooledWorker: PooledWorker = {
      worker,
      busy: false,
      lastUsed: Date.now(),
      currentTaskId: null
    };

    worker.onmessage = (event) => {
      this.handleWorkerMessage(pooledWorker, event.data);
    };

    worker.onerror = (error) => {
      console.error('[IndicatorService] Worker error:', error);
      this.handleWorkerError(pooledWorker, error);
    };

    this.workers.push(pooledWorker);
    return pooledWorker;
  }

  private handleWorkerMessage(
    pooledWorker: PooledWorker, 
    data: { type: string; payload: unknown }
  ): void {
    const { type, payload } = data;

    if (type === 'result') {
      const result = payload as IndicatorResult;
      const task = this.activeTasks.get(result.id);
      
      if (task) {
        task.resolve(result);
        this.activeTasks.delete(result.id);
      }
      
      pooledWorker.busy = false;
      pooledWorker.currentTaskId = null;
      pooledWorker.lastUsed = Date.now();
      
      this.processQueue();
    } else if (type === 'error') {
      const { id, error } = payload as { id: string; error: string };
      const task = this.activeTasks.get(id);
      
      if (task) {
        task.reject(new Error(error));
        this.activeTasks.delete(id);
      }
      
      pooledWorker.busy = false;
      pooledWorker.currentTaskId = null;
      pooledWorker.lastUsed = Date.now();
      
      this.processQueue();
    }
  }

  private handleWorkerError(pooledWorker: PooledWorker, error: ErrorEvent): void {
    console.error('[IndicatorService] Worker error:', error);
    
    if (pooledWorker.currentTaskId) {
      const task = this.activeTasks.get(pooledWorker.currentTaskId);
      if (task) {
        task.reject(new Error(error.message));
        this.activeTasks.delete(pooledWorker.currentTaskId);
      }
    }
    
    // Recreate the worker
    const index = this.workers.indexOf(pooledWorker);
    if (index > -1) {
      pooledWorker.worker.terminate();
      this.workers[index] = this.createWorker();
    }
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    // Check if task was already resolved/rejected
    if (!this.activeTasks.has(task.id)) return;

    availableWorker.busy = true;
    availableWorker.currentTaskId = task.id;
    availableWorker.lastUsed = Date.now();

    const message: CalculateMessage = {
      type: 'calculate',
      payload: {
        id: task.config.id,
        indicatorType: task.config.type,
        ohlcv: task.ohlcv,
        parameters: task.config.parameters
      }
    };

    availableWorker.worker.postMessage(message);
  }

  private getCacheKey(config: IndicatorConfig, ohlcv: OhlcvData[]): string {
    const dataHash = this.hashOhlcv(ohlcv);
    const paramsHash = JSON.stringify(config.parameters);
    return `${config.type}_${config.id}_${paramsHash}_${dataHash}`;
  }

  private hashOhlcv(ohlcv: OhlcvData[]): string {
    // Simple hash of first and last candle timestamps and count
    if (ohlcv.length === 0) return 'empty';
    const first = ohlcv[0].time;
    const last = ohlcv[ohlcv.length - 1].time;
    const count = ohlcv.length;
    return `${first}_${last}_${count}`;
  }

  private cleanupCache(): void {
    // Keep cache size reasonable (max 50 entries)
    if (this.resultsCache.size > 50) {
      const entries = Array.from(this.resultsCache.entries());
      // Sort by timestamp (newest first)
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      // Keep only the 40 most recent
      this.resultsCache = new Map(entries.slice(0, 40));
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      // Clean up idle workers
      this.workers = this.workers.filter(pw => {
        if (!pw.busy && now - pw.lastUsed > WORKER_IDLE_TIMEOUT) {
          pw.worker.terminate();
          return false;
        }
        return true;
      });

      // Ensure minimum worker count
      while (this.workers.length < MAX_WORKERS) {
        this.createWorker();
      }
    }, 10000); // Check every 10 seconds
  }
}

// Export singleton instance
export const indicatorService = new IndicatorService();
export default indicatorService;
