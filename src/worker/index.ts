import { Worker } from "bullmq";
import { getRedisClient, AUTOCLIP_QUEUE_NAME, AutoClipJobPayload, RenderClipJobPayload } from "@/lib/queue/autoclip-queue";
import { executeAutoClipPipeline, executeRenderClip } from "@/lib/video/autoclip-service";

console.log("Starting ClipForge AutoClip Worker...");

const connection = getRedisClient();

export const autoclipWorker = new Worker(
  AUTOCLIP_QUEUE_NAME,
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === "process_autoclip") {
      await executeAutoClipPipeline(job.data as AutoClipJobPayload);
    } else if (job.name === "render_clip") {
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

autoclipWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

autoclipWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
