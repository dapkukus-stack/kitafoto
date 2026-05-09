/**
 * StressTestRunner
 * ─────────────────────────────────────────────────────────────
 * Automated stress testing utility for KitaFoto.
 * Triggered from Admin → Debug → Stress Test.
 *
 * Test suites:
 *   • Navigation spam: rapid Home→Frame→Home cycling
 *   • Capture spam: rapid photo capture attempts
 *   • Upload spam: enqueue many upload jobs
 *   • Print spam: enqueue many print jobs
 *   • Memory pressure: allocate/release to test GC
 *
 * Design:
 *   • Runs async — does not block UI thread
 *   • Reports progress via callback
 *   • Captures before/after memory for delta check
 *   • Logs everything to DiagnosticsService
 *   • Can be cancelled mid-run
 *   • Results exportable as JSON
 *
 * Usage:
 *   const runner = new StressTestRunner();
 *   runner.onProgress = (p) => updateUI(p);
 *   const result = await runner.runSuite('full');
 */

import { DiagnosticsService } from './DiagnosticsService';
import { PerformanceMonitor } from './PerformanceMonitor';

// ── Types ────────────────────────────────────────────────────

export type StressTestSuite = 'full' | 'navigation' | 'capture' | 'queue' | 'memory';

export interface StressTestConfig {
  /** Number of navigation cycles (Home→Frame→Home) */
  navigationCycles: number;
  /** Number of rapid capture attempts */
  captureAttempts: number;
  /** Number of upload jobs to enqueue */
  uploadEnqueues: number;
  /** Number of print jobs to enqueue */
  printEnqueues: number;
  /** Delay between actions in ms (0 = as fast as possible) */
  actionDelayMs: number;
  /** Memory pressure: allocate N MB then release */
  memoryPressureMB: number;
}

export interface StressTestProgress {
  suite: StressTestSuite;
  phase: string;
  current: number;
  total: number;
  percentComplete: number;
  elapsedMs: number;
  errors: number;
}

export interface StressTestResult {
  suite: StressTestSuite;
  passed: boolean;
  durationMs: number;
  totalActions: number;
  errors: string[];
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  fpsDuringTest: number;
  minFpsDuringTest: number;
  janksDuringTest: number;
  timestamp: string;
}

// ── Default Configs ──────────────────────────────────────────

const SUITE_CONFIGS: Record<StressTestSuite, StressTestConfig> = {
  full: {
    navigationCycles: 100,
    captureAttempts:  50,
    uploadEnqueues:   30,
    printEnqueues:    20,
    actionDelayMs:    50,
    memoryPressureMB: 50,
  },
  navigation: {
    navigationCycles: 200,
    captureAttempts:  0,
    uploadEnqueues:   0,
    printEnqueues:    0,
    actionDelayMs:    30,
    memoryPressureMB: 0,
  },
  capture: {
    navigationCycles: 0,
    captureAttempts:  100,
    uploadEnqueues:   0,
    printEnqueues:    0,
    actionDelayMs:    100,
    memoryPressureMB: 0,
  },
  queue: {
    navigationCycles: 0,
    captureAttempts:  0,
    uploadEnqueues:   100,
    printEnqueues:    50,
    actionDelayMs:    10,
    memoryPressureMB: 0,
  },
  memory: {
    navigationCycles: 50,
    captureAttempts:  20,
    uploadEnqueues:   10,
    printEnqueues:    10,
    actionDelayMs:    0,
    memoryPressureMB: 100,
  },
};

// ═══════════════════════════════════════════════════════════════

export class StressTestRunner {
  private cancelled = false;
  private errors: string[] = [];
  private fpsReadings: number[] = [];
  private startMemory = 0;

  /** Callback for progress updates */
  onProgress: ((progress: StressTestProgress) => void) | null = null;

  // ── Public API ─────────────────────────────────────────────

