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
  };
}
