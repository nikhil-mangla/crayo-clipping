import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      },
    });

    redisClient.on("error", (err) => {
      console.warn("Redis connection warning:", err.message);
    });
  }
  return redisClient;
}

export const AUTOCLIP_QUEUE_NAME = "autoclip-pipeline";

let autoclipQueue: Queue | null = null;

export function getAutoclipQueue(): Queue {
  if (!autoclipQueue) {
    const connection = getRedisClient();
    autoclipQueue = new Queue(AUTOCLIP_QUEUE_NAME, {
      connection: connection as unknown as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return autoclipQueue;
}

let workerInstance: Worker | null = null;

/**
 * Ensures a BullMQ worker is actively running in the application process
 */
export function ensureAutoclipWorker(): Worker | null {
  if (workerInstance) return workerInstance;

  try {
    const connection = getRedisClient();
    workerInstance = new Worker(
      AUTOCLIP_QUEUE_NAME,
      async (job: Job) => {
        console.log(`[Worker] Executing job ${job.id} (${job.name})`);
        if (job.name === "process_autoclip") {
          const { executeAutoClipPipeline } = await import("../video/autoclip-service");
          await executeAutoClipPipeline(job.data as AutoClipJobPayload);
        } else if (job.name === "render_clip") {
          const { executeRenderClip } = await import("../video/autoclip-service");
          await executeRenderClip(job.data as RenderClipJobPayload);
        } else {
          throw new Error(`Unknown job name: ${job.name}`);
        }
      },
      {
        connection: connection as unknown as any,
        concurrency: 2,
      }
    );

    workerInstance.on("completed", (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    workerInstance.on("failed", (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    });

    return workerInstance;
  } catch (err: any) {
    console.warn("Could not start in-process BullMQ worker:", err.message);
    return null;
  }
}

export interface AutoClipJobPayload {
  jobId: string;
  projectId: string;
  userId: string;
  sourceVideoPath: string;
  options: {
    minDuration?: number;
    maxDuration?: number;
    targetCount?: number;
    language?: string;
  };
}

export interface RenderClipJobPayload {
  renderJobId: string;
  candidateId: string;
  projectId: string;
  userId: string;
  options: {
    cropMode?: "center" | "left" | "right" | "blur_background" | "custom";
    customCropXPercent?: number;
    captionPreset?: "bold_viral" | "electric_violet" | "minimal_clean" | "classic_dark" | "none";
    quality?: "fast" | "high";
    antiClaimProtection?: boolean;
  };
}