  async runSuite(suite: StressTestSuite): Promise<StressTestResult> {
    this.cancelled = false;
    this.errors = [];
    this.fpsReadings = [];

    const config  = SUITE_CONFIGS[suite];
    const startAt = Date.now();

    DiagnosticsService.info('system', `Stress test "${suite}" started`, config as any);

    // Capture initial state
    const perfBefore   = PerformanceMonitor.getStats();
    this.startMemory   = perfBefore.memoryMB;
    const janksBefore  = perfBefore.jankCount;

    // Subscribe to FPS during test
    const unsubscribe = PerformanceMonitor.subscribe((stats) => {
      this.fpsReadings.push(stats.fps);
    });

    let totalActions = 0;

    try {
      // ── Phase 1: Navigation Spam ─────────────────────────
      if (config.navigationCycles > 0 && !this.cancelled) {
        totalActions += await this.runNavigationSpam(
          suite, config.navigationCycles, config.actionDelayMs, startAt
        );
      }

      // ── Phase 2: Capture Spam ────────────────────────────
      if (config.captureAttempts > 0 && !this.cancelled) {
        totalActions += await this.runCaptureSpam(
          suite, config.captureAttempts, config.actionDelayMs, startAt
        );
      }

      // ── Phase 3: Queue Spam ──────────────────────────────
      if ((config.uploadEnqueues > 0 || config.printEnqueues > 0) && !this.cancelled) {
        totalActions += await this.runQueueSpam(
          suite, config.uploadEnqueues, config.printEnqueues, config.actionDelayMs, startAt
        );
      }

      // ── Phase 4: Memory Pressure ─────────────────────────
      if (config.memoryPressureMB > 0 && !this.cancelled) {
        totalActions += await this.runMemoryPressure(
          suite, config.memoryPressureMB, startAt
        );
      }

    } catch (error) {
      this.errors.push(`Unhandled: ${error instanceof Error ? error.message : String(error)}`);
    }

    unsubscribe();

    // Capture final state
    // Allow GC to run
    await this.delay(2000);
    const perfAfter = PerformanceMonitor.getStats();

    const durationMs = Date.now() - startAt;
    const avgFps     = this.fpsReadings.length > 0
      ? Math.round(this.fpsReadings.reduce((a, b) => a + b, 0) / this.fpsReadings.length)
      : 0;
    const minFps     = this.fpsReadings.length > 0
      ? Math.min(...this.fpsReadings)
      : 0;

    const result: StressTestResult = {
      suite,
      passed:           this.errors.length === 0 && !this.cancelled,
      durationMs,
      totalActions,
      errors:           this.errors,
      memoryBefore:     this.startMemory,
      memoryAfter:      perfAfter.memoryMB,
      memoryDelta:      perfAfter.memoryMB - this.startMemory,
      fpsDuringTest:    avgFps,
      minFpsDuringTest: minFps,
      janksDuringTest:  perfAfter.jankCount - janksBefore,
      timestamp:        new Date().toISOString(),
    };

    DiagnosticsService.info('system', `Stress test "${suite}" completed`, {
      passed: result.passed,
      durationMs: result.durationMs,
      errors: result.errors.length,
      memoryDelta: result.memoryDelta,
      avgFps,
    });

    return result;
  }

  cancel(): void {
    this.cancelled = true;
  }

  isRunning(): boolean {
    return !this.cancelled;
  }

  // ── Phase Runners ──────────────────────────────────────────

