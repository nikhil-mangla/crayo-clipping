# ClipForge AI - AI Video Creation SaaS Platform

ClipForge AI is a production-oriented AI video creation platform inspired by the workflow of modern creative tools like Crayo.ai. It enables creators to transform long-form videos into viral short-form clips (AutoClip), generate AI scripts, synthesize voiceovers, customize animated captions, and export high-definition 9:16 vertical videos for YouTube Shorts, TikTok, and Instagram Reels.

---

## Key Features

### 🎬 AutoClip Workflow (Long Video to Short Clips)
- **Multi-Source Ingestion**: Direct upload (MP4, MOV, WebM up to 500MB) or import from supported public video URLs with SSRF protection.
- **Audio Extraction**: Automated high-fidelity 16kHz mono audio extraction using FFmpeg.
- **Speech-to-Text Transcription**: 
  - OpenAI Whisper API integration with word- and segment-level timestamps.
  - Isolated fallback energy & speech interval segmenter for offline/local testing.
- **Visual Scene Change Detection**: FFmpeg `scdet` / `select` filter analysis for visual scene boundary synchronization.
- **Virality & Highlight Scoring**: Algorithmic scoring evaluating hook strength, conversational speech pacing (WPM), sentence coherence, and visual cut harmony.
- **Candidate Review & Modification**: Interactive trimming slider, title editing, transcript viewer, and score breakdown.
- **Vertical 9:16 Reframing**: Center crop, Left focus, Right focus, custom horizontal pan slider, or blurred canvas background.
- **Animated Subtitles**: ASS and SRT subtitle generation with presets (Bold Viral, Electric Violet, Minimal Clean, Classic Box).
- **Background Processing**: Redis-backed BullMQ job queue with live stage reporting, progress tracking, and retries.
- **Download & Exports**: Direct range-streaming video preview and authenticated MP4 & SRT downloads.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS, Lucide icons, Zustand.
- **Backend**: Next.js Server Components & Route Handlers, PostgreSQL database with Prisma ORM.
- **Background Jobs**: BullMQ with Redis.
- **Media Engine**: FFmpeg 7 & FFprobe for audio extraction, scene detection, subtitle burning, and vertical 9:16 video transcoding.
- **AI Integrations**: Adapter pattern for Whisper STT, TTS, and LLM providers.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **PostgreSQL**: Local or managed PostgreSQL instance
- **Redis**: Local or managed Redis instance (running on port 6379)
- **FFmpeg & FFprobe**: Installed and available in PATH (or specified in `.env`)

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Key variables in `.env`:
```env
DATABASE_URL="postgresql://user@localhost:5432/clipforge?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# AI Providers (optional)
OPENAI_API_KEY=""

# Media Processing
FFMPEG_PATH="/opt/homebrew/bin/ffmpeg"
FFPROBE_PATH="/opt/homebrew/bin/ffprobe"
```

### 3. Database Migration
```bash
npx prisma db push
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Running the Background Worker
```bash
npm run worker
```

---

## Testing & Verification

### Run Unit Tests
```bash
npm test
```

### Run End-to-End AutoClip Pipeline Verification
Generates an actual 16:9 test video, runs it through audio extraction, transcription, scene detection, highlight scoring, and renders a 1080x1920 vertical 9:16 MP4 with subtitles:
```bash
npm run verify:autoclip
```

---

## License
MIT
