import PQueue from 'p-queue';
import { config } from './config';
import { processPhoto, type ProcessingResult } from './pipeline';

export interface QueueJob {
  photoName: string;
  rawPath: string;
  onlyLuts?: string[];
}

export interface QueueStatus {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

class ProcessingQueue {
  private queue: PQueue;
  private completedCount = 0;
  private failedCount = 0;
  private activeJobs = new Set<string>();

  constructor() {
    this.queue = new PQueue({ concurrency: config.concurrency });
  }

  /**
   * Add a job to the processing queue
   */
  async add(job: QueueJob): Promise<ProcessingResult> {
    // Skip if already in queue
    if (this.activeJobs.has(job.photoName)) {
      console.log(`[QUEUE] ${job.photoName} already in queue, skipping`);
      return {
        photoName: job.photoName,
        success: false,
        error: 'Already in queue',
        appliedLuts: [],
        failedLuts: [],
      };
    }

    this.activeJobs.add(job.photoName);

    return this.queue.add(async () => {
      try {
        const result = await processPhoto(
          job.rawPath,
          job.photoName,
          job.onlyLuts
        );

        if (result.success) {
          this.completedCount++;
        } else {
          this.failedCount++;
        }

        return result;
      } finally {
        this.activeJobs.delete(job.photoName);
      }
    }) as Promise<ProcessingResult>;
  }

  /**
   * Add multiple jobs to the queue
   */
  async addBatch(jobs: QueueJob[]): Promise<void> {
    for (const job of jobs) {
      // Don't await - let them queue up
      this.add(job).catch((err) => {
        console.error(`[QUEUE] Job failed for ${job.photoName}:`, err);
      });
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      pending: this.queue.pending,
      active: this.queue.size,
      completed: this.completedCount,
      failed: this.failedCount,
    };
  }

  /**
   * Check if a photo is currently being processed
   */
  isProcessing(photoName: string): boolean {
    return this.activeJobs.has(photoName);
  }

  /**
   * Wait for all jobs to complete
   */
  async onIdle(): Promise<void> {
    await this.queue.onIdle();
  }

  /**
   * Clear all pending jobs
   */
  clear(): void {
    this.queue.clear();
  }
}

// Singleton instance
export const processingQueue = new ProcessingQueue();
