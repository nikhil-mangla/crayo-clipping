import { getAutoclipQueue, AutoClipJobPayload, RenderClipJobPayload } from "./autoclip-queue";
import { executeAutoClipPipeline, executeRenderClip } from "../video/autoclip-service";

/**
 * Dispatches an AutoClip analysis job
 */
export async function dispatchAutoClipJob(payload: AutoClipJobPayload): Promise<void> {
  let queuedViaBullMQ = false;

  try {
    const queue = getAutoclipQueue();
    await queue.add("process_autoclip", payload, {
      jobId: payload.jobId,
    });
    queuedViaBullMQ = true;
  } catch (err: any) {
    console.warn("Could not push job to Redis BullMQ queue, falling back to direct background execution:", err.message);
  }

  // If Redis was not reached or to guarantee instantaneous execution in local dev, execute asynchronously
  if (!queuedViaBullMQ) {
    setImmediate(async () => {
      try {
        await executeAutoClipPipeline(payload);
      } catch (e) {
        console.error("Direct execution of AutoClip pipeline failed:", e);
      }
    });
  }
}

/**
 * Dispatches a Clip Rendering job
 */
export async function dispatchRenderClipJob(payload: RenderClipJobPayload): Promise<void> {
  let queuedViaBullMQ = false;

  try {
    const queue = getAutoclipQueue();
    await queue.add("render_clip", payload, {
      jobId: payload.renderJobId,
    });
    queuedViaBullMQ = true;
  } catch (err: any) {
    console.warn("Could not push render job to Redis BullMQ queue, falling back to direct background execution:", err.message);
  }

  if (!queuedViaBullMQ) {
    setImmediate(async () => {
      try {
        await executeRenderClip(payload);
      } catch (e) {
        console.error("Direct execution of render clip failed:", e);
      }
    });
  }
}
