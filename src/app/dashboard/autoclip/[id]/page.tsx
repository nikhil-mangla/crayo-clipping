"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import YouTubeUploadModal from "@/components/youtube/upload-modal";
import { Youtube } from "@/components/ui/youtube-icon";
import {
  ArrowLeft,
  Scissors,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  HelpCircle,
  Film,
  Crop,
  Layers,
  Subtitles,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Palette,
  Smartphone,
  Eye,
  Eraser,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  BookOpen,
  Zap,
  Music,
  Volume2,
  Disc,
} from "lucide-react";

interface ClipCandidate {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  transcript: string;
  score: number;
  scoreBreakdown: {
    hookScore?: number;
    pacingScore?: number;
    coherenceScore?: number;
    sceneScore?: number;
    overallScore?: number;
    explanation?: string;
  } | null;
  aspectRatio: string;
  status: "CANDIDATE" | "RENDERING" | "RENDERED";
  thumbnailPath?: string;
  filePath?: string;
  metadata?: any;
}

interface ProjectData {
  id: string;
  title: string;
  duration: number;
  status: string;
  sourceMediaUrl?: string;
}

interface JobData {
  id: string;
  status: string;
  progress: number;
  stage?: string;
  error?: string;
  output?: any;
}

const VIDEO_FILTER_STYLES: Record<string, { filter: string; label: string; badge: string }> = {
  none: {
    filter: "none",
    label: "✨ Natural / Clean Studio",
    badge: "Original Look",
  },
  teal_orange: {
    filter: "contrast(1.18) saturate(1.3) sepia(0.2) hue-rotate(-12deg)",
    label: "🎬 Hollywood Teal & Orange",
    badge: "Lumetri Look",
  },
  warm_sunset: {
    filter: "sepia(0.3) saturate(1.35) contrast(1.1) brightness(1.03)",
    label: "☀️ Golden Hour",
    badge: "Warm Sun",
  },
  cyberpunk_neon: {
    filter: "contrast(1.28) saturate(1.4) hue-rotate(25deg) brightness(1.02)",
    label: "⚡ Cyberpunk Neon",
    badge: "Cyberpunk HDR",
  },
  vintage_35mm: {
    filter: "sepia(0.24) contrast(1.12) brightness(0.96) saturate(0.92)",
    label: "🎞️ Vintage Kodak 35mm",
    badge: "Kodak 35mm Film",
  },
  viral_oled: {
    filter: "contrast(1.3) saturate(1.45) brightness(1.04)",
    label: "🔥 Viral OLED Pop",
    badge: "OLED Ultra-Pop",
  },
  noir_dramatic: {
    filter: "grayscale(1) contrast(1.38) brightness(0.95)",
    label: "🎩 Dramatic Noir",
    badge: "Monochrome Film",
  },
  mdscae_moody: {
    filter: "contrast(1.24) saturate(0.92) brightness(0.97) sepia(0.08) hue-rotate(-8deg)",
    label: "🌌 MDS CAE Moody Film",
    badge: "MDS CAE Aesthetic",
  },
  mrbeast_hyperpop: {
    filter: "contrast(1.28) saturate(1.52) brightness(1.04) hue-rotate(-2deg)",
    label: "⚡ MrBeast Hyper-Pop",
    badge: "MrBeast Ultra-Vivid",
  },
  anti_claim_shield: {
    filter: "contrast(1.18) saturate(1.22) hue-rotate(8deg) brightness(1.02)",
    label: "🛡️ Anti-Claim Shield",
    badge: "Copyright Shield",
  },
};

const YOUTUBE_BACKGROUND_TRACKS = [
  {
    id: "none",
    name: "Voice Only (No Music)",
    badge: "Clean Speech",
    desc: "Original speaker voice. Ideal if adding trending sound via the YouTube Shorts app.",
    previewUrl: "",
  },
  {
    id: "stoic_piano",
    name: "MDS Stoic Piano & Cello",
    badge: "Philosophy & Mindset",
    desc: "Deep atmospheric minor chords with lush warmth. Inspired by @mdscae.",
    previewUrl: "/api/media/music/stoic_piano.mp3",
  },
  {
    id: "phonk_drift",
    name: "Dark Phonk Drift Bass",
    badge: "Viral Drift Energy",
    desc: "Saturated 808 sub-bass pulse for gym, hustle, motivation & viral loops.",
    previewUrl: "/api/media/music/phonk_drift.mp3",
  },
  {
    id: "lofi_chill",
    name: "Midnight Lo-Fi Beats",
    badge: "Aesthetic Chill",
    desc: "Warm jazz chord progressions with gentle chorus for conversational clips.",
    previewUrl: "/api/media/music/lofi_chill.mp3",
  },
  {
    id: "epic_motivation",
    name: "Heroic Speech Swell",
    badge: "Epic Orchestral",
    desc: "Dynamic string crescendo that elevates revelation & storytelling moments.",
    previewUrl: "/api/media/music/epic_motivation.mp3",
  },
  {
    id: "cyber_ambient",
    name: "Cyber Pulse Synthwave",
    badge: "Tech & Futuristic",
    desc: "Analog detuned bass drone with stereo shimmer for modern tech podcasts.",
    previewUrl: "/api/media/music/cyber_ambient.mp3",
  },
];

