import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user MediaAssets (Videos & Audio)
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const userClips = mediaAssets
      .filter((m) => m.type === "VIDEO")
      .map((m) => ({
        id: m.id,
        title: m.name,
        duration: m.duration || 5,
        url: `/api/media/uploads/${m.fileName}`,
        filePath: m.filePath,
        type: "user_upload",
        aspectRatio: m.width && m.height && m.width > m.height ? "16:9" : "9:16",
      }));

    // 2. Fetch AutoClip Candidate Clips
    const autoClips = await prisma.clipCandidate.findMany({
      where: {
        job: { userId: user.id },
      },
      include: {
        job: {
          include: {
            project: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const candidateClips = autoClips.map((c) => ({
      id: c.id,
      title: c.title || (c.job?.project?.title ? `${c.job.project.title} Clip` : "AutoClip Highlight"),
      duration: Math.round(c.duration || c.endTime - c.startTime),
      startTime: c.startTime,
      endTime: c.endTime,
      url: c.filePath ? `/api/media/clips/${path.basename(c.filePath)}` : undefined,
      thumbnailUrl: c.thumbnailPath ? `/api/media/thumbnails/${path.basename(c.thumbnailPath)}` : undefined,
      type: "autoclip",
      aspectRatio: c.aspectRatio === "VERTICAL_9_16" ? "9:16" : "16:9",
    }));

    // 3. Check for any video files in storage/uploads directly
    const uploadsDir = path.resolve("./storage/uploads");
    const rawUploadClips: any[] = [];
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.endsWith(".mp4") && !userClips.some((uc) => uc.url.includes(file))) {
          rawUploadClips.push({
            id: `raw_${file}`,
            title: `Upload: ${file.slice(0, 18)}...`,
            duration: 12,
            url: `/api/media/uploads/${file}`,
            type: "storage_file",
            aspectRatio: "9:16",
          });
        }
      }
    }

    // 4. Fetch Voiceovers
    const voiceovers = await prisma.voiceover.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const userVoiceovers = voiceovers.map((v) => ({
      id: v.id,
      title: v.text ? `${v.text.slice(0, 30)}...` : `Voiceover (${v.voice})`,
      voice: v.voice,
      duration: v.duration || 6,
      url: v.filePath ? `/api/media/audio/${path.basename(v.filePath)}` : undefined,
      filePath: v.filePath,
      status: v.status,
    }));

    // 5. Stock B-roll & Sample Mini Clips (allows instant population of up to 100 clips!)
    const stockMiniClips = [
      { id: "stock_1", title: "Cyberpunk Night Skyline", duration: 3.5, color: "#4f46e5", tag: "Tech" },
      { id: "stock_2", title: "Satisfying Hydraulic Press", duration: 4.0, color: "#0891b2", tag: "Viral" },
      { id: "stock_3", title: "GTA 5 Ramp Stunt", duration: 3.0, color: "#7c3aed", tag: "Gaming" },
      { id: "stock_4", title: "Subway Surfers Dash", duration: 2.8, color: "#d97706", tag: "Viral" },
      { id: "stock_5", title: "Neon Tokyo Rain Walk", duration: 4.2, color: "#dc2626", tag: "Aesthetic" },
      { id: "stock_6", title: "High-Speed Drone Flyover", duration: 3.2, color: "#2563eb", tag: "Cinematic" },
      { id: "stock_7", title: "Sand Kinetic Cutting", duration: 2.5, color: "#059669", tag: "ASMR" },
      { id: "stock_8", title: "Minecraft Parkour Sprint", duration: 3.8, color: "#16a34a", tag: "Gaming" },
      { id: "stock_9", title: "Sunset Mountain Ridge", duration: 4.5, color: "#e11d48", tag: "Nature" },
      { id: "stock_10", title: "Deep Space Nebula Zoom", duration: 5.0, color: "#6366f1", tag: "Space" },
      { id: "stock_11", title: "Retro 80s Synth Grid", duration: 3.5, color: "#c026d3", tag: "Motion" },
      { id: "stock_12", title: "Golden Hour Ocean Wave", duration: 4.0, color: "#0284c7", tag: "Cinematic" },
    ];

    // 6. Built-in Voiceover Audio Samples (Stoic, Motivational, Hook)
    const stockVoiceovers = [
      {
        id: "vo_sample_1",
        title: "Stoic Wisdom Hook",
        voice: "Marcus (Deep)",
        duration: 8.5,
        text: "You cannot control the world, but you can always master yourself.",
      },
      {
        id: "vo_sample_2",
        title: "High-Energy Viral Intro",
        voice: "Adam (Dynamic)",
        duration: 5.2,
        text: "Nobody talks about this secret, but it will change everything you know.",
      },
      {
        id: "vo_sample_3",
        title: "Documentary Revelation",
        voice: "David (Narrator)",
        duration: 7.0,
        text: "In the depth of human history, one single invention altered humanity forever.",
      },
    ];

    // 7. Background Music Tracks
    const musicTracks = [
      { id: "stoic_piano", name: "Stoic Emotional Piano", bpm: "85 BPM", vibe: "Deep & Reflective", url: "/api/media/music/stoic_piano.mp3" },
      { id: "phonk_drift", name: "Aggressive Phonk Drift", bpm: "140 BPM", vibe: "High Energy & Adrenaline", url: "/api/media/music/phonk_drift.mp3" },
      { id: "lofi_chill", name: "Midnight Lo-Fi Chill", bpm: "75 BPM", vibe: "Study & Relaxing", url: "/api/media/music/lofi_chill.mp3" },
      { id: "epic_motivation", name: "Epic Cinematic Motivation", bpm: "110 BPM", vibe: "Triumphant & Powerful", url: "/api/media/music/epic_motivation.mp3" },
      { id: "cyber_ambient", name: "Cyber Ambient Soundscape", bpm: "90 BPM", vibe: "Futuristic & Sci-Fi", url: "/api/media/music/cyber_ambient.mp3" },
    ];

    return NextResponse.json({
      clips: [...candidateClips, ...userClips, ...rawUploadClips],
      stockMiniClips,
      voiceovers: [...userVoiceovers, ...stockVoiceovers],
      musicTracks,
    });
  } catch (err: any) {
    console.error("Editor assets fetch error:", err);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
}