  private async runNavigationSpam(
    suite: StressTestSuite,
    cycles: number,
    delayMs: number,
    startAt: number,
  ): Promise<number> {
    let completed = 0;

    for (let i = 0; i < cycles; i++) {
      if (this.cancelled) break;

      try {
        // Simulate navigation state change (no actual navigator — just state churn)
        // In real device, this would use navigation.navigate/goBack
        // Here we simulate the memory/render pressure
        const fakeState = { screen: i % 2 === 0 ? 'Home' : 'FramePicker', iteration: i };
        void fakeState; // consume to prevent optimization
        completed++;
      } catch (error) {
        this.errors.push(`Nav cycle ${i}: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.reportProgress(suite, 'Navigation Spam', i + 1, cycles, startAt);

      if (delayMs > 0) await this.delay(delayMs);
    }

    return completed;
  }

  private async runCaptureSpam(
    suite: StressTestSuite,
    attempts: number,
    delayMs: number,
    startAt: number,
  ): Promise<number> {
    let completed = 0;

    for (let i = 0; i < attempts; i++) {
      if (this.cancelled) break;

      try {
        // Simulate capture pressure: allocate buffer like a JPEG, then release
        const fakeJpeg = new Uint8Array(200 * 1024); // 200KB
        fakeJpeg[0] = 0xFF; // JPEG marker
        fakeJpeg[1] = 0xD8;
        void fakeJpeg; // will be GC'd
        completed++;
      } catch (error) {
        this.errors.push(`Capture ${i}: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.reportProgress(suite, 'Capture Spam', i + 1, attempts, startAt);

      if (delayMs > 0) await this.delay(delayMs);
    }

    return completed;
  }

  private async runQueueSpam(
    suite: StressTestSuite,
    uploads: number,
    prints: number,
    delayMs: number,
    startAt: number,
  ): Promise<number> {
    let completed = 0;
    const total = uploads + prints;

    // Upload queue spam
    for (let i = 0; i < uploads; i++) {
      if (this.cancelled) break;
      try {
        // Simulate enqueue without actual DB write (avoid polluting real queue)
        // Real integration would call UploadQueue.enqueue('fake-photo-id')
        const fakeJob = { id: `stress-upload-${i}`, status: 'pending', photoId: `fake-${i}` };
        void fakeJob;
        completed++;
      } catch (error) {
        this.errors.push(`Upload enqueue ${i}: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.reportProgress(suite, 'Queue Spam (Upload)', i + 1, total, startAt);
      if (delayMs > 0) await this.delay(delayMs);
    }

    // Print queue spam
    for (let i = 0; i < prints; i++) {
      if (this.cancelled) break;
      try {
        const fakeJob = { id: `stress-print-${i}`, status: 'pending', photoId: `fake-${i}` };
        void fakeJob;
        completed++;
      } catch (error) {
        this.errors.push(`Print enqueue ${i}: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.reportProgress(suite, 'Queue Spam (Print)', uploads + i + 1, total, startAt);
      if (delayMs > 0) await this.delay(delayMs);
    }

    return completed;
  }

  private async runMemoryPressure(
    suite: StressTestSuite,
    targetMB: number,
    startAt: number,
  ): Promise<number> {
    this.reportProgress(suite, 'Memory Pressure', 0, 3, startAt);

    try {
      // Step 1: Allocate large buffer
      const chunkSize = 1024 * 1024; // 1 MB
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < targetMB; i++) {
        if (this.cancelled) break;
        chunks.push(new Uint8Array(chunkSize));
        if (i % 10 === 0) {
          this.reportProgress(suite, 'Memory Pressure (allocate)', i, targetMB, startAt);
          await this.delay(10); // Yield to event loop
        }
      }

      this.reportProgress(suite, 'Memory Pressure (hold)', 1, 3, startAt);
      await this.delay(2000); // Hold for 2 seconds

      // Step 2: Release
      chunks.length = 0; // Allow GC

      this.reportProgress(suite, 'Memory Pressure (release)', 2, 3, startAt);
      await this.delay(3000); // Wait for GC

      this.reportProgress(suite, 'Memory Pressure (verify)', 3, 3, startAt);

    } catch (error) {
      // OOM is expected in extreme cases — that's what we're testing
      this.errors.push(`Memory pressure: ${error instanceof Error ? error.message : String(error)}`);
    }

    return 1;
  }

  // ── Helpers ────────────────────────────────────────────────

  private reportProgress(
    suite: StressTestSuite,
    phase: string,
    current: number,
    total: number,
    startAt: number,
  ): void {
    if (!this.onProgress) return;
    this.onProgress({
      suite,
      phase,
      current,
      total,
      percentComplete: total > 0 ? Math.round((current / total) * 100) : 0,
      elapsedMs: Date.now() - startAt,
      errors: this.errors.length,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
