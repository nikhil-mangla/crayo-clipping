import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export const ASPECT_RATIOS = {
  VERTICAL_9_16: { width: 1080, height: 1920, label: "9:16 Vertical" },
  LANDSCAPE_16_9: { width: 1920, height: 1080, label: "16:9 Landscape" },
  SQUARE_1_1: { width: 1080, height: 1080, label: "1:1 Square" },
  PORTRAIT_4_5: { width: 1080, height: 1350, label: "4:5 Portrait" },
} as const;

export const PLATFORMS = {
  YOUTUBE_SHORTS: { label: "YouTube Shorts", maxDuration: 60 },
  INSTAGRAM_REELS: { label: "Instagram Reels", maxDuration: 90 },
  TIKTOK: { label: "TikTok", maxDuration: 180 },
  FACEBOOK_REELS: { label: "Facebook Reels", maxDuration: 90 },
  YOUTUBE: { label: "YouTube", maxDuration: 3600 },
  CUSTOM: { label: "Custom", maxDuration: 3600 },
} as const;

export const SUPPORTED_VIDEO_FORMATS = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

export const SUPPORTED_AUDIO_FORMATS = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/webm",
];

export const SUPPORTED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const MAX_FILE_SIZES = {
  video: 500 * 1024 * 1024, // 500MB
  audio: 50 * 1024 * 1024,  // 50MB
  image: 20 * 1024 * 1024,  // 20MB
} as const;
