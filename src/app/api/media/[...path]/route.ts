import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".vtt": "text/vtt",
  ".srt": "text/plain",
  ".ass": "text/plain",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathParts = resolvedParams.path;

    if (!pathParts || pathParts.length === 0) {
      return new NextResponse("File not specified", { status: 400 });
    }

    // Prevent directory traversal attacks
    const sanitizedPath = pathParts.join("/").replace(/\.\./g, "");
    const baseStorage = path.resolve("./storage");
    const filePath = path.resolve(baseStorage, sanitizedPath);

    // Verify file is within storage directory
    if (!filePath.startsWith(baseStorage)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    // Handle range request for video seeking
    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return new NextResponse("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      let isClosed = false;
      const readableStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => {
            if (!isClosed) {
              try {
                controller.enqueue(chunk);
              } catch {
                isClosed = true;
                fileStream.destroy();
              }
            }
          });
          fileStream.on("end", () => {
            if (!isClosed) {
              isClosed = true;
              try { controller.close(); } catch {}
            }
          });
          fileStream.on("error", (err) => {
            if (!isClosed) {
              isClosed = true;
              try { controller.error(err); } catch {}
            }
          });
        },
        cancel() {
          isClosed = true;
          fileStream.destroy();
        },
      });

      return new NextResponse(readableStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Standard non-range response
    const fileStream = fs.createReadStream(filePath);
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(readableStream as any, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Media route error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
