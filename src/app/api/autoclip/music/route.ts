import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface MusicTrackInfo {
  id: string;
  name: string;
  genre: string;
  mood: string;
  copyrightStatus: string;
  previewUrl: string;
  recommendedVolume: number;
  description: string;
}

export const YOUTUBE_BACKGROUND_TRACKS: MusicTrackInfo[] = [
  {
    id: "none",
    name: "No Music (Voice Only)",
    genre: "Clean Spoken Audio",
    mood: "Pure Voice",
    copyrightStatus: "100% Safe",
    previewUrl: "",
    recommendedVolume: 0,
    description: "Keeps only the original speaker audio. Ideal if you want to attach trending licensed music via the YouTube Shorts mobile app.",
  },
  {
    id: "stoic_piano",
    name: "MDS Stoic Piano & Cello",
    genre: "Cinematic Neo-Classical",
    mood: "Deep Thought & Philosophy",
    copyrightStatus: "YouTube Audio Library Safe (Monetizable)",
    previewUrl: "/api/media/music/stoic_piano.mp3",
    recommendedVolume: 0.18,
    description: "Lush minor-key piano with soft tape saturation, inspired by @mdscae cinematic shorts.",
  },
  {
    id: "phonk_drift",
    name: "Dark Phonk Drift Bass",
    genre: "Memphis Drift Phonk",
    mood: "Aggressive & High Energy",
    copyrightStatus: "YouTube Audio Library Safe (Monetizable)",
    previewUrl: "/api/media/music/phonk_drift.mp3",
    recommendedVolume: 0.15,
    description: "Sub-bass pulse with rhythmic drive for gym, hustle, motivation, and viral shorts.",
  },
  {
    id: "lofi_chill",
    name: "Midnight Lo-Fi Chord Pulse",
    genre: "Lo-Fi Study Beats",
    mood: "Chill & Aesthetic",
    copyrightStatus: "YouTube Audio Library Safe (Monetizable)",
    previewUrl: "/api/media/music/lofi_chill.mp3",
    recommendedVolume: 0.20,
    description: "Warm jazz chords with gentle tape chorus, perfect for educational & conversational clips.",
  },
  {
    id: "epic_motivation",
    name: "Heroic Speech Swell",
    genre: "Orchestral Hybrid",
    mood: "Inspiring & Powerful",
    copyrightStatus: "YouTube Audio Library Safe (Monetizable)",
    previewUrl: "/api/media/music/epic_motivation.mp3",
    recommendedVolume: 0.18,
    description: "Dynamic string crescendo that elevates dramatic speaker revelations and story climaxes.",
  },
  {
    id: "cyber_ambient",
    name: "Cyber Pulse Synthwave",
    genre: "Futuristic Synth",
    mood: "Tech & Atmospheric",
    copyrightStatus: "YouTube Audio Library Safe (Monetizable)",
    previewUrl: "/api/media/music/cyber_ambient.mp3",
    recommendedVolume: 0.18,
    description: "Warm analog synth drone with stereo shimmer for tech, AI, and futuristic podcasts.",
  },
];

export async function GET() {
  return NextResponse.json({
    tracks: YOUTUBE_BACKGROUND_TRACKS,
  });
}