export default function AutoClipStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [candidates, setCandidates] = useState<ClipCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ClipCandidate | null>(null);

  // Editor states for active candidate
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(30);
  const [cropMode, setCropMode] = useState<"center" | "left" | "right" | "blur_background" | "custom">("center");
  const [customCropX, setCustomCropX] = useState(50);
  const [captionPreset, setCaptionPreset] = useState<"bold_viral" | "electric_violet" | "minimal_clean" | "classic_dark" | "mdscae_cinema" | "none">("bold_viral");
  const [videoFilter, setVideoFilter] = useState<string>("none");
  const [antiClaimProtection, setAntiClaimProtection] = useState(true);
  const [removeWatermark, setRemoveWatermark] = useState(true);
  const [watermarkZone, setWatermarkZone] = useState<"auto" | "bottom_right" | "top_right" | "top_left" | "bottom_left" | "all">("auto");
  const [watermarkScan, setWatermarkScan] = useState<any | null>(null);
  const [scanningWatermark, setScanningWatermark] = useState(false);
  const [copiedAttribution, setCopiedAttribution] = useState(false);
  const [previewMode, setPreviewMode] = useState<"source" | "rendered">("source");

  // Strict YouTube Copyright & Monetization Audit state
  const [auditReport, setAuditReport] = useState<any | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAuditChecks, setShowAuditChecks] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [copiedDisclaimer, setCopiedDisclaimer] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  // More clips extraction states
  const [moreClipsCount, setMoreClipsCount] = useState<number>(4);
  const [extractingMore, setExtractingMore] = useState<boolean>(false);

  // YouTube Outbound Publishing modal state
  const [youtubeUploadOpen, setYoutubeUploadOpen] = useState(false);

  // YouTube Audio Library & Background Music state
  const [musicTrack, setMusicTrack] = useState<string>("stoic_piano");
  const [musicVolume, setMusicVolume] = useState<number>(18); // 18% ducked under speech
  const [previewPlayingTrack, setPreviewPlayingTrack] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // YouTube Resolution & Quality Codec state (2K forces YouTube VP9/AV01)
  const [exportResolution, setExportResolution] = useState<"1080p" | "2k" | "4k">("2k");

  const toggleAudioPreview = (trackId: string, previewUrl: string) => {
    if (!previewUrl) return;
    if (previewPlayingTrack === trackId) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPreviewPlayingTrack(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(previewUrl);
      audio.volume = Math.max(0.05, Math.min(1, musicVolume / 100));
      audio.play().catch(() => {});
      audio.onended = () => setPreviewPlayingTrack(null);
      audioPreviewRef.current = audio;
      setPreviewPlayingTrack(trackId);
    }
  };

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  // Player controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Render & save states
  const [savingChanges, setSavingChanges] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAuditReport = async (candidateId: string) => {
    try {
      setLoadingAudit(true);
      const res = await fetch(`/api/autoclip/audit/${candidateId}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data.audit);
      }
    } catch (err) {
      console.error("Error fetching audit report:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleScanWatermarks = async (candidateId: string) => {
    try {
      setScanningWatermark(true);
      const res = await fetch(`/api/autoclip/watermark?candidateId=${candidateId}`);
      if (res.ok) {
        const data = await res.json();
        setWatermarkScan(data.scan);
        if (data.scan?.detected) {
          setToastMessage(`⚠️ Watermark detected in ${data.scan.watermarks.map((w: any) => w.zone).join(", ")}. Delogo Removal Active!`);
          setTimeout(() => setToastMessage(null), 4000);
        }
      }
    } catch (err) {
      console.error("Watermark scan error:", err);
    } finally {
      setScanningWatermark(false);
    }
  };

  const applyMdsCaeStyle = () => {
    setCropMode("blur_background");
    setVideoFilter("mdscae_moody");
    setCaptionPreset("mdscae_cinema");
    setAntiClaimProtection(true);
    setRemoveWatermark(true);
    setWatermarkZone("auto");
    setToastMessage("Applied MDS CAE Aesthetic (Blurred Canvas + Moody Grade + Cinema Ivory Subs + Delogo Watermark Shield)!");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyMrBeastStyle = () => {
    setCropMode("center");
    setVideoFilter("mrbeast_hyperpop");
    setCaptionPreset("bold_viral");
    setAntiClaimProtection(true);
    setRemoveWatermark(true);
    setWatermarkZone("auto");
    setToastMessage("Applied MrBeast Style (Hyper-Pop Filter + Bold Viral Yellow Subs + Delogo Shield)!");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchProjectData = async () => {
    try {
      // Find latest job for project
      const projRes = await fetch(`/api/autoclip/projects?t=${Date.now()}`, { cache: "no-store" });
      if (!projRes.ok) return;
      const projData = await projRes.json();
      const p = (projData.projects || []).find((x: any) => x.id === projectId);

      if (p && p.jobId) {
        const jobRes = await fetch(`/api/autoclip/jobs/${p.jobId}?t=${Date.now()}`, { cache: "no-store" });
        if (jobRes.ok) {
          const jd = await jobRes.json();
          setJob(jd.job);
          setProject(jd.project);
          setCandidates(jd.candidates || []);

          if (!selectedCandidate && jd.candidates && jd.candidates.length > 0) {
            selectCandidate(jd.candidates[0]);
          } else if (selectedCandidate) {
            // Update selected candidate state if already selected
            const updated = (jd.candidates || []).find((c: any) => c.id === selectedCandidate.id);
            if (updated) {
              setSelectedCandidate(updated);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching project data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
    const interval = setInterval(() => {
      if (job?.status === "QUEUED" || job?.status === "PROCESSING" || rendering) {
        fetchProjectData();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [projectId, job?.status, rendering]);

  const selectCandidate = (cand: ClipCandidate) => {
    setSelectedCandidate(cand);
    setEditTitle(cand.title);
    setEditStart(cand.startTime);
    setEditEnd(cand.endTime);

    if (cand.metadata?.renderedCropMode || cand.metadata?.preferredCropMode) {
      setCropMode(cand.metadata.renderedCropMode || cand.metadata.preferredCropMode);
    }
    if (cand.metadata?.captionPreset) {
      setCaptionPreset(cand.metadata.captionPreset);
    }
    if (cand.metadata?.videoFilter) {
      setVideoFilter(cand.metadata.videoFilter);
    }
    if (cand.metadata?.removeWatermark !== undefined) {
      setRemoveWatermark(cand.metadata.removeWatermark);
    }
    if (cand.metadata?.watermarkZone) {
      setWatermarkZone(cand.metadata.watermarkZone);
    }

    // Default to rendered preview if already rendered, else source trimming mode
    if (cand.status === "RENDERED" && cand.filePath) {
      setPreviewMode("rendered");
    } else {
      setPreviewMode("source");
    }

    if (videoRef.current) {
      videoRef.current.currentTime = cand.startTime;
      setCurrentTime(cand.startTime);
    }

    fetchAuditReport(cand.id);
    handleScanWatermarks(cand.id);
  };

  // Video time tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (previewMode === "source") {
      // Loop within candidate window
      if (cur >= editEnd) {
        videoRef.current.currentTime = editStart;
        videoRef.current.play().catch(() => {});
      }
    } else if (previewMode === "rendered") {
      // Loop rendered clip
      if (videoRef.current.duration && cur >= videoRef.current.duration) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (previewMode === "source") {
        if (videoRef.current.currentTime < editStart || videoRef.current.currentTime >= editEnd) {
          videoRef.current.currentTime = editStart;
        }
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedCandidate) return;
    setSavingChanges(true);

    try {
      const res = await fetch(`/api/autoclip/candidates/${selectedCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          startTime: editStart,
          endTime: editEnd,
          metadata: {
            preferredCropMode: cropMode,
            customCropXPercent: customCropX,
            captionPreset,
            videoFilter,
            removeWatermark,
            watermarkZone,
          },
        }),
      });

      if (res.ok) {
        setToastMessage("Candidate boundaries and title saved!");
        setTimeout(() => setToastMessage(null), 3000);
        fetchProjectData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleExtractMoreClips = async () => {
    setExtractingMore(true);
    try {
      const res = await fetch(`/api/autoclip/projects/${projectId}/more-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: moreClipsCount }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.message || `Extracted ${data.added} more clips!`);
        setTimeout(() => setToastMessage(null), 4000);
        await fetchProjectData();
      } else {
        setToastMessage(data.error || "Failed to extract more clips");
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      setToastMessage(err.message || "Failed to extract clips");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setExtractingMore(false);
    }
  };

  const handleStartRender = async () => {
    if (!selectedCandidate) return;
    setRendering(true);

    try {
      const res = await fetch("/api/autoclip/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          cropMode,
          customCropXPercent: customCropX,
          captionPreset,
          quality: exportResolution === "4k" ? "cinema_4k" : exportResolution === "2k" ? "ultra_2k" : "high",
          resolution: exportResolution,
          videoFilter,
          antiClaimProtection,
          removeWatermark,
          watermarkZone,
          musicTrack,
          musicVolume: musicVolume / 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to render clip");

      setRenderJobId(data.renderJobId);
      setToastMessage("Rendering vertical 9:16 clip with subtitles...");
      setTimeout(() => setToastMessage(null), 4000);

      // Poll until done
      const pollTimer = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/autoclip/jobs/${data.renderJobId}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            setRenderProgress(checkData.job.progress || 0);

            if (checkData.job.status === "COMPLETED") {
              clearInterval(pollTimer);
              setRendering(false);
              setToastMessage("Clip rendered successfully with Adobe Pro filter & subtitles! Now playing 9:16 vertical short.");
              setPreviewMode("rendered");
              setTimeout(() => setToastMessage(null), 5000);
              fetchProjectData();
              if (selectedCandidate) {
                fetchAuditReport(selectedCandidate.id);
              }
            } else if (checkData.job.status === "FAILED") {
              clearInterval(pollTimer);
              setRendering(false);
              alert("Render failed: " + (checkData.job.error || "Unknown error"));
            }
          }
        } catch {
          // continue
        }
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Render failed");
      setRendering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-neutral-400 text-sm">Loading AutoClip Studio...</p>
      </div>
    );
  }

  const isJobProcessing = job?.status === "QUEUED" || job?.status === "PROCESSING";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-violet-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-violet-400/30 animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/autoclip"
            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Scissors className="h-5 w-5 text-violet-400" />
              {project?.title || "AutoClip Project"}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Source Duration: {project?.duration ? `${Math.floor(project.duration / 60)}m ${Math.floor(project.duration % 60)}s` : "Calculating..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              job?.status === "COMPLETED"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isJobProcessing
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {isJobProcessing ? "Processing AutoClip Pipeline..." : job?.status || "Ready"}
          </span>

          <button
            onClick={fetchProjectData}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg text-xs transition"
            title="Refresh"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live Processing Banner */}
      {isJobProcessing && (
        <div className="bg-gradient-to-r from-violet-950/40 via-neutral-900 to-violet-950/40 border border-violet-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              <div>
                <h3 className="font-semibold text-white text-base">
                  Analyzing Video & Generating Highlights
                </h3>
                <p className="text-xs text-violet-300 mt-0.5">
                  {job?.stage || "Running speech analysis and scene detection..."}
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-violet-400">{job?.progress || 10}%</span>
          </div>

          <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-violet-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${job?.progress || 10}%` }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
            <div className={job?.progress && job.progress >= 20 ? "text-violet-300" : ""}>
              1. Audio Extraction ✓
            </div>
            <div className={job?.progress && job.progress >= 40 ? "text-violet-300" : ""}>
              2. Speech Transcription ✓
            </div>
            <div className={job?.progress && job.progress >= 60 ? "text-violet-300" : ""}>
              3. Scene Detection ✓
            </div>
            <div className={job?.progress && job.progress >= 80 ? "text-violet-300" : ""}>
              4. Highlight Scoring ✓
            </div>
          </div>
        </div>
      )}

      {/* Disclaimers & Info */}
      {job?.status === "COMPLETED" && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0" />
            <span>
              <strong>Algorithmic Highlights:</strong> Ranked by hook velocity, sentence coherence, and speech energy. Scores are estimates, not guaranteed virality.
            </span>
          </div>
          {job.output?.transcriptionProvider && (
            <span className="bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
              Engine: {job.output.transcriptionProvider}
            </span>
          )}
        </div>
      )}

      {/* Main Studio Workspace */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Video Player & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Video Player Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* View Mode Toggle Header when Rendered */}
            {selectedCandidate?.status === "RENDERED" && selectedCandidate?.filePath && (
              <div className="p-2.5 px-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400">9:16 Vertical Video Ready</span>
                </div>
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode("rendered");
                      setIsPlaying(false);
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        setCurrentTime(0);
                      }
                    }}
                    className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                      previewMode === "rendered"
                        ? "bg-violet-600 text-white shadow"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    9:16 Rendered Clip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode("source");
                      setIsPlaying(false);
                      if (videoRef.current) {
                        videoRef.current.currentTime = editStart;
                        setCurrentTime(editStart);
                      }
                    }}
                    className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                      previewMode === "source"
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Crop className="h-3.5 w-3.5" />
                    Crop &amp; Trim Editor
                  </button>
                </div>
              </div>
            )}

            {/* Player Container */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {previewMode === "rendered" && selectedCandidate?.filePath ? (
                <div className="h-full flex items-center justify-center bg-neutral-950 py-1">
                  <video
                    ref={videoRef}
                    key={selectedCandidate.filePath}
                    src={selectedCandidate.filePath}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="h-full max-h-[460px] aspect-[9/16] object-contain rounded-lg shadow-2xl border border-neutral-800"
                    playsInline
                  />
                  <div className="absolute bottom-3 left-3 bg-neutral-950/85 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md">
                    <Check className="h-3 w-3" />
                    Burned-in Subtitles &amp; Adobe Filter Active
                  </div>
                </div>
              ) : project?.sourceMediaUrl ? (
                <>
                  <video
                    ref={videoRef}
                    key={project.sourceMediaUrl}
                    src={project.sourceMediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-contain transition-all duration-300"
                    style={{
                      filter: VIDEO_FILTER_STYLES[videoFilter]?.filter || "none",
                    }}
                    playsInline
                  />

                  {/* Live Adobe Pro Filter Indicator Badge */}
                  {videoFilter !== "none" && (
                    <div
                      className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur-md text-[11px] font-semibold transition-all shadow-lg z-10 pointer-events-none"
                      style={{
                        backgroundColor: "rgba(10, 10, 10, 0.85)",
                        borderColor: "rgba(168, 85, 247, 0.5)",
                        color: "#e9d5ff",
                      }}
                    >
                      <Palette className="h-3.5 w-3.5 text-violet-400" />
                      <span>Live Filter: {VIDEO_FILTER_STYLES[videoFilter]?.label}</span>
                    </div>
                  )}

                  {/* 9:16 Crop Boundary Overlay Guide */}
                  <div
                    className="absolute inset-y-0 border-2 border-violet-500/60 pointer-events-none bg-violet-500/5 transition-all"
                    style={{
                      width: `${(9 / 16) * (16 / 9) * 100 * (9 / 16)}%`,
                      left:
                        cropMode === "left"
                          ? "0%"
                          : cropMode === "right"
                          ? `calc(100% - ${(9 / 16) * (16 / 9) * 100 * (9 / 16)}%)`
                          : cropMode === "custom"
                          ? `${(customCropX / 100) * (100 - (9 / 16) * (16 / 9) * 100 * (9 / 16))}%`
                          : "50%",
                      transform: cropMode === "center" ? "translateX(-50%)" : "none",
                    }}
                  >
                    <div className="absolute top-2 left-2 text-[10px] bg-violet-600/80 text-white px-1.5 py-0.5 rounded font-mono">
                      9:16 Reframe Area
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-neutral-500 text-xs flex flex-col items-center gap-2">
                  <Film className="h-8 w-8" />
                  <span>Video preview unavailable</span>
                </div>
              )}
            </div>

            {/* Video Controls Toolbar */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="h-9 w-9 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center justify-center transition shadow"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      const target = previewMode === "rendered" ? 0 : editStart;
                      videoRef.current.currentTime = target;
                      setCurrentTime(target);
                    }
                  }}
                  className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
                  title={previewMode === "rendered" ? "Rewind to start" : "Rewind to clip start"}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs font-mono text-neutral-400">
                <span className="text-white font-bold">{currentTime.toFixed(1)}s</span> /{" "}
                {previewMode === "rendered"
                  ? `${(selectedCandidate?.duration || 0).toFixed(1)}s`
                  : project?.duration
                  ? `${project.duration}s`
                  : "0s"}
              </div>

              <div className="text-xs bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-300">
                {previewMode === "rendered" ? (
                  <>
                    Vertical Short:{" "}
                    <strong className="text-emerald-400 font-mono">
                      {(selectedCandidate?.duration || 0).toFixed(1)}s
                    </strong>
                  </>
                ) : (
                  <>
                    Duration:{" "}
                    <strong className="text-violet-400 font-mono">
                      {(editEnd - editStart).toFixed(1)}s
                    </strong>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Clip Boundaries Trimmer */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-violet-400" />
                Fine-Tune Boundary Range
              </h3>
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={savingChanges}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                {savingChanges ? "Saving..." : "Save Range"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Start Time (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={editEnd - 1}
                  value={editStart}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    setEditStart(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">End Time (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  min={editStart + 1}
                  max={project?.duration || 3600}
                  value={editEnd}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || editStart + 1;
                    setEditEnd(val);
                  }}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Suggested Social Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Give this clip an eye-catching title..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Transcript Snippet */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1 flex items-center justify-between">
                <span>Transcript Highlight</span>
                <span className="text-[11px] text-neutral-500">Synced Speech</span>
              </label>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 leading-relaxed max-h-28 overflow-y-auto">
                &ldquo;{selectedCandidate?.transcript || "No transcript available for this segment"}&rdquo;
              </div>
            </div>
          </div>
        </div>

        {/* Right: Reframing & Render Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Highlight Score Card */}
          {selectedCandidate && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Highlight Virality Analysis
                </span>
                <button
                  type="button"
                  onClick={() => setShowScoreModal(!showScoreModal)}
                  className="text-neutral-400 hover:text-white"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-xl border ${
                    selectedCandidate.score >= 85
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : selectedCandidate.score >= 70
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-neutral-800 text-neutral-300 border-neutral-700"
                  }`}
                >
                  {selectedCandidate.score}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {selectedCandidate.score >= 85
                      ? "High Engagement Potential"
                      : selectedCandidate.score >= 70
                      ? "Strong Storytelling Hook"
                      : "Standard Highlight"}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                    {selectedCandidate.scoreBreakdown?.explanation || "Algorithmic score based on speech hook and boundary harmony."}
                  </p>
                </div>
              </div>

              {/* Subscores Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800 text-xs">
                <div className="bg-neutral-950/80 p-2 rounded-lg">
                  <span className="text-neutral-500 text-[10px] block">Hook Strength</span>
                  <span className="font-semibold text-white">
                    {selectedCandidate.scoreBreakdown?.hookScore || 75}%
                  </span>
                </div>
                <div className="bg-neutral-950/80 p-2 rounded-lg">
                  <span className="text-neutral-500 text-[10px] block">Speech Pacing</span>
                  <span className="font-semibold text-white">
                    {selectedCandidate.scoreBreakdown?.pacingScore || 80}%
                  </span>
                </div>
                <div className="bg-neutral-950/80 p-2 rounded-lg">
                  <span className="text-neutral-500 text-[10px] block">Coherence</span>
                  <span className="font-semibold text-white">
                    {selectedCandidate.scoreBreakdown?.coherenceScore || 85}%
                  </span>
                </div>
                <div className="bg-neutral-950/80 p-2 rounded-lg">
                  <span className="text-neutral-500 text-[10px] block">Scene Cuts</span>
                  <span className="font-semibold text-white">
                    {selectedCandidate.scoreBreakdown?.sceneScore || 70}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 1-Click Viral Style Presets Card (MDS CAE & MrBeast Clips) */}
          <div className="bg-gradient-to-r from-violet-950/40 via-neutral-900 to-amber-950/30 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                1-Click Viral Creator Presets
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded-full font-mono">
                Shorts Formulas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* MrBeast Clips Preset */}
              <button
                type="button"
                onClick={applyMrBeastStyle}
                className="p-3 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 hover:border-amber-400 rounded-xl transition text-left space-y-1 group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 group-hover:text-amber-200">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    MrBeast Clips Style
                  </span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                    @MrBeastClips
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  152% Hyper-Pop Vivid Color + Bold Yellow Stroke Subs + Sharp Edge Punch
                </p>
              </button>

              {/* MDS CAE Cinema Preset */}
              <button
                type="button"
                onClick={applyMdsCaeStyle}
                className="p-3 bg-violet-950/30 hover:bg-violet-900/40 border border-violet-500/40 hover:border-violet-400 rounded-xl transition text-left space-y-1 group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5 group-hover:text-violet-200">
                    <Sliders className="h-3.5 w-3.5 text-violet-400" />
                    MDS CAE Cinema Style
                  </span>
                  <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded font-mono">
                    @mdscae
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Blurred 9:16 Canvas + Deep Blacks Moody Film + Ivory Cinema Subtitles
                </p>
              </button>
            </div>
          </div>

          {/* Reframing & Crop Mode Options */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Crop className="h-4 w-4 text-violet-400" />
              Vertical 9:16 Reframing
            </h3>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: "center", label: "Center Crop" },
                { id: "left", label: "Left Focus" },
                { id: "right", label: "Right Focus" },
                { id: "blur_background", label: "Blurred Canvas (MDS CAE)" },
                { id: "custom", label: "Custom Pan" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCropMode(m.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition font-medium ${
                    cropMode === m.id
                      ? "bg-violet-600/15 border-violet-500 text-violet-300"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {cropMode === "custom" && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>Horizontal Pan Position</span>
                  <span>{customCropX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customCropX}
                  onChange={(e) => setCustomCropX(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            )}

            {/* Captions Styling Preset */}
            <div className="pt-3 border-t border-neutral-800">
              <label className="block text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                <Subtitles className="h-3.5 w-3.5 text-violet-400" />
                Animated Subtitles Style
              </label>

              <select
                value={captionPreset}
                onChange={(e) => setCaptionPreset(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs font-medium"
              >
                <option value="mdscae_cinema">🌌 MDS CAE Cinema (Ivory Pearl, Charcoal Outline, Lower-Center)</option>
                <option value="bold_viral">🔥 Bold Viral (Yellow &amp; White, Stroke)</option>
                <option value="electric_violet">⚡ Electric Violet (Brand Neon)</option>
                <option value="minimal_clean">✨ Minimal Clean (White Sans-Serif)</option>
                <option value="classic_dark">⬛ Classic Box (Translucent Pill)</option>
                <option value="none">🚫 No Subtitles (Clean Video)</option>
              </select>
            </div>

            {/* Adobe Premiere Pro Style Visual Filters */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-violet-400" />
                  Adobe Pro Video Filter (Color Grading)
                </label>
                <span className="text-[10px] bg-violet-950/60 text-violet-300 border border-violet-800/40 px-1.5 py-0.5 rounded font-mono">
                  Fair Use Transform
                </span>
              </div>

              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="none">✨ Natural / Clean Studio (Original Colors)</option>
                <option value="mrbeast_hyperpop">⚡ MrBeast Hyper-Pop (Ultra-Vivid, High Contrast, Razor Sharp)</option>
                <option value="mdscae_moody">🌌 MDS CAE Moody Film (Atmospheric Cinema, Deep Blacks)</option>
                <option value="teal_orange">🎬 Hollywood Teal &amp; Orange (Lumetri Cinematic)</option>
                <option value="warm_sunset">☀️ Golden Hour (Warm Sunset Glow)</option>
                <option value="cyberpunk_neon">⚡ Cyberpunk Neon (Electric Blue &amp; Magenta)</option>
                <option value="vintage_35mm">🎞️ Vintage Kodak 35mm (Film Grain &amp; Lifted Blacks)</option>
                <option value="viral_oled">🔥 Viral OLED Pop (High Contrast &amp; Razor Sharp)</option>
                <option value="noir_dramatic">🎩 Dramatic Noir (High Contrast Monochrome)</option>
                <option value="anti_claim_shield">🛡️ Anti-Claim Shield (Max Fingerprint Protection)</option>
              </select>

              <p className="text-[11px] text-neutral-400 leading-normal">
                {videoFilter === "mrbeast_hyperpop" && "Signature @MrBeastClips formula: 152% hyper-saturation, boosted contrast (1.28x), lifted brightness (+0.03), and razor-sharp edge clarity engineered to pop off mobile screens and stop scrollers."}
                {videoFilter === "mdscae_moody" && "Signature @mdscae look: deep blacks, muted tones (92% saturation), cool shadow/warm highlight split, and unsharp edge convolution mask."}
                {videoFilter === "teal_orange" && "Hollywood Lumetri LUT: rich teal shadows and warm skin tone highlights for a high-end cinematic feel."}
                {videoFilter === "warm_sunset" && "Warm amber California glow with enhanced saturation and soft contrast."}
                {videoFilter === "cyberpunk_neon" && "High-contrast dynamic range with vivid magenta and neon cyan punch."}
                {videoFilter === "vintage_35mm" && "Kodak Portra curve with organic procedural film grain texture for an analog vintage aesthetic."}
                {videoFilter === "viral_oled" && "Punchy, high-contrast, razor-sharp colors optimized for mobile OLED screens on TikTok & Reels."}
                {videoFilter === "noir_dramatic" && "High-contrast black & white with deep blacks and silver highlights."}
                {videoFilter === "anti_claim_shield" && "Multi-layer shield: dynamic color curves, micro-zoom, fine grain, and vignette to bypass Content ID."}
                {videoFilter === "none" && "Maintains original video color grade with crisp Lanczos upscaling."}
              </p>
            </div>

            {/* Anti-Claim & Copyright Transformation Mode */}
            <div className="pt-3 border-t border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Anti-Claim Protection Mode
                </label>
                <input
                  type="checkbox"
                  checked={antiClaimProtection}
                  onChange={(e) => setAntiClaimProtection(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600 bg-neutral-950 border-neutral-700 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Applies acoustic tempo micro-shift (+2.5%) and subtle color grading to modify automated Content ID hash fingerprints while maintaining crisp speech.
              </p>
            </div>

            {/* Watermark Detection & Delogo Removal Shield */}
            <div className="pt-3 border-t border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                  <Eraser className="h-4 w-4 text-cyan-400" />
                  Remove Creator Watermark &amp; Logo (Delogo)
                </label>
                <input
                  type="checkbox"
                  checked={removeWatermark}
                  onChange={(e) => setRemoveWatermark(e.target.checked)}
                  className="h-4 w-4 rounded accent-cyan-500 bg-neutral-950 border-neutral-700 cursor-pointer"
                />
              </div>

              {removeWatermark && (
                <div className="space-y-2 pl-1 animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={watermarkZone}
                      onChange={(e) => setWatermarkZone(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="auto">🎯 Auto-Detect &amp; Remove (Recommended)</option>
                      <option value="bottom_right">↘️ Bottom-Right (YouTube Channel Watermark)</option>
                      <option value="top_left">↖️ Top-Left (TikTok Handle / Username)</option>
                      <option value="top_right">↗️ Top-Right (Podcast / TV Bug)</option>
                      <option value="bottom_left">↙️ Bottom-Left (Interview Sub-Bug)</option>
                      <option value="all">🌐 All 4 Corners (Maximum Cleanse)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => selectedCandidate && handleScanWatermarks(selectedCandidate.id)}
                      disabled={scanningWatermark || !selectedCandidate}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[11px] font-medium transition flex items-center gap-1 whitespace-nowrap"
                      title="Scan candidate video for static logos"
                    >
                      {scanningWatermark ? (
                        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                      ) : (
                        <Eye className="h-3 w-3 text-cyan-400" />
                      )}
                      <span>Scan</span>
                    </button>
                  </div>

                  {/* Watermark Scan Status Alert */}
                  {watermarkScan && (
                    <div
                      className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 ${
                        watermarkScan.detected
                          ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                          : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      {watermarkScan.detected ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <span className="font-semibold block">
                          {watermarkScan.detected
                            ? `Creator Watermark Detected (${watermarkScan.watermarks.map((w: any) => w.zone).join(", ")})`
                            : "Clean: No Persistent Corner Watermark Found"}
                        </span>
                        <span className="text-[10px] opacity-90 block leading-tight">
                          {watermarkScan.detected
                            ? "Delogo edge interpolation will smoothly erase and blend over the watermark during rendering."
                            : "Frame corners are clean. Delogo shield will ensure border cleanliness."}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-neutral-400 leading-normal">
                    Interpolates surrounding pixel values to cleanly erase channel watermarks, logos, and handles, preventing unoriginal reused content flags.
                  </p>
                </div>
              )}
            </div>

            {/* YouTube Background Music & Audio Mixing Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Music className="h-4 w-4 text-rose-400" />
                  YouTube Background Music &amp; Audio Mixing
                </span>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-medium">
                  100% Monetization Safe
                </span>
              </div>

              {/* Music Track Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {YOUTUBE_BACKGROUND_TRACKS.map((t) => {
                  const isSelected = musicTrack === t.id;
                  const isPlaying = previewPlayingTrack === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setMusicTrack(t.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? "bg-rose-950/25 border-rose-500/50 ring-1 ring-rose-500/30 text-white shadow"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold text-xs block truncate">{t.name}</span>
                          <span className="text-[10px] text-rose-300/80 block">{t.badge}</span>
                        </div>

                        {t.previewUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAudioPreview(t.id, t.previewUrl);
                            }}
                            className={`p-1.5 rounded-lg text-xs transition flex-shrink-0 ${
                              isPlaying
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                            }`}
                            title={isPlaying ? "Pause Preview" : "Play Preview"}
                          >
                            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-400 line-clamp-2 leading-tight">
                        {t.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Music Volume & Ducking Slider (if music is enabled) */}
              {musicTrack !== "none" && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 pt-2.5 animate-fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-rose-400" />
                      Music Volume Ducking: <strong className="text-white font-mono">{musicVolume}%</strong>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Voice Boosted + Ducked Bed
                    </span>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>5% Subtle Whisper</span>
                    <span>18% Recommended Balance</span>
                    <span>50% Upfront Beat</span>
                  </div>
                </div>
              )}
            </div>

            {/* YouTube Shorts Quality & VP9 Codec Optimization Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Film className="h-4 w-4 text-cyan-400" />
                  YouTube Video Quality &amp; Codec Mastering
                </span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-medium">
                  VP9 Ultra-HD
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 2K QHD */}
                <button
                  type="button"
                  onClick={() => setExportResolution("2k")}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    exportResolution === "2k"
                      ? "bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30 text-white shadow-lg"
                      : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">2K Ultra QHD</span>
                    <span className="text-[9px] bg-cyan-500/15 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                      ⭐ Best for Shorts
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 block font-mono">1440x2560 • 24 Mbps</span>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Forces YouTube to assign high-bitrate <strong>VP9 / AV01</strong> codec with zero blurriness.
                  </p>
                </button>

                {/* 1080p */}
                <button
                  type="button"
                  onClick={() => setExportResolution("1080p")}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    exportResolution === "1080p"
                      ? "bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30 text-white shadow-lg"
                      : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">1080p Crisp HD</span>
                    <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                      Fast
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block font-mono">1080x1920 • 16 Mbps</span>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Standard high-definition export. Faster render time on smaller devices.
                  </p>
                </button>

                {/* 4K Cinema */}
                <button
                  type="button"
                  onClick={() => setExportResolution("4k")}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    exportResolution === "4k"
                      ? "bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30 text-white shadow-lg"
                      : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">4K Master Cinema</span>
                    <span className="text-[9px] bg-neutral-800 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                      Master
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block font-mono">2160x3840 • 35 Mbps</span>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Ultimate visual fidelity for large 4K displays and archival publishing.
                  </p>
                </button>
              </div>

              <div className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded-xl flex items-start gap-2 text-[10px] text-neutral-400">
                <Info className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Why 2K Ultra?</strong> YouTube automatically re-compresses standard 1080p clips using its low-tier <code className="text-neutral-300">avc1</code> codec. Rendering at <strong>2K QHD (1440x2560)</strong> forces YouTube to transcode with its premium <strong className="text-cyan-300">VP9 / AV01</strong> codec at 4x bitrate, eliminating compression banding!
                </span>
              </div>
            </div>

            {/* Render Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartRender}
                disabled={rendering || !selectedCandidate}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs md:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
              >
                {rendering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rendering Vertical 9:16 ({renderProgress}%)...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Render Vertical 9:16 MP4
                  </>
                )}
              </button>
            </div>

            {/* Downloads & Publishing if already rendered */}
            {selectedCandidate?.status === "RENDERED" && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Vertical 9:16 Video Ready!</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Ready to Publish
                  </span>
                </div>

                {/* Direct YouTube Publish CTA */}
                <button
                  type="button"
                  onClick={() => setYoutubeUploadOpen(true)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-950/50 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Youtube className="h-4 w-4" />
                  <span>Publish Directly to YouTube</span>
                </button>

                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedCandidate.metadata?.exportId && (
                    <a
                      href={`/api/autoclip/download/${selectedCandidate.metadata.exportId}`}
                      download
                      className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download 9:16 MP4
                    </a>
                  )}

                  <a
                    href={`/api/autoclip/subtitles/${selectedCandidate.id}`}
                    download
                    className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5 transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Download .SRT
                  </a>
                </div>

                {selectedCandidate.filePath && (
                  <a
                    href={selectedCandidate.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center justify-center gap-1"
                  >
                    Watch rendered clip in full resolution <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Strict YouTube Monetization & Copyright Audit Card */}
            {selectedCandidate && (
              <div className="mt-4 bg-neutral-950/90 border border-neutral-800 rounded-2xl p-4.5 space-y-4 shadow-xl">
                {/* Audit Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        Strict YouTube Copyright &amp; Monetization Audit
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        Content ID &amp; YPP Reused Content Compliance
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchAuditReport(selectedCandidate.id)}
                    disabled={loadingAudit}
                    className="text-[11px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                    title="Re-run audit checks"
                  >
                    {loadingAudit ? (
                      <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                    ) : (
                      <RotateCcw className="h-3 w-3 text-neutral-400" />
                    )}
                    <span>Audit</span>
                  </button>
                </div>

                {/* Score & Verdict Banner */}
                {auditReport ? (
                  <div className="space-y-3">
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                              auditReport.status === "VERIFIED_SAFE"
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                : auditReport.status === "MODERATE_RISK"
                                ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                                : "bg-rose-950/80 text-rose-300 border-rose-500/40"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                auditReport.status === "VERIFIED_SAFE"
                                  ? "bg-emerald-400 animate-pulse"
                                  : auditReport.status === "MODERATE_RISK"
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                              }`}
                            />
                            {auditReport.statusLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          {auditReport.status === "VERIFIED_SAFE"
                            ? "All critical Content ID & YPP Fair Use criteria passed. Safe for channel monetization."
                            : auditReport.status === "MODERATE_RISK"
                            ? "Passes basic criteria, but applying MDS CAE Moody grade or subtitles is recommended."
                            : "At risk of automated Content ID match or Reused Content rejection."}
                        </p>
                      </div>

                      {/* Circular or pill score indicator */}
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xl font-black font-mono text-emerald-400">
                          {auditReport.overallScore}
                          <span className="text-xs text-neutral-500 font-normal">/100</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">Safety Score</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          auditReport.overallScore >= 85
                            ? "bg-emerald-500"
                            : auditReport.overallScore >= 70
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${auditReport.overallScore}%` }}
                      />
                    </div>

                    {/* 6 Checks Checklist Toggle */}
                    <div className="border border-neutral-800/80 rounded-xl overflow-hidden bg-neutral-900/50">
                      <button
                        type="button"
                        onClick={() => setShowAuditChecks(!showAuditChecks)}
                        className="w-full p-2.5 px-3 flex items-center justify-between text-xs font-semibold text-neutral-300 hover:text-white transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          View 6-Point Compliance Audit Breakdown
                        </span>
                        {showAuditChecks ? (
                          <ChevronUp className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        )}
                      </button>

                      {showAuditChecks && (
                        <div className="p-3 pt-1 space-y-2.5 border-t border-neutral-800 text-xs">
                          {auditReport.checks?.map((check: any) => (
                            <div
                              key={check.id}
                              className="p-2 rounded-lg bg-neutral-950/80 border border-neutral-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                                  {check.passed ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                                  )}
                                  {check.title}
                                </span>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                    check.passed
                                      ? "text-emerald-400 bg-emerald-950/60"
                                      : "text-amber-400 bg-amber-950/60"
                                  }`}
                                >
                                  {check.score}/{check.maxScore} pts
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-400 leading-normal pl-5">
                                {check.description}
                              </p>
                              {check.recommendation && (
                                <p className="text-[10px] text-amber-300/90 leading-normal pl-5 italic">
                                  Tip: {check.recommendation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 1-Click Upload Package Buttons */}
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                        <Copy className="h-3.5 w-3.5 text-violet-400" />
                        One-Click YouTube Upload Assets
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (!auditReport?.fairUsePackage?.disclaimerText) return;
                            navigator.clipboard.writeText(auditReport.fairUsePackage.disclaimerText);
                            setCopiedDisclaimer(true);
                            setTimeout(() => setCopiedDisclaimer(false), 2500);
                          }}
                          className="p-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-lg text-neutral-300 hover:text-white transition flex items-center justify-center gap-1.5 text-[11px]"
                        >
                          {copiedDisclaimer ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-neutral-400" />
                          )}
                          <span>{copiedDisclaimer ? "Copied!" : "Fair Use Description"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!auditReport?.fairUsePackage?.suggestedTitle) return;
                            navigator.clipboard.writeText(auditReport.fairUsePackage.suggestedTitle);
                            setCopiedTitle(true);
                            setTimeout(() => setCopiedTitle(false), 2500);
                          }}
                          className="p-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-lg text-neutral-300 hover:text-white transition flex items-center justify-center gap-1.5 text-[11px]"
                        >
                          {copiedTitle ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-neutral-400" />
                          )}
                          <span>{copiedTitle ? "Copied!" : "Optimized Title"}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!auditReport?.fairUsePackage?.tags) return;
                          navigator.clipboard.writeText(auditReport.fairUsePackage.tags.join(" "));
                          setCopiedTags(true);
                          setTimeout(() => setCopiedTags(false), 2500);
                        }}
                        className="w-full p-1.5 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition flex items-center justify-center gap-1.5 text-[10px]"
                      >
                        {copiedTags ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-neutral-400" />
                        )}
                        <span>{copiedTags ? "Tags Copied!" : "Copy Recommended Viral Hashtags"}</span>
                      </button>
                    </div>

                    {/* YouTube Creator Upload Playbook Accordion */}
                    <div className="border border-violet-900/30 rounded-xl overflow-hidden bg-violet-950/15">
                      <button
                        type="button"
                        onClick={() => setShowUploadGuide(!showUploadGuide)}
                        className="w-full p-2.5 px-3 flex items-center justify-between text-xs font-semibold text-violet-300 hover:text-violet-200 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-violet-400" />
                          YouTube Upload Playbook (Guaranteed Ad Monetization)
                        </span>
                        {showUploadGuide ? (
                          <ChevronUp className="h-4 w-4 text-violet-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-violet-400" />
                        )}
                      </button>

                      {showUploadGuide && (
                        <div className="p-3 pt-1 space-y-2 border-t border-violet-900/20 text-xs">
                          {auditReport.fairUsePackage?.youtubeUploadGuide?.map((item: any) => (
                            <div key={item.step} className="space-y-0.5">
                              <span className="font-semibold text-white text-[11px] block">
                                {item.step}. {item.title}
                              </span>
                              <p className="text-[10px] text-neutral-300 leading-relaxed pl-3">
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-neutral-400">
                      Audit report analyzing candidate settings...
                    </p>
                    <button
                      type="button"
                      onClick={() => fetchAuditReport(selectedCandidate.id)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition"
                    >
                      Run Monetization Audit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Clips Selector Carousel / Gallery */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" />
              Candidate Highlights ({candidates.length})
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select any clip to preview in 9:16 vertical, fine-tune timing, and apply Adobe Pro filters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
              <span className="text-[11px] text-neutral-400 pl-2 font-medium">Extract</span>
              <select
                value={moreClipsCount}
                onChange={(e) => setMoreClipsCount(Number(e.target.value))}
                className="bg-transparent text-white text-xs py-1 px-1.5 focus:outline-none"
              >
                <option value={4} className="bg-neutral-900">+4 More Clips</option>
                <option value={6} className="bg-neutral-900">+6 More Clips</option>
                <option value={8} className="bg-neutral-900">+8 More Clips</option>
                <option value={12} className="bg-neutral-900">+12 More Clips</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExtractMoreClips}
              disabled={extractingMore || isJobProcessing}
              className="py-1.5 px-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              {extractingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate More Clips
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {candidates.map((cand, idx) => {
            const isSelected = selectedCandidate?.id === cand.id;
            return (
              <div
                key={cand.id}
                onClick={() => selectCandidate(cand)}
                className={`group bg-neutral-900 border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-violet-500 ring-2 ring-violet-500/20 bg-neutral-900/90 shadow-xl"
                    : "border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50"
                }`}
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-neutral-950 rounded-xl overflow-hidden mb-3 border border-neutral-800">
                    {cand.thumbnailPath ? (
                      <img
                        src={cand.thumbnailPath}
                        alt={cand.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Film className="h-6 w-6" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 bg-neutral-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300">
                      #{idx + 1}
                    </div>

                    <div
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${
                        cand.score >= 85
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                          : cand.score >= 70
                          ? "bg-amber-950/80 text-amber-400 border-amber-500/40"
                          : "bg-neutral-950/80 text-neutral-300 border-neutral-700"
                      }`}
                    >
                      {cand.score} pts
                    </div>

                    <div className="absolute bottom-2 right-2 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                      {cand.duration.toFixed(1)}s
                    </div>
                  </div>

                  <h4 className="font-semibold text-white text-xs line-clamp-1 mb-1" title={cand.title}>
                    {cand.title}
                  </h4>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    &ldquo;{cand.transcript}&rdquo;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 font-mono">
                    {cand.startTime.toFixed(1)}s - {cand.endTime.toFixed(1)}s
                  </span>

                  {cand.status === "RENDERED" ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Rendered
                    </span>
                  ) : cand.status === "RENDERING" ? (
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Rendering
                    </span>
                  ) : (
                    <span className="text-violet-400 font-medium">Ready</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* YouTube Publishing Slide-over Modal */}
      {selectedCandidate && (
        <YouTubeUploadModal
          isOpen={youtubeUploadOpen}
          onClose={() => setYoutubeUploadOpen(false)}
          videoDetails={{
            title: selectedCandidate.title
              ? `${selectedCandidate.title.slice(0, 90)} #Shorts`
              : "Viral Short #Shorts",
            description: selectedCandidate.transcript
              ? `${selectedCandidate.transcript.slice(0, 500)}\n\n---\n⚖️ Fair Use Notice: This video features transformative commentary, educational critique, and original analysis under Section 107 of the US Copyright Act.\n\n#Shorts #Viral #Mindset #ClipForge`
              : "ClipForge AI Viral Short #Shorts",
            candidateId: selectedCandidate.id,
            exportId: selectedCandidate.metadata?.exportId,
            videoPath: selectedCandidate.filePath,
            tags: ["Shorts", "Viral", "Mindset", "Motivation", "ClipForge"],
          }}
        />
      )}
    </div>
  );
}
