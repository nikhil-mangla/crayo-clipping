"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Scissors,
  Sliders,
  Sparkles,
  Layers,
  Volume2,
  VolumeX,
  Upload,
  Music,
  Mic,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Copy,
  Split,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
  Wand2,
  Radio,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  FolderPlus,
  Search,
  Grid,
  List,
  Magnet,
  Maximize2,
  Minimize2,
  Settings,
  MoreVertical,
  Bot,
  Send,
  Key,
  X,
  CheckCircle2,
} from "lucide-react";
import { YouTubeIcon } from "@/components/ui/youtube-icon";
import YouTubeUploadModal from "@/components/youtube/upload-modal";

export interface TimelineClip {
  id: string;
  title: string;
  duration: number; // seconds
  startTime: number; // in-point
  endTime?: number;
  url?: string;
  filePath?: string;
  color: string;
  speed: number;
  type: "video" | "graphic" | "stock";
  aspectRatio?: "9:16" | "16:9";
}

export interface TimelineVoiceover {
  id: string;
  title: string;
  startTime: number; // timeline offset in seconds
  duration: number;
  volume: number; // 0 to 2 (1 = 100%)
  url?: string;
  filePath?: string;
  muted?: boolean;
}

export interface StockMiniClip {
  id: string;
  title: string;
  duration: number;
  color: string;
  tag: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  bpm: string;
  vibe: string;
  url: string;
}

export type PremiereTool = "select" | "trackSelect" | "ripple" | "razor" | "slip" | "pen" | "hand" | "zoom";

export default function AdobePremiereProEditorPage() {
  // Sequence Configuration
  const [projectTitle, setProjectTitle] = useState("Sequence 01 - Viral Premiere Project");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [resolution, setResolution] = useState<"1080p" | "2k" | "4k">("1080p");
  const [videoFilter, setVideoFilter] = useState("none");
  const [zoomLevel, setZoomLevel] = useState(1.2); // 0.6x to 3.5x
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<PremiereTool>("select");
  const [snapping, setSnapping] = useState(true);
  const [safeMargins, setSafeMargins] = useState(false);

  // Active Workspace Mode Tab
  const [workspaceMode, setWorkspaceMode] = useState<"editing" | "color" | "effects" | "audio" | "captions">("editing");

  // Top Left Panel Tab (Source / Effect Controls / Lumetri / Audio Mixer)
  const [topLeftTab, setTopLeftTab] = useState<"effects" | "source" | "lumetri" | "mixer">("effects");

  // Bottom Left Bin Tab (Project / Media / Voiceovers / Music)
  const [bottomLeftTab, setBottomLeftTab] = useState<"project" | "voiceovers" | "music" | "stock">("project");
  const [binSearchQuery, setBinSearchQuery] = useState("");
  const [binViewMode, setBinViewMode] = useState<"grid" | "list">("grid");

  // Timeline Clips (Supports up to 100 mini clips!)
  const [clips, setClips] = useState<TimelineClip[]>([
    { id: "c1", title: "Clip_01_OpeningHook.mp4", duration: 3.2, startTime: 0, color: "bg-[#274472]", speed: 1.0, type: "stock" },
    { id: "c2", title: "Clip_02_CyberSkylines.mp4", duration: 4.0, startTime: 0, color: "bg-[#1e5652]", speed: 1.0, type: "stock" },
    { id: "c3", title: "Clip_03_SatisfyingAction.mp4", duration: 2.8, startTime: 0, color: "bg-[#4c3b71]", speed: 1.0, type: "stock" },
    { id: "c4", title: "Clip_04_MegaRampDrift.mp4", duration: 3.5, startTime: 0, color: "bg-[#744222]", speed: 1.0, type: "stock" },
    { id: "c5", title: "Clip_05_CallToAction.mp4", duration: 3.0, startTime: 0, color: "bg-[#5c2438]", speed: 1.0, type: "stock" },
  ]);

  // Voiceover Track (Track A1)
  const [voiceovers, setVoiceovers] = useState<TimelineVoiceover[]>([
    {
      id: "vo_1",
      title: "Voiceover_01_MainNarrator.wav",
      startTime: 0.5,
      duration: 12.0,
      volume: 1.15,
      muted: false,
    },
  ]);

  // Background Music Bed (Track A2)
  const [selectedMusic, setSelectedMusic] = useState<string>("stoic_piano");
  const [musicVolume, setMusicVolume] = useState<number>(0.18);
  const [musicMuted, setMusicMuted] = useState(false);

  // Inspector & Selection
  const [selectedClipId, setSelectedClipId] = useState<string>("c1");
  const [selectedVoId, setSelectedVoId] = useState<string | null>("vo_1");
  const [inspectorTarget, setInspectorTarget] = useState<"clip" | "voiceover">("clip");

  // Playhead & Transport
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(0); // seconds
  const [isLooping, setIsLooping] = useState(true);

  // In / Out Marker Points
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);

  // Track Header States (V1, V2, A1, A2)
  const [v1Locked, setV1Locked] = useState(false);
  const [v1Visible, setV1Visible] = useState(true);
  const [a1Muted, setA1Muted] = useState(false);
  const [a1Solo, setA1Solo] = useState(false);

  // Assets Library State
  const [libraryClips, setLibraryClips] = useState<any[]>([]);
  const [stockClips, setStockClips] = useState<StockMiniClip[]>([]);
  const [libraryVoiceovers, setLibraryVoiceovers] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  // Batch Upload & Drag-and-Drop State (Supports up to 100 files at once)
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);
  const [batchUploadState, setBatchUploadState] = useState<{
    isUploading: boolean;
    total: number;
    completed: number;
    currentFile: string;
    percentage: number;
    errors: string[];
    successMessage?: string;
  }>({
    isUploading: false,
    total: 0,
    completed: 0,
    currentFile: "",
    percentage: 0,
    errors: [],
  });

  // Audio Preview state for Bins
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // VU Meter Simulation State
  const [vuLeft, setVuLeft] = useState(0);
  const [vuRight, setVuRight] = useState(0);

  // Export & Download Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<"IDLE" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [exportMessage, setExportMessage] = useState("");
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [exportedExportId, setExportedExportId] = useState<string | null>(null);
  const [exportedFileSize, setExportedFileSize] = useState<number | null>(null);

  // YouTube Upload Modal
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);

  // Gemini AI Copilot State
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [geminiInput, setGeminiInput] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState("");
  const [modalTestingKey, setModalTestingKey] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{ valid?: boolean; message?: string; error?: string } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const geminiChatScrollRef = useRef<HTMLDivElement | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: "user" | "gemini";
      text: string;
      actions?: any[];
      timestamp: string;
      source?: string;
    }>
  >([
    {
      id: "welcome",
      role: "gemini",
      text: "👋 Hi! I'm your Gemini AI Video Editing Copilot. You can give me instructions like:\n• 'Trim all clips to 2s'\n• 'Switch to 9:16 Shorts'\n• 'Delete voiceover'\n• 'Set music to Phonk Drift'\n• 'Apply Cyberpunk LUT'\n• 'Add 20 mini clips' (supports up to 100)\n• 'Export video in 2K QHD'",
      timestamp: "Just now",
      source: "gemini",
    },
  ]);

  // Video Preview & Scrubber Refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate Sequence Totals
  const totalDuration = clips.reduce((acc, c) => acc + (c.duration || 1), 0);
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const selectedVo = voiceovers.find((v) => v.id === selectedVoId);

  // Determine active clip at playheadTime
  let activeClipIndex = 0;
  let activeClipStart = 0;
  let accumulated = 0;
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    if (playheadTime >= accumulated && playheadTime < accumulated + c.duration) {
      activeClipIndex = i;
      activeClipStart = accumulated;
      break;
    }
    accumulated += c.duration;
  }
  const currentActiveClip = clips[activeClipIndex] || clips[0];
  const localClipOffset = Math.max(0, playheadTime - activeClipStart);

  // Fetch Assets on load
  const loadAssets = useCallback(async () => {
    try {
      setIsLoadingAssets(true);
      const res = await fetch("/api/editor/assets");
      if (res.ok) {
        const data = await res.json();
        setLibraryClips(data.clips || []);
        setStockClips(data.stockMiniClips || []);
        setLibraryVoiceovers(data.voiceovers || []);
        setMusicTracks(data.musicTracks || []);
      }
    } catch (err) {
      console.warn("Failed to load editor assets:", err);
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Load saved Gemini API Key from localStorage
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("clipforge_gemini_api_key");
      if (storedKey) {
        setGeminiApiKey(storedKey);
        setTempApiKeyInput(storedKey);
      }
    } catch {}
  }, []);

  // Auto-scroll Gemini Copilot chat thread
  useEffect(() => {
    if (isGeminiOpen && geminiChatScrollRef.current) {
      geminiChatScrollRef.current.scrollTop = geminiChatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isGeminiOpen]);

  // Master Playback Timer & Audio VU Meter simulation
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 33; // ~30 fps
      playbackTimerRef.current = setInterval(() => {
        setPlayheadTime((prev) => {
          const next = prev + intervalMs / 1000;
          if (next >= totalDuration) {
            if (isLooping) return 0;
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });

        // Simulate bouncing audio levels on VU Meter
        const baseLevel = 45 + Math.random() * 40;
        setVuLeft(Math.min(95, baseLevel + Math.random() * 10));
        setVuRight(Math.min(95, baseLevel - 5 + Math.random() * 15));
      }, intervalMs);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setVuLeft(0);
      setVuRight(0);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, totalDuration, isLooping]);

  // Sync HTML5 video preview
  useEffect(() => {
    if (videoPreviewRef.current && currentActiveClip?.url) {
      const vid = videoPreviewRef.current;
      const targetTime = (currentActiveClip.startTime || 0) + localClipOffset;
      if (Math.abs(vid.currentTime - targetTime) > 0.4) {
        vid.currentTime = targetTime;
      }
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {});
      } else if (!isPlaying && !vid.paused) {
        vid.pause();
      }
    }
  }, [currentActiveClip, localClipOffset, isPlaying]);

  // SMPTE Timecode Formatter: 00:00:00:00 (HH:MM:SS:FF at 30fps)
  const formatSMPTETimecode = (seconds: number) => {
    const s = Math.max(0, seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const frames = Math.floor((s % 1) * 30);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  // Keyboard Shortcuts (Space, C, V, I, O, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "c" || e.key === "C") {
        setActiveTool("razor");
      } else if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
      } else if (e.key === "i" || e.key === "I") {
        setInPoint(playheadTime);
      } else if (e.key === "o" || e.key === "O") {
        setOutPoint(playheadTime);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setPlayheadTime((prev) => Math.max(0, prev - 1 / 30));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setPlayheadTime((prev) => Math.min(totalDuration, prev + 1 / 30));
      } else if (e.code === "Home") {
        e.preventDefault();
        setPlayheadTime(0);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (inspectorTarget === "voiceover" && selectedVoId) {
          handleDeleteVoiceover(selectedVoId);
        } else if (inspectorTarget === "clip" && selectedClipId) {
          handleDeleteClip(selectedClipId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalDuration, playheadTime, inspectorTarget, selectedVoId, selectedClipId]);

  // Add Mini Clip to Timeline (Supports up to 100 mini clips!)
  const handleAddClip = (clipData: Partial<TimelineClip>) => {
    if (clips.length >= 100) {
      alert("Timeline supports up to 100 mini clips per sequence.");
      return;
    }
    const colors = ["bg-[#274472]", "bg-[#1e5652]", "bg-[#4c3b71]", "bg-[#744222]", "bg-[#5c2438]", "bg-[#2d5a3f]"];
    const newId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newClip: TimelineClip = {
      id: newId,
      title: clipData.title || `Clip_${String(clips.length + 1).padStart(2, "0")}.mp4`,
      duration: Math.max(0.5, clipData.duration || 3.0),
      startTime: clipData.startTime || 0,
      url: clipData.url,
      filePath: clipData.filePath,
      color: clipData.color || colors[clips.length % colors.length],
      speed: clipData.speed || 1.0,
      type: clipData.type || "stock",
      aspectRatio: clipData.aspectRatio || aspectRatio,
    };
    setClips([...clips, newClip]);
    setSelectedClipId(newId);
    setInspectorTarget("clip");
  };

  // Batch Add Sample Clips (Up to 100 mini clips)
  const handleBatchAddClips = (count: number) => {
    const remainingSlots = 100 - clips.length;
    const toAddCount = Math.min(count, remainingSlots);
    if (toAddCount <= 0) {
      alert("Sequence already contains 100 mini clips (maximum limit reached).");
      return;
    }
    const newItems: TimelineClip[] = [];
    const colors = ["bg-[#274472]", "bg-[#1e5652]", "bg-[#4c3b71]", "bg-[#744222]", "bg-[#5c2438]", "bg-[#2d5a3f]"];
    const titles = ["Hook_Opening", "Cyber_Speed", "Satisfying_Drop", "Ramp_Stunt", "Cinematic_Reveal", "Viral_Reaction", "Action_Impact", "Outro_Punch"];

    for (let i = 0; i < toAddCount; i++) {
      const idx = clips.length + i + 1;
      newItems.push({
        id: `batch_${Date.now()}_${idx}`,
        title: `Clip_${String(idx).padStart(2, "0")}_${titles[i % titles.length]}.mp4`,
        duration: 1.5 + (i % 3) * 0.5,
        startTime: 0,
        color: colors[i % colors.length],
        speed: 1.0,
        type: "stock",
        aspectRatio,
      });
    }
    setClips([...clips, ...newItems]);
  };

  // Reorder Clips
  const handleMoveClip = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clips.length) return;
    const newClips = [...clips];
    const temp = newClips[index];
    newClips[index] = newClips[targetIndex];
    newClips[targetIndex] = temp;
    setClips(newClips);
  };

  // Duplicate Clip
  const handleDuplicateClip = (index: number) => {
    if (clips.length >= 100) return;
    const source = clips[index];
    const duplicated: TimelineClip = {
      ...source,
      id: `c_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${source.title}_copy`,
    };
    const newClips = [...clips];
    newClips.splice(index + 1, 0, duplicated);
    setClips(newClips);
    setSelectedClipId(duplicated.id);
  };

  // Split Clip at Playhead or Razor Click
  const handleSplitClip = (index: number, atTime?: number) => {
    if (clips.length >= 100) return;
    const clip = clips[index];
    let clipStart = 0;
    for (let i = 0; i < index; i++) clipStart += clips[i].duration;

    const cutTime = atTime !== undefined ? atTime : playheadTime;
    const splitOffset = cutTime - clipStart;

    if (splitOffset <= 0.3 || splitOffset >= clip.duration - 0.3) {
      alert("Position the cut line inside the clip boundaries.");
      return;
    }

    const firstHalf: TimelineClip = {
      ...clip,
      duration: parseFloat(splitOffset.toFixed(2)),
    };

    const secondHalf: TimelineClip = {
      ...clip,
      id: `c_split_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${clip.title}_cut`,
      startTime: (clip.startTime || 0) + splitOffset,
      duration: parseFloat((clip.duration - splitOffset).toFixed(2)),
    };

    const newClips = [...clips];
    newClips.splice(index, 1, firstHalf, secondHalf);
    setClips(newClips);
    setSelectedClipId(secondHalf.id);
  };

  // Delete Clip
  const handleDeleteClip = (id: string) => {
    if (clips.length <= 1) {
      alert("At least 1 clip must remain on the sequence.");
      return;
    }
    const remaining = clips.filter((c) => c.id !== id);
    setClips(remaining);
    if (selectedClipId === id) {
      setSelectedClipId(remaining[0].id);
    }
  };

  // Add Voiceover
  const handleAddVoiceover = (voData: Partial<TimelineVoiceover>) => {
    const newVo: TimelineVoiceover = {
      id: `vo_${Date.now()}`,
      title: voData.title || `VO_Track_${voiceovers.length + 1}.wav`,
      startTime: playheadTime,
      duration: voData.duration || 8.0,
      volume: 1.0,
      url: voData.url,
      filePath: voData.filePath,
      muted: false,
    };
    setVoiceovers([...voiceovers, newVo]);
    setSelectedVoId(newVo.id);
    setInspectorTarget("voiceover");
    setTopLeftTab("effects");
  };

  // Delete Voiceover
  const handleDeleteVoiceover = (id: string) => {
    const remaining = voiceovers.filter((v) => v.id !== id);
    setVoiceovers(remaining);
    if (selectedVoId === id) {
      setSelectedVoId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) setInspectorTarget("clip");
    }
  };

  // Clear All Voiceovers
  const handleClearAllVoiceovers = () => {
    setVoiceovers([]);
    setSelectedVoId(null);
    setInspectorTarget("clip");
  };

  // Clear All Clips from Sequence Timeline
  const handleClearAllClips = () => {
    setClips([]);
    setSelectedClipId("");
  };

  // ============================================================
  // GEMINI AI COPILOT ACTION EXECUTION ENGINE
  // ============================================================
  const executeAiAction = (action: any) => {
    if (!action || !action.type) return;

    switch (action.type) {
      case "TRIM_ALL_CLIPS": {
        const dur = Math.max(0.2, Number(action.payload?.duration) || 2.0);
        setClips((prev) => prev.map((c) => ({ ...c, duration: dur })));
        break;
      }
      case "TRIM_CLIP": {
        const { clipId, index, duration } = action.payload || {};
        const dur = Math.max(0.2, Number(duration) || 2.0);
        setClips((prev) =>
          prev.map((c, idx) => (c.id === clipId || idx === index ? { ...c, duration: dur } : c))
        );
        break;
      }
      case "SET_CLIP_SPEED": {
        const spd = Math.max(0.5, Math.min(3.0, Number(action.payload?.speed) || 1.0));
        setClips((prev) => prev.map((c) => ({ ...c, speed: spd })));
        break;
      }
      case "SPLIT_CLIP": {
        const splitTime =
          action.payload?.time !== undefined ? Number(action.payload.time) : playheadTime;
        let accumulatedTime = 0;
        let foundIdx = -1;
        for (let i = 0; i < clips.length; i++) {
          const nextAcc = accumulatedTime + clips[i].duration;
          if (splitTime >= accumulatedTime && splitTime < nextAcc) {
            foundIdx = i;
            break;
          }
          accumulatedTime = nextAcc;
        }
        if (foundIdx !== -1) {
          handleSplitClip(foundIdx, splitTime);
        }
        break;
      }
      case "DELETE_CLIP": {
        const { clipId, index } = action.payload || {};
        if (clipId) handleDeleteClip(clipId);
        else if (index !== undefined && clips[index]) handleDeleteClip(clips[index].id);
        else if (clips.length > 1) handleDeleteClip(clips[0].id);
        break;
      }
      case "CLEAR_TIMELINE": {
        handleClearAllClips();
        break;
      }
      case "ADD_SAMPLE_CLIPS": {
        const count = Number(action.payload?.count) || 10;
        handleBatchAddClips(count);
        break;
      }
      case "CLEAR_VOICEOVERS": {
        handleClearAllVoiceovers();
        break;
      }
      case "DELETE_VOICEOVER": {
        const { voId, index } = action.payload || {};
        if (voId) handleDeleteVoiceover(voId);
        else if (index !== undefined && voiceovers[index]) handleDeleteVoiceover(voiceovers[index].id);
        else if (voiceovers.length > 0) handleDeleteVoiceover(voiceovers[0].id);
        break;
      }
      case "ADD_VOICEOVER": {
        const { text, title, startTime, duration } = action.payload || {};
        handleAddVoiceover({
          title: title || (text ? text.slice(0, 24) : "VO_AI_Track.wav"),
          startTime: startTime !== undefined ? Number(startTime) : playheadTime,
          duration: Number(duration) || 8.0,
          volume: 1.0,
        });
        break;
      }
      case "SET_VOICEOVER_VOLUME": {
        const vol = Number(action.payload?.volume) ?? 1.0;
        setVoiceovers((prev) => prev.map((v) => ({ ...v, volume: vol })));
        break;
      }
      case "SET_MUSIC": {
        const track = action.payload?.musicTrack || "none";
        setSelectedMusic(track);
        setMusicMuted(track === "none");
        break;
      }
      case "SET_MUSIC_VOLUME": {
        const vol = Math.max(0, Math.min(1, Number(action.payload?.volume) ?? 0.18));
        setMusicVolume(vol);
        break;
      }
      case "SET_ASPECT_RATIO": {
        const ar = action.payload?.aspectRatio === "16:9" ? "16:9" : "9:16";
        setAspectRatio(ar);
        break;
      }
      case "SET_RESOLUTION": {
        const res = action.payload?.resolution;
        if (res === "2k" || res === "4k" || res === "1080p") {
          setResolution(res);
        }
        break;
      }
      case "SET_COLOR_FILTER": {
        setVideoFilter(action.payload?.filter || "none");
        break;
      }
      case "PLAY": {
        setIsPlaying(true);
        break;
      }
      case "PAUSE": {
        setIsPlaying(false);
        break;
      }
      case "SEEK": {
        const t = Math.max(0, Number(action.payload?.time) || 0);
        setPlayheadTime(t);
        break;
      }
      case "EXPORT_SEQUENCE": {
        handleStartExport();
        break;
      }
    }
  };

  const handleSendGeminiInstruction = async (customPrompt?: string) => {
    const textToSend = (customPrompt || geminiInput).trim();
    if (!textToSend || isAiProcessing) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: "user" as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setGeminiInput("");
    setIsAiProcessing(true);

    try {
      const storedKeyFallback = typeof window !== "undefined" ? localStorage.getItem("clipforge_gemini_api_key") || "" : "";
      const resolvedApiKey = (geminiApiKey.trim() || storedKeyFallback.trim()) || undefined;

      const res = await fetch("/api/editor/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          geminiApiKey: resolvedApiKey,
          timelineState: {
            clipsCount: clips.length,
            totalDuration,
            aspectRatio,
            resolution,
            selectedMusic,
            musicVolume,
            videoFilter,
            playheadTime,
            voiceoversCount: voiceovers.length,
            clips: clips.map((c) => ({
              id: c.id,
              title: c.title,
              duration: c.duration,
              speed: c.speed,
              startTime: c.startTime,
            })),
            voiceovers: voiceovers.map((v) => ({
              id: v.id,
              title: v.title,
              duration: v.duration,
              volume: v.volume,
              startTime: v.startTime,
            })),
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.actions) && data.actions.length > 0) {
          // Sort actions so clearance/resets happen before additions, and export happens last
          const sortedActions = [...data.actions].sort((a, b) => {
            if (a.type === "CLEAR_TIMELINE" || a.type === "CLEAR_VOICEOVERS") return -1;
            if (b.type === "CLEAR_TIMELINE" || b.type === "CLEAR_VOICEOVERS") return 1;
            if (a.type === "EXPORT_SEQUENCE") return 1;
            if (b.type === "EXPORT_SEQUENCE") return -1;
            return 0;
          });
          sortedActions.forEach((act: any) => {
            executeAiAction(act);
          });
        }

        const aiMsg = {
          id: `ai_${Date.now()}`,
          role: "gemini" as const,
          text: data.reply || "Done! I've updated the sequence according to your instructions.",
          actions: data.actions || [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: data.source,
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg = {
          id: `err_${Date.now()}`,
          role: "gemini" as const,
          text: `⚠️ ${data.error || "Failed to process instruction."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const networkErrMsg = {
        id: `err_${Date.now()}`,
        role: "gemini" as const,
        text: `⚠️ Connection error: ${err.message || "Failed to communicate with AI endpoint."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, networkErrMsg]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSaveApiKey = (newKey: string) => {
    setGeminiApiKey(newKey);
    setTempApiKeyInput(newKey);
    try {
      if (newKey) localStorage.setItem("clipforge_gemini_api_key", newKey);
      else localStorage.removeItem("clipforge_gemini_api_key");
    } catch {}
    setShowApiKeyModal(false);
  };

  const handleTestModalKey = async () => {
    const keyToTest =
      tempApiKeyInput.trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("clipforge_gemini_api_key") || "" : "");
    if (!keyToTest) {
      setModalTestResult({ valid: false, error: "Please enter an API key starting with AIzaSy... first" });
      return;
    }
    setModalTestingKey(true);
    setModalTestResult(null);
    try {
      const res = await fetch("/api/editor/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testOnly: true, geminiApiKey: keyToTest }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setModalTestResult({ valid: true, message: data.message || "✓ Google Gemini Key is valid & active!" });
      } else {
        setModalTestResult({ valid: false, error: data.error || "Key validation failed" });
      }
    } catch (err: any) {
      setModalTestResult({ valid: false, error: err.message || "Failed to reach server" });
    } finally {
      setModalTestingKey(false);
    }
  };

  // Batch Insert All Library Clips into Sequence Timeline
  const handleInsertAllLibraryClips = () => {
    if (libraryClips.length === 0) return;
    const remainingSlots = 100 - clips.length;
    const toAdd = libraryClips.slice(0, remainingSlots);
    toAdd.forEach((c) => handleAddClip(c));
  };

  // Drag and Drop Handlers for Window & Dropzones
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setIsDraggingOver(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await batchUploadFiles(e.dataTransfer.files);
    }
  };

  // Batch Upload up to 100 Video & Audio Files (Supports Multi-Select & Drag-and-Drop)
  const batchUploadFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList).filter((f) => f.size > 0);
    if (rawFiles.length === 0) return;

    // Supports up to 100 mini clips
    const filesToUpload = rawFiles.slice(0, 100);
    const totalCount = filesToUpload.length;

    setBatchUploadState({
      isUploading: true,
      total: totalCount,
      completed: 0,
      currentFile: filesToUpload[0].name,
      percentage: 0,
      errors: [],
      successMessage: undefined,
    });

    const BATCH_SIZE = 5;
    const newClipsToAdd: TimelineClip[] = [];
    const newVoiceoversToAdd: TimelineVoiceover[] = [];
    const collectedErrors: string[] = [];

    const colors = ["bg-[#274472]", "bg-[#1e5652]", "bg-[#4c3b71]", "bg-[#744222]", "bg-[#5c2438]", "bg-[#2d5a3f]"];

    for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
      const chunk = filesToUpload.slice(i, i + BATCH_SIZE);
      const formData = new FormData();
      chunk.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch("/api/editor/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.assets) {
          for (const asset of data.assets) {
            if (asset.type === "voiceover") {
              newVoiceoversToAdd.push({
                id: `vo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: asset.title,
                startTime: 0,
                duration: asset.duration || 6.0,
                volume: 1.0,
                url: asset.url,
                filePath: asset.filePath,
                muted: false,
              });
            } else {
              newClipsToAdd.push({
                id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: asset.title,
                duration: asset.duration || 4.0,
                startTime: 0,
                url: asset.url,
                filePath: asset.filePath,
                color: colors[(clips.length + newClipsToAdd.length) % colors.length],
                speed: 1.0,
                type: "video",
                aspectRatio: asset.aspectRatio || aspectRatio,
              });
            }
          }
        } else if (data.error) {
          collectedErrors.push(data.error);
        }
      } catch (err: any) {
        collectedErrors.push(err.message || "Network error during upload batch");
      }

      const completed = Math.min(totalCount, i + BATCH_SIZE);
      setBatchUploadState((prev) => ({
        ...prev,
        completed,
        percentage: Math.round((completed / totalCount) * 100),
        currentFile: filesToUpload[Math.min(totalCount - 1, i + BATCH_SIZE)]?.name || "",
        errors: collectedErrors,
      }));
    }

    // Automatically add all uploaded clips to Timeline Track V1 (up to 100 clips)
    if (newClipsToAdd.length > 0) {
      setClips((prev) => {
        const merged = [...prev, ...newClipsToAdd];
        return merged.slice(0, 100);
      });
      setSelectedClipId(newClipsToAdd[0].id);
      setInspectorTarget("clip");
    }

    if (newVoiceoversToAdd.length > 0) {
      setVoiceovers((prev) => [...prev, ...newVoiceoversToAdd]);
      setSelectedVoId(newVoiceoversToAdd[0].id);
      setInspectorTarget("voiceover");
    }

    setBatchUploadState((prev) => ({
      ...prev,
      isUploading: false,
      completed: totalCount,
      percentage: 100,
      successMessage: `Successfully uploaded ${newClipsToAdd.length} clips and added to sequence!`,
    }));

    await loadAssets();
  };

  // Export Pipeline
  const handleStartExport = async () => {
    if (clips.length === 0) return;
    try {
      setIsExportModalOpen(true);
      setExportStatus("PROCESSING");
      setExportProgress(10);
      setExportMessage(`Initializing sequence export with ${clips.length} mini clips...`);
      setExportDownloadUrl(null);
      setExportedExportId(null);

      const payload = {
        title: projectTitle,
        aspectRatio,
        resolution,
        videoFilter,
        clips: clips.map((c) => ({
          id: c.id,
          title: c.title,
          filePath: c.filePath,
          url: c.url,
          startTime: c.startTime || 0,
          duration: c.duration,
          speed: c.speed || 1.0,
          color: c.color,
        })),
        voiceovers: voiceovers.map((v) => ({
          id: v.id,
          title: v.title,
          filePath: v.filePath,
          url: v.url,
          startTime: v.startTime,
          duration: v.duration,
          volume: v.muted || a1Muted ? 0 : v.volume,
        })),
        musicTrack: musicMuted ? "none" : selectedMusic,
        musicVolume,
      };

      const res = await fetch("/api/editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export initialization failed");

      const exportId = data.exportId;
      setExportedExportId(exportId);

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/editor/export/${exportId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            setExportProgress(pollData.progress || 20);
            setExportMessage(pollData.message || "Processing timeline...");

            if (pollData.status === "COMPLETED") {
              clearInterval(pollInterval);
              setExportStatus("COMPLETED");
              setExportProgress(100);
              setExportDownloadUrl(pollData.downloadUrl || `/api/editor/download/${exportId}`);
              setExportedFileSize(pollData.fileSize || null);
            } else if (pollData.status === "FAILED") {
              clearInterval(pollInterval);
              setExportStatus("FAILED");
              setExportMessage(pollData.message || "Rendering failed");
            }
          }
        } catch (pollErr) {
          console.warn("Poll check error:", pollErr);
        }
      }, 1500);
    } catch (err: any) {
      setExportStatus("FAILED");
      setExportMessage(err.message || "Export failed to start");
    }
  };

  // Preview Audio
  const togglePlayAudioPreview = (audioUrl: string) => {
    if (previewAudioUrl === audioUrl && previewAudioRef.current) {
      if (previewAudioRef.current.paused) {
        previewAudioRef.current.play();
      } else {
        previewAudioRef.current.pause();
        setPreviewAudioUrl(null);
      }
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    previewAudioRef.current = audio;
    setPreviewAudioUrl(audioUrl);
    audio.play().catch(() => {});
    audio.onended = () => setPreviewAudioUrl(null);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex flex-col bg-[#191919] text-[#e0e0e0] font-sans overflow-hidden select-none relative ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen"
          : "h-[calc(100vh-4.25rem)] -m-4 md:-m-6 border border-[#2b2b2b] shadow-2xl"
      }`}
    >
      {/* Fullscreen Drag and Drop Overlay for up to 100 clips */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#0d6efd]/30 border-4 border-dashed border-[#00c7fd] backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
          <div className="h-24 w-24 rounded-full bg-[#0d6efd]/40 text-white flex items-center justify-center shadow-2xl mb-4 animate-bounce border-2 border-white/50">
            <Upload className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
            DROP UP TO 100 VIDEOS / AUDIO FILES HERE
          </h2>
          <p className="text-base font-semibold text-cyan-200 mt-2 max-w-lg drop-shadow">
            Release your files to batch upload and immediately populate them on your sequence timeline!
          </p>
        </div>
      )}

      {/* Floating Live Batch Upload Progress Banner */}
      {batchUploadState.isUploading && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e1e1e] border-2 border-[#0d6efd] rounded-xl p-4 shadow-2xl w-88 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-2 text-cyan-300">
              <Loader2 className="h-4 w-4 animate-spin text-[#0d6efd]" />
              <span>Uploading Media Batch</span>
            </span>
            <span className="font-mono text-[#00c7fd] text-sm">{batchUploadState.percentage}%</span>
          </div>

          <div className="w-full h-2.5 bg-[#121212] rounded-full overflow-hidden border border-[#333]">
            <div
              className="h-full bg-gradient-to-r from-[#0d6efd] to-cyan-400 transition-all duration-200"
              style={{ width: `${batchUploadState.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-300">
            <span className="truncate max-w-[190px] font-mono text-neutral-400">
              {batchUploadState.currentFile || "Processing files..."}
            </span>
            <span className="font-mono font-bold text-cyan-300">
              {batchUploadState.completed} / {batchUploadState.total} Files
            </span>
          </div>

          {batchUploadState.errors.length > 0 && (
            <div className="text-[10px] text-red-400 bg-red-950/30 p-1.5 rounded border border-red-500/20 max-h-16 overflow-y-auto">
              {batchUploadState.errors[0]}
            </div>
          )}
        </div>
      )}

      {/* Success Notification Banner */}
      {batchUploadState.successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e1e1e] border border-emerald-500 rounded-xl p-3 shadow-2xl flex items-center gap-2.5 animate-fade-in text-xs text-emerald-300">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{batchUploadState.successMessage}</span>
          <button
            type="button"
            onClick={() => setBatchUploadState((prev) => ({ ...prev, successMessage: undefined }))}
            className="text-neutral-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}
      {/* ============================================================ */}
      {/* 1. ADOBE PREMIERE PRO APPLICATION & MENU BAR                 */}
      {/* ============================================================ */}
      <header className="h-9 bg-[#1d1d1d] border-b border-[#2d2d2d] px-3 flex items-center justify-between flex-shrink-0 z-20 text-[11px]">
        {/* Left: Pr Badge & File Menus */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="bg-[#382b5f] text-[#b388ff] border border-[#b388ff]/40 font-serif font-black px-1.5 py-0.2 rounded text-[11px] shadow-sm tracking-tight">
              Pr
            </span>
            <span className="text-neutral-300 font-semibold tracking-tight hidden sm:inline">
              Adobe Premiere Pro
            </span>
          </div>

          {/* Desktop File Menu Bar */}
          <nav className="hidden md:flex items-center gap-1 text-neutral-400">
            {["File", "Edit", "Clip", "Sequence", "Markers", "Graphics", "View", "Window", "Help"].map((m) => (
              <button
                key={m}
                type="button"
                className="px-2 py-0.5 hover:bg-[#2d2d2d] hover:text-white rounded transition text-[11px]"
              >
                {m}
              </button>
            ))}
          </nav>
        </div>

        {/* Center: Workspaces Mode Bar */}
        <div className="hidden lg:flex items-center gap-0.5 bg-[#141414] p-0.5 rounded border border-[#2d2d2d]">
          {(["editing", "color", "effects", "audio", "captions"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setWorkspaceMode(mode);
                if (mode === "color") setTopLeftTab("lumetri");
                if (mode === "effects") setTopLeftTab("effects");
                if (mode === "audio") setTopLeftTab("mixer");
              }}
              className={`px-2.5 py-0.5 rounded text-[11px] capitalize font-medium transition ${
                workspaceMode === mode
                  ? "bg-[#2d2d2d] text-[#3b82f6] font-bold shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: Aspect, Resolution, Fullscreen, Quick Export */}
        <div className="flex items-center gap-2">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center bg-[#141414] border border-[#2d2d2d] p-0.5 rounded text-[11px]">
            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                aspectRatio === "9:16" ? "bg-[#3b82f6] text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              9:16 Shorts
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("16:9")}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                aspectRatio === "16:9" ? "bg-[#3b82f6] text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              16:9 Landscape
            </button>
          </div>

          {/* Master Resolution */}
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as any)}
            className="bg-[#141414] border border-[#2d2d2d] text-neutral-300 text-[11px] px-2 py-0.5 rounded outline-none font-medium hidden sm:block"
          >
            <option value="1080p">1080p FHD</option>
            <option value="2k">2K QHD (YouTube VP9)</option>
            <option value="4k">4K Cinema UHD</option>
          </select>

          {/* Fullscreen Workspace Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#2d2d2d] rounded transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace (F11)"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* ✨ Gemini AI Copilot Toggle Button */}
          <button
            type="button"
            onClick={() => setIsGeminiOpen(!isGeminiOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition shadow-sm border ${
              isGeminiOpen
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-purple-900/40 ring-1 ring-purple-400/50"
                : "bg-[#28183f] hover:bg-[#39205e] text-[#c084fc] border-[#a855f7]/40 hover:border-[#a855f7]"
            }`}
            title="Toggle Gemini AI Video Editor Copilot Chat"
          >
            <Sparkles className="h-3 w-3 text-purple-300 animate-pulse" />
            <span>Gemini AI Copilot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </button>

          {/* Premiere Quick Export Button */}
          <button
            type="button"
            onClick={handleStartExport}
            disabled={clips.length === 0}
            className="px-3 py-1 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-bold rounded text-[11px] transition flex items-center gap-1.5 shadow disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
            <span className="bg-white/20 text-[10px] px-1 rounded font-mono">
              {clips.length}/100
            </span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN 4-QUADRANT PREMIERE WORKSPACE                        */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-h-0 divide-y divide-[#262626]">
        {/* UPPER HALF: SOURCE/EFFECTS (LEFT) + PROGRAM MONITOR (RIGHT) */}
        <div className="flex-1 grid grid-cols-12 min-h-0 divide-x divide-[#262626]">
          {/* QUADRANT 1: SOURCE / EFFECT CONTROLS / LUMETRI COLOR (5 cols) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col bg-[#212121] overflow-hidden">
            {/* Panel Tabs Header */}
            <div className="h-7 bg-[#1c1c1c] border-b border-[#2b2b2b] px-2 flex items-center gap-1 text-[11px] flex-shrink-0">
              <button
                type="button"
                onClick={() => setTopLeftTab("effects")}
                className={`px-3 py-1 rounded-t border-b-2 font-semibold transition ${
                  topLeftTab === "effects"
                    ? "border-[#3b82f6] text-white bg-[#262626]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Effect Controls
              </button>

              <button
                type="button"
                onClick={() => setTopLeftTab("source")}
                className={`px-3 py-1 rounded-t border-b-2 font-semibold transition ${
                  topLeftTab === "source"
                    ? "border-[#3b82f6] text-white bg-[#262626]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Source: {currentActiveClip?.title || "No Clip"}
              </button>

              <button
                type="button"
                onClick={() => setTopLeftTab("lumetri")}
                className={`px-3 py-1 rounded-t border-b-2 font-semibold transition ${
                  topLeftTab === "lumetri"
                    ? "border-[#3b82f6] text-white bg-[#262626]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Lumetri Color
              </button>

              <button
                type="button"
                onClick={() => setTopLeftTab("mixer")}
                className={`px-3 py-1 rounded-t border-b-2 font-semibold transition ${
                  topLeftTab === "mixer"
                    ? "border-[#3b82f6] text-white bg-[#262626]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Audio Mixer
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-3 text-[11px]">
              {/* TAB: EFFECT CONTROLS */}
              {topLeftTab === "effects" && (
                <div className="space-y-4">
                  {/* Target Selector: Video Clip vs Voiceover Track */}
                  <div className="flex items-center gap-1 bg-[#181818] p-0.5 rounded border border-[#2b2b2b]">
                    <button
                      type="button"
                      onClick={() => setInspectorTarget("clip")}
                      className={`flex-1 py-1 rounded text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                        inspectorTarget === "clip"
                          ? "bg-[#274472] text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Film className="h-3 w-3" />
                      <span>Video Clip ({clips.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTarget("voiceover")}
                      className={`flex-1 py-1 rounded text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                        inspectorTarget === "voiceover"
                          ? "bg-[#238636] text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Mic className="h-3 w-3" />
                      <span>Voiceover Track ({voiceovers.length})</span>
                    </button>
                  </div>

                  {/* 1. VIDEO CLIP EFFECT CONTROLS */}
                  {inspectorTarget === "clip" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-1 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                        <span>fx Motion &amp; Transform</span>
                        <span className="font-mono text-[#3b82f6]">Clip #{activeClipIndex + 1}</span>
                      </div>

                      {/* Clip Name */}
                      <div>
                        <label className="block text-neutral-400 mb-1">Clip Name</label>
                        <input
                          type="text"
                          value={selectedClip?.title || ""}
                          onChange={(e) =>
                            setClips(
                              clips.map((c) =>
                                c.id === selectedClip?.id ? { ...c, title: e.target.value } : c
                              )
                            )
                          }
                          className="w-full px-2.5 py-1 bg-[#141414] border border-[#333] rounded text-white text-[11px] outline-none focus:border-[#3b82f6]"
                        />
                      </div>

                      {/* Duration & Speed */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-neutral-400 mb-1">Duration (sec)</label>
                          <input
                            type="number"
                            min="0.3"
                            max="60"
                            step="0.1"
                            value={selectedClip?.duration || 3}
                            onChange={(e) => {
                              const val = Math.max(0.3, parseFloat(e.target.value) || 1);
                              setClips(
                                clips.map((c) =>
                                  c.id === selectedClip?.id ? { ...c, duration: val } : c
                                )
                              );
                            }}
                            className="w-full px-2.5 py-1 bg-[#141414] border border-[#333] rounded font-mono text-white text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-neutral-400 mb-1">Speed Rate</label>
                          <select
                            value={selectedClip?.speed || 1.0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setClips(
                                clips.map((c) =>
                                  c.id === selectedClip?.id ? { ...c, speed: val } : c
                                )
                              );
                            }}
                            className="w-full px-2.5 py-1 bg-[#141414] border border-[#333] rounded font-mono text-white text-[11px]"
                          >
                            <option value="0.5">0.5x (Slow)</option>
                            <option value="0.75">0.75x</option>
                            <option value="1.0">1.0x (Normal)</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x (Fast)</option>
                            <option value="2.0">2.0x (Hyper)</option>
                          </select>
                        </div>
                      </div>

                      {/* Clip Actions: Split, Duplicate, Delete */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-[#2b2b2b]">
                        <button
                          type="button"
                          onClick={() => handleSplitClip(activeClipIndex)}
                          className="flex-1 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-neutral-200 rounded font-semibold transition flex items-center justify-center gap-1"
                        >
                          <Scissors className="h-3 w-3" /> Razor Split
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateClip(activeClipIndex)}
                          className="flex-1 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-neutral-200 rounded font-semibold transition flex items-center justify-center gap-1"
                        >
                          <Copy className="h-3 w-3" /> Duplicate
                        </button>

                        <button
                          type="button"
                          onClick={() => selectedClip && handleDeleteClip(selectedClip.id)}
                          className="flex-1 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded font-semibold transition flex items-center justify-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete Clip
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. VOICEOVER EFFECT CONTROLS & DELETE (SOLVES USER REQUIREMENT) */}
                  {inspectorTarget === "voiceover" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-1 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                        <span className="flex items-center gap-1 text-[#238636]">
                          <Mic className="h-3.5 w-3.5" />
                          <span>fx Voiceover Audio Track</span>
                        </span>
                        <span className="font-mono text-cyan-400">{voiceovers.length} on Track A1</span>
                      </div>

                      {voiceovers.length > 0 && selectedVo ? (
                        <div className="space-y-3 bg-[#171717] p-2.5 rounded border border-[#2b2b2b]">
                          {/* Voiceover Track Selection if multiple */}
                          {voiceovers.length > 1 && (
                            <div>
                              <label className="block text-neutral-400 mb-1">Select Track Segment</label>
                              <select
                                value={selectedVo.id}
                                onChange={(e) => setSelectedVoId(e.target.value)}
                                className="w-full px-2 py-1 bg-[#141414] border border-[#333] rounded text-white text-[11px]"
                              >
                                {voiceovers.map((vo, idx) => (
                                  <option key={vo.id} value={vo.id}>
                                    VO #{idx + 1}: {vo.title} ({vo.duration}s at {vo.startTime.toFixed(1)}s)
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Voiceover Name */}
                          <div>
                            <label className="block text-neutral-400 mb-1">Voiceover Label</label>
                            <input
                              type="text"
                              value={selectedVo.title}
                              onChange={(e) =>
                                setVoiceovers(
                                  voiceovers.map((v) =>
                                    v.id === selectedVo.id ? { ...v, title: e.target.value } : v
                                  )
                                )
                              }
                              className="w-full px-2.5 py-1 bg-[#141414] border border-[#333] rounded text-white text-[11px]"
                            />
                          </div>

                          {/* Start Offset Slider */}
                          <div>
                            <div className="flex items-center justify-between mb-1 text-neutral-400">
                              <span>Start Offset on Timeline</span>
                              <span className="font-mono text-cyan-400 font-bold">{selectedVo.startTime.toFixed(2)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.max(1, totalDuration)}
                              step="0.1"
                              value={selectedVo.startTime}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setVoiceovers(
                                  voiceovers.map((v) =>
                                    v.id === selectedVo.id ? { ...v, startTime: val } : v
                                  )
                                );
                              }}
                              className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                            />
                          </div>

                          {/* Volume Gain dB */}
                          <div>
                            <div className="flex items-center justify-between mb-1 text-neutral-400">
                              <span>Audio Level Gain</span>
                              <span className="font-mono text-cyan-400 font-bold">
                                {Math.round(selectedVo.volume * 100)}% ({((selectedVo.volume - 1) * 12).toFixed(1)} dB)
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="2.0"
                              step="0.05"
                              value={selectedVo.volume}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setVoiceovers(
                                  voiceovers.map((v) =>
                                    v.id === selectedVo.id ? { ...v, volume: val } : v
                                  )
                                );
                              }}
                              className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                            />
                          </div>

                          {/* Mute Toggle */}
                          <label className="flex items-center gap-2 text-neutral-300 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={!!selectedVo.muted}
                              onChange={(e) =>
                                setVoiceovers(
                                  voiceovers.map((v) =>
                                    v.id === selectedVo.id ? { ...v, muted: e.target.checked } : v
                                  )
                                )
                              }
                              className="rounded bg-[#141414] border-[#333] text-cyan-500"
                            />
                            <span>Mute Voiceover Track</span>
                          </label>

                          {/* DELETE VOICEOVER BUTTON (EXPLICIT USER REQUEST) */}
                          <div className="pt-2 border-t border-[#2b2b2b] space-y-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteVoiceover(selectedVo.id)}
                              className="w-full py-2 bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-300 rounded font-bold transition flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              <span>Delete Voiceover from Sequence</span>
                            </button>

                            {voiceovers.length > 1 && (
                              <button
                                type="button"
                                onClick={handleClearAllVoiceovers}
                                className="w-full py-1 text-neutral-400 hover:text-white text-[10px]"
                              >
                                Clear All {voiceovers.length} Voiceovers
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-neutral-500 bg-[#141414] rounded border border-dashed border-[#2b2b2b]">
                          <p>No voiceover track active on sequence.</p>
                          <button
                            type="button"
                            onClick={() => setBottomLeftTab("voiceovers")}
                            className="mt-2 px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded font-bold text-[10px] inline-flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Voiceover
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: SOURCE MONITOR */}
              {topLeftTab === "source" && (
                <div className="space-y-3">
                  <div className="aspect-video bg-black rounded border border-[#2b2b2b] flex items-center justify-center relative overflow-hidden">
                    {currentActiveClip?.url ? (
                      <video src={currentActiveClip.url} className="w-full h-full object-contain" controls />
                    ) : (
                      <div className="text-center text-neutral-500">
                        <Film className="h-8 w-8 mx-auto mb-1 opacity-50" />
                        <span>Source Asset Preview</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>{currentActiveClip?.title}</span>
                    <span className="font-mono">{currentActiveClip?.duration}s</span>
                  </div>
                </div>
              )}

              {/* TAB: LUMETRI COLOR */}
              {topLeftTab === "lumetri" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-1 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                    <span>fx Lumetri Color Grading</span>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-neutral-400">Creative Look Preset</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: "none", label: "Rec. 709 Standard" },
                        { key: "mrbeast_hyperpop", label: "MrBeast Hyperpop" },
                        { key: "teal_orange", label: "Hollywood Teal/Orange" },
                        { key: "mdscae_moody", label: "Atmospheric Cinema" },
                        { key: "viral_oled", label: "Razor OLED Pop" },
                        { key: "vintage_35mm", label: "Kodak 35mm Film" },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => setVideoFilter(preset.key)}
                          className={`p-2 rounded border text-left transition ${
                            videoFilter === preset.key
                              ? "bg-[#3b82f6]/20 border-[#3b82f6] text-white"
                              : "bg-[#161616] border-[#2b2b2b] text-neutral-400 hover:text-white"
                          }`}
                        >
                          <div className="font-bold text-[10px]">{preset.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: AUDIO MIXER */}
              {topLeftTab === "mixer" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#181818] p-2 rounded border border-[#2b2b2b]">
                      <span className="text-[10px] text-neutral-400 block mb-1">A1 Voiceover</span>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={voiceovers[0]?.volume || 1}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setVoiceovers(voiceovers.map((vo) => ({ ...vo, volume: v })));
                        }}
                        className="h-24 -rotate-90 my-8 accent-[#238636] cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-[#238636] block">
                        {Math.round((voiceovers[0]?.volume || 1) * 100)}%
                      </span>
                    </div>

                    <div className="bg-[#181818] p-2 rounded border border-[#2b2b2b]">
                      <span className="text-[10px] text-neutral-400 block mb-1">A2 Music Bed</span>
                      <input
                        type="range"
                        min="0"
                        max="0.8"
                        step="0.02"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        className="h-24 -rotate-90 my-8 accent-[#0d6efd] cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-[#0d6efd] block">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>

                    <div className="bg-[#181818] p-2 rounded border border-[#2b2b2b]">
                      <span className="text-[10px] text-neutral-400 block mb-1">Master Stereo</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        defaultValue="1"
                        className="h-24 -rotate-90 my-8 accent-white cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-white block">0.0 dB</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QUADRANT 2: PROGRAM MONITOR (CANVAS / SEQUENCE PREVIEW) (7 cols) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col bg-[#1a1a1a] overflow-hidden">
            {/* Monitor Header Bar */}
            <div className="h-7 bg-[#1c1c1c] border-b border-[#2b2b2b] px-3 flex items-center justify-between text-[11px] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold tracking-tight">Program: Sequence 01</span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400 font-mono">{aspectRatio}</span>
              </div>

              {/* Master Blue Timecode Display */}
              <div className="font-mono font-bold text-[#00c7fd] text-xs tracking-wider bg-black/60 px-2 py-0.5 rounded border border-[#333]">
                {formatSMPTETimecode(playheadTime)}
              </div>
            </div>

            {/* Central Monitor Frame */}
            <div className="flex-1 min-h-0 bg-[#0f0f0f] flex items-center justify-center p-3 relative overflow-hidden">
              <div
                className={`relative bg-[#161616] border border-[#2f2f2f] rounded flex items-center justify-center shadow-2xl transition-all duration-150 overflow-hidden ${
                  aspectRatio === "9:16" ? "h-full aspect-[9/16]" : "w-full aspect-[16/9]"
                }`}
              >
                {/* Real video or stylized visual clip */}
                {currentActiveClip?.url ? (
                  <video
                    ref={videoPreviewRef}
                    src={currentActiveClip.url}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#1e1e1e] to-[#121212]">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md mb-2"
                      style={{
                        backgroundColor: currentActiveClip?.color
                          ? currentActiveClip.color.replace("bg-", "")
                          : "#274472",
                      }}
                    >
                      <Film className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-white text-xs font-bold truncate max-w-[180px]">
                      {currentActiveClip?.title}
                    </span>
                    <span className="text-neutral-500 font-mono text-[10px] mt-0.5">
                      {currentActiveClip?.duration}s • Clip #{activeClipIndex + 1}
                    </span>
                  </div>
                )}

                {/* Safe Margins Overlay */}
                {safeMargins && (
                  <div className="absolute inset-4 border border-cyan-400/30 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-cyan-400/20" />
                    <div className="h-full w-0.5 bg-cyan-400/20 absolute" />
                  </div>
                )}

                {/* Simulated dynamic burn-in subtitles */}
                <div className="absolute bottom-5 inset-x-2 text-center pointer-events-none">
                  <span className="bg-black/80 text-[#ffd600] text-[11px] font-black uppercase px-2 py-0.5 rounded shadow">
                    {currentActiveClip?.title?.replace(".mp4", "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Premiere Pro Transport Toolbar */}
            <div className="h-10 bg-[#1c1c1c] border-t border-[#2b2b2b] px-3 flex items-center justify-between text-[11px] flex-shrink-0">
              <div className="flex items-center gap-1">
                {/* In / Out Markers */}
                <button
                  type="button"
                  onClick={() => setInPoint(playheadTime)}
                  className="px-2 py-1 hover:bg-[#2d2d2d] text-neutral-300 font-bold rounded"
                  title="Mark In (I)"
                >
                  &#123;
                </button>
                <button
                  type="button"
                  onClick={() => setOutPoint(playheadTime)}
                  className="px-2 py-1 hover:bg-[#2d2d2d] text-neutral-300 font-bold rounded"
                  title="Mark Out (O)"
                >
                  &#125;
                </button>

                <div className="h-4 w-px bg-[#333] mx-1" />

                {/* Transport Buttons */}
                <button
                  type="button"
                  onClick={() => setPlayheadTime(0)}
                  className="p-1 hover:bg-[#2d2d2d] text-neutral-300 rounded"
                  title="Go to Start (Home)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlayheadTime((p) => Math.max(0, p - 1 / 30))}
                  className="p-1 hover:bg-[#2d2d2d] text-neutral-300 rounded"
                  title="Step Back 1 Frame (Left Arrow)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Master Play / Pause */}
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-7 w-10 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded flex items-center justify-center transition shadow mx-1"
                  title="Play / Stop (Space)"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPlayheadTime((p) => Math.min(totalDuration, p + 1 / 30))}
                  className="p-1 hover:bg-[#2d2d2d] text-neutral-300 rounded"
                  title="Step Forward 1 Frame (Right Arrow)"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="h-4 w-px bg-[#333] mx-1" />

                {/* Safe Margins */}
                <button
                  type="button"
                  onClick={() => setSafeMargins(!safeMargins)}
                  className={`p-1 rounded text-neutral-400 hover:text-white ${
                    safeMargins ? "bg-[#333] text-cyan-400" : ""
                  }`}
                  title="Toggle Safe Margins"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Right Side: Total Duration & Loop */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 text-[10px]">
                  <input
                    type="checkbox"
                    checked={isLooping}
                    onChange={(e) => setIsLooping(e.target.checked)}
                    className="rounded bg-[#141414] border-[#333] text-[#3b82f6]"
                  />
                  <span>Loop</span>
                </label>

                <span className="font-mono text-neutral-400 text-[11px]">
                  {formatSMPTETimecode(totalDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER HALF: PROJECT BIN (LEFT) + TOOLBAR + TIMELINE (RIGHT) + VU METERS */}
        <div className="h-64 flex min-h-0 divide-x divide-[#262626]">
          {/* QUADRANT 3: PROJECT BIN / MEDIA BROWSER (Left Column 320px) */}
          <div className="w-80 flex flex-col bg-[#212121] overflow-hidden flex-shrink-0">
            {/* Bin Header Tabs */}
            <div className="h-7 bg-[#1c1c1c] border-b border-[#2b2b2b] px-2 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBottomLeftTab("project")}
                  className={`px-2 py-1 font-semibold transition ${
                    bottomLeftTab === "project" ? "text-white border-b-2 border-[#3b82f6]" : "text-neutral-400"
                  }`}
                >
                  📁 Clips ({clips.length})
                </button>

                <button
                  type="button"
                  onClick={() => setBottomLeftTab("voiceovers")}
                  className={`px-2 py-1 font-semibold transition ${
                    bottomLeftTab === "voiceovers" ? "text-white border-b-2 border-[#238636]" : "text-neutral-400"
                  }`}
                >
                  🎙 VO ({voiceovers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setBottomLeftTab("music")}
                  className={`px-2 py-1 font-semibold transition ${
                    bottomLeftTab === "music" ? "text-white border-b-2 border-[#0d6efd]" : "text-neutral-400"
                  }`}
                >
                  🎵 Music
                </button>
              </div>

              {/* Quick Batch Add Mini Clips */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleBatchAddClips(10)}
                  className="px-1.5 py-0.5 bg-[#2d2d2d] hover:bg-[#383838] text-white text-[10px] rounded"
                  title="Batch Add 10 Mini Clips to Sequence"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchAddClips(50)}
                  className="px-1.5 py-0.5 bg-[#2d2d2d] hover:bg-[#383838] text-white text-[10px] rounded"
                  title="Batch Add 50 Mini Clips to Sequence"
                >
                  +50
                </button>
              </div>
            </div>

            {/* Bin Search, Multi-Upload & Dropzone */}
            <div className="p-2 border-b border-[#2b2b2b] space-y-2 bg-[#1a1a1a]">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="h-3 w-3 absolute left-2 top-2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Filter clips..."
                    value={binSearchQuery}
                    onChange={(e) => setBinSearchQuery(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 bg-[#141414] border border-[#2d2d2d] rounded text-[10px] text-white outline-none"
                  />
                </div>

                <label className="cursor-pointer px-2.5 py-1 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white rounded text-[10px] font-bold flex items-center gap-1 shadow transition">
                  <Upload className="h-3 w-3" />
                  <span>Upload Files</span>
                  <input
                    type="file"
                    multiple
                    accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.m4a"
                    className="hidden"
                    onChange={(e) => e.target.files && batchUploadFiles(e.target.files)}
                  />
                </label>
              </div>

              {/* Dedicated Drag & Drop Area for up to 100 Videos */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    batchUploadFiles(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-[#3b82f6]/40 hover:border-[#3b82f6] bg-[#141414]/80 hover:bg-[#3b82f6]/10 p-2.5 rounded-lg text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 group"
              >
                <div className="flex items-center gap-1.5 text-[#60a5fa] font-bold text-[10px]">
                  <Upload className="h-3.5 w-3.5 group-hover:scale-110 transition" />
                  <span>Drag &amp; Drop up to 100 Videos Here</span>
                </div>
                <p className="text-[9px] text-neutral-400">
                  Multiple files supported • Automatically populates timeline
                </p>
              </div>

              {/* Quick Sequence Management Bar */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={handleClearAllClips}
                  className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                  title="Clear all clips from timeline"
                >
                  <Trash2 className="h-2.5 w-2.5" /> Clear Sequence
                </button>

                {libraryClips.length > 0 && (
                  <button
                    type="button"
                    onClick={handleInsertAllLibraryClips}
                    className="text-[#60a5fa] hover:text-white font-semibold flex items-center gap-1"
                    title="Insert all library clips into sequence"
                  >
                    <Plus className="h-2.5 w-2.5" /> Insert All ({libraryClips.length})
                  </button>
                )}
              </div>
            </div>

            {/* Bin Items List / Grid */}
            <div className="flex-1 overflow-y-auto p-2 text-[11px] space-y-2">
              {/* TAB: PROJECT CLIPS */}
              {bottomLeftTab === "project" && (
                <div className="space-y-1">
                  {libraryClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="p-1.5 bg-[#181818] hover:bg-[#282828] border border-[#2b2b2b] rounded flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Film className="h-3.5 w-3.5 text-[#3b82f6] flex-shrink-0" />
                        <span className="truncate text-white text-[11px]">{clip.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddClip(clip)}
                        className="px-1.5 py-0.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[10px] rounded font-bold"
                      >
                        + Insert
                      </button>
                    </div>
                  ))}

                  {/* Stock Clips */}
                  {stockClips.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-1.5 bg-[#181818] hover:bg-[#282828] border border-[#2b2b2b] rounded flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.color }} />
                        <span className="truncate text-white text-[11px]">{sc.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddClip(sc)}
                        className="px-1.5 py-0.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[10px] rounded font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: VOICEOVERS BIN & ACTIVE VOICEOVERS DELETE LIST */}
              {bottomLeftTab === "voiceovers" && (
                <div className="space-y-2">
                  {/* Sequence Active Voiceovers (Direct delete buttons) */}
                  <div className="p-1.5 bg-[#181818] rounded border border-[#2b2b2b]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#238636] uppercase tracking-wider">
                        Active on Sequence A1
                      </span>
                      {voiceovers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllVoiceovers}
                          className="text-[9px] text-red-400 hover:text-red-300 font-bold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {voiceovers.length > 0 ? (
                      <div className="space-y-1">
                        {voiceovers.map((vo) => (
                          <div
                            key={vo.id}
                            className="p-1 bg-[#238636]/20 border border-[#238636]/40 rounded flex items-center justify-between"
                          >
                            <span className="truncate text-white text-[10px] max-w-[170px]">{vo.title}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono text-cyan-400">{vo.startTime.toFixed(1)}s</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteVoiceover(vo.id)}
                                className="p-1 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded"
                                title="Delete Voiceover from Sequence"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-neutral-500 italic block">No voiceovers on sequence.</span>
                    )}
                  </div>

                  {/* Available Voiceovers */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Voiceover Audio Samples
                    </span>
                    {libraryVoiceovers.map((vo) => (
                      <div
                        key={vo.id}
                        className="p-1.5 bg-[#181818] hover:bg-[#282828] border border-[#2b2b2b] rounded flex items-center justify-between transition"
                      >
                        <span className="truncate text-white text-[11px] max-w-[180px]">{vo.title}</span>
                        <button
                          type="button"
                          onClick={() => handleAddVoiceover(vo)}
                          className="px-2 py-0.5 bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] rounded font-bold"
                        >
                          + Insert
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: MUSIC */}
              {bottomLeftTab === "music" && (
                <div className="space-y-1">
                  {musicTracks.map((trk) => (
                    <div
                      key={trk.id}
                      className="p-1.5 bg-[#181818] hover:bg-[#282828] border border-[#2b2b2b] rounded flex items-center justify-between transition"
                    >
                      <div className="truncate">
                        <span className="text-white text-[11px] block truncate">{trk.name}</span>
                        <span className="text-[9px] text-neutral-500 font-mono">{trk.bpm}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMusic(trk.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedMusic === trk.id ? "bg-[#0d6efd] text-white" : "bg-[#2d2d2d] text-neutral-300"
                        }`}
                      >
                        {selectedMusic === trk.id ? "Active" : "Select"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* VERTICAL TOOLBAR: PREMIERE PRO PALETTE (V, A, B, C, Y, P, H, Z) */}
          <div className="w-9 bg-[#1c1c1c] flex flex-col items-center py-2 gap-1 border-r border-[#262626] flex-shrink-0 text-neutral-400">
            {[
              { id: "select", icon: ChevronLeft, label: "Selection Tool (V)" },
              { id: "razor", icon: Scissors, label: "Razor Blade Cut Tool (C)" },
              { id: "trackSelect", icon: ChevronRight, label: "Track Select Forward (A)" },
              { id: "ripple", icon: Split, label: "Ripple Edit Tool (B)" },
              { id: "pen", icon: Wand2, label: "Keyframe Pen Tool (P)" },
              { id: "hand", icon: MoreVertical, label: "Hand Tool (H)" },
              { id: "zoom", icon: ZoomIn, label: "Zoom Tool (Z)" },
            ].map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id as PremiereTool)}
                className={`p-1.5 rounded transition ${
                  activeTool === tool.id
                    ? "bg-[#3b82f6] text-white shadow"
                    : "hover:bg-[#2d2d2d] hover:text-white"
                }`}
                title={tool.label}
              >
                <tool.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* QUADRANT 4: MULTI-TRACK SEQUENCE TIMELINE (Timeline: Sequence 01) */}
          <div className="flex-1 flex flex-col bg-[#181818] overflow-hidden min-w-0">
            {/* Timeline Sequence Header */}
            <div className="h-7 bg-[#1c1c1c] border-b border-[#2b2b2b] px-3 flex items-center justify-between text-[11px] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold tracking-tight">Timeline: Sequence 01</span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400 font-mono text-[10px]">
                  {clips.length} Clips on V1 • {voiceovers.length} VO on A1
                </span>
              </div>

              {/* Snapping Magnet & Timeline Tools */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSnapping(!snapping)}
                  className={`p-1 rounded transition ${
                    snapping ? "text-[#3b82f6] bg-[#333]" : "text-neutral-400 hover:text-white"
                  }`}
                  title="Snap in Timeline (S)"
                >
                  <Magnet className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                  <ZoomOut className="h-3 w-3" />
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-[#3b82f6] cursor-pointer"
                  />
                  <ZoomIn className="h-3 w-3" />
                  <span className="font-mono text-[9px] w-6 text-right">{zoomLevel.toFixed(1)}x</span>
                </div>
              </div>
            </div>

            {/* Scrollable Tracks Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Track Headers (V2, V1, A1, A2) */}
              <div className="w-28 bg-[#1f1f1f] border-r border-[#262626] flex flex-col divide-y divide-[#262626] flex-shrink-0 text-[10px]">
                {/* Time Ruler Spacer */}
                <div className="h-6 bg-[#171717] px-2 flex items-center font-mono text-neutral-500 text-[9px]">
                  00:00:00:00
                </div>

                {/* Track V2 Header */}
                <div className="h-10 px-2 flex items-center justify-between bg-[#1e1e1e]">
                  <span className="font-bold text-neutral-400">V2</span>
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Eye className="h-3 w-3" />
                    <Lock className="h-3 w-3" />
                  </div>
                </div>

                {/* Track V1 Header (Primary Video) */}
                <div className="h-14 px-2 py-1 flex flex-col justify-between bg-[#1e1e1e]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#3b82f6]">V1 Video</span>
                    <span className="font-mono bg-[#3b82f6]/20 text-[#60a5fa] px-1 rounded text-[9px]">
                      {clips.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setV1Visible(!v1Visible)}
                      className={`hover:text-white ${!v1Visible ? "text-red-400" : ""}`}
                    >
                      {v1Visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setV1Locked(!v1Locked)}
                      className={`hover:text-white ${v1Locked ? "text-amber-400" : ""}`}
                    >
                      {v1Locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Track A1 Header (Voiceover Track) */}
                <div className="h-14 px-2 py-1 flex flex-col justify-between bg-[#1e1e1e]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#238636]">A1 Voice</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono bg-[#238636]/20 text-emerald-300 px-1 rounded text-[9px]">
                        {voiceovers.length}
                      </span>
                      {voiceovers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllVoiceovers}
                          className="hover:text-red-400 text-neutral-500 transition"
                          title="Clear all voiceovers from Track A1"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setA1Muted(!a1Muted)}
                      className={`px-1 rounded font-bold ${a1Muted ? "bg-red-500 text-white" : "bg-[#2d2d2d]"}`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => setA1Solo(!a1Solo)}
                      className={`px-1 rounded font-bold ${a1Solo ? "bg-amber-500 text-white" : "bg-[#2d2d2d]"}`}
                    >
                      S
                    </button>
                  </div>
                </div>

                {/* Track A2 Header (Music Bed) */}
                <div className="h-12 px-2 py-1 flex flex-col justify-between bg-[#1e1e1e]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0d6efd]">A2 Music</span>
                    <span className="font-mono text-[9px] text-neutral-500">Ducked</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setMusicMuted(!musicMuted)}
                      className={`px-1 rounded font-bold ${musicMuted ? "bg-red-500 text-white" : "bg-[#2d2d2d]"}`}
                    >
                      M
                    </button>
                  </div>
                </div>
              </div>

              {/* Center / Right: The Multitrack Timeline Sequence */}
              <div
                ref={timelineScrollRef}
                className="flex-1 overflow-x-auto overflow-y-hidden bg-[#161616] relative select-none"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
                  const pxPerSec = 40 * zoomLevel;
                  const newTime = Math.max(0, Math.min(totalDuration, clickX / pxPerSec));
                  setPlayheadTime(newTime);
                }}
              >
                {/* Timeline Inner Canvas Width */}
                <div
                  className="relative min-w-full divide-y divide-[#262626]"
                  style={{
                    width: `${Math.max(1200, totalDuration * 40 * zoomLevel + 300)}px`,
                  }}
                >
                  {/* Playhead Red Needle */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#e53935] z-30 pointer-events-none transition-all duration-75"
                    style={{
                      left: `${playheadTime * 40 * zoomLevel}px`,
                    }}
                  >
                    <div className="w-3.5 h-3.5 bg-[#e53935] -ml-1.5 rounded-sm flex items-center justify-center shadow-lg" />
                  </div>

                  {/* 1. Time Ruler Header */}
                  <div className="h-6 bg-[#191919] relative border-b border-[#2b2b2b]">
                    {Array.from({ length: Math.ceil(totalDuration) + 10 }).map((_, sec) => {
                      if (sec % (zoomLevel < 1.0 ? 5 : 2) !== 0) return null;
                      return (
                        <div
                          key={sec}
                          className="absolute top-0 bottom-0 border-l border-[#2b2b2b] px-1 text-[9px] font-mono text-neutral-500 flex items-center"
                          style={{ left: `${sec * 40 * zoomLevel}px` }}
                        >
                          {sec}s
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. Track V2 (Overlay / B-roll empty track) */}
                  <div className="h-10 bg-[#161616] relative flex items-center p-1" />

                  {/* 3. Track V1 (Video Mini Clips - up to 100 clips) */}
                  <div className="h-14 relative flex items-center p-1 bg-[#161616]">
                    {clips.length === 0 ? (
                      <label className="h-12 w-full max-w-xl mx-auto rounded-lg border-2 border-dashed border-[#3b82f6]/40 hover:border-[#3b82f6] bg-[#141414]/90 flex items-center justify-center gap-2 cursor-pointer transition text-[#60a5fa] font-bold text-xs shadow-inner">
                        <Upload className="h-4 w-4 animate-pulse" />
                        <span>Track V1 is empty. Drop up to 100 videos here or click to browse!</span>
                        <input
                          type="file"
                          multiple
                          accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.avi"
                          className="hidden"
                          onChange={(e) => e.target.files && batchUploadFiles(e.target.files)}
                        />
                      </label>
                    ) : (
                      clips.map((clip, index) => {
                      const clipWidth = Math.max(48, clip.duration * 40 * zoomLevel);
                      const isSelected = selectedClipId === clip.id;
                      const isActiveNow = currentActiveClip?.id === clip.id;

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTool === "razor") {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const ratio = clickX / clipWidth;
                              handleSplitClip(index, activeClipStart + ratio * clip.duration);
                            } else {
                              setSelectedClipId(clip.id);
                              setInspectorTarget("clip");
                              setTopLeftTab("effects");
                            }
                          }}
                          style={{ width: `${clipWidth}px` }}
                          className={`h-12 rounded border border-black/40 p-1 flex flex-col justify-between cursor-pointer transition flex-shrink-0 text-white relative group overflow-hidden ${
                            clip.color
                          } ${
                            isSelected
                              ? "ring-2 ring-white shadow-xl z-10"
                              : isActiveNow
                              ? "ring-2 ring-[#00c7fd] opacity-95"
                              : "opacity-85 hover:opacity-100"
                          }`}
                        >
                          {/* Premiere Clip Banner */}
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="truncate max-w-[85%]">{clip.title}</span>
                            <span className="text-[9px] font-mono opacity-80">{clip.duration.toFixed(1)}s</span>
                          </div>

                          {/* Trim Bracket Indicator Handles */}
                          <div className="flex items-center justify-between text-[9px] opacity-75 font-mono">
                            <span>[</span>
                            <span>]</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  </div>

                  {/* 4. Track A1 (Voiceovers with Delete Buttons) */}
                  <div className="h-14 relative bg-[#161616] p-1 flex items-center">
                    {voiceovers.map((vo) => {
                      const leftPx = vo.startTime * 40 * zoomLevel;
                      const widthPx = Math.max(70, vo.duration * 40 * zoomLevel);
                      const isSelected = selectedVoId === vo.id;

                      return (
                        <div
                          key={vo.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVoId(vo.id);
                            setInspectorTarget("voiceover");
                            setTopLeftTab("effects");
                          }}
                          style={{
                            position: "absolute",
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                          }}
                          className={`h-12 rounded border border-black/40 p-1 bg-[#238636] text-white cursor-pointer transition flex flex-col justify-between overflow-hidden shadow-md group ${
                            isSelected ? "ring-2 ring-white z-10" : "hover:bg-[#2ea043]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="truncate max-w-[70%]">{vo.title}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono bg-black/40 px-1 rounded">
                                {Math.round(vo.volume * 100)}%
                              </span>
                              {/* Direct Delete Voiceover Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVoiceover(vo.id);
                                }}
                                className="p-0.5 bg-black/50 hover:bg-red-600 rounded text-white/90 hover:text-white transition shadow"
                                title="Delete Voiceover from Sequence"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Waveform graphic */}
                          <div className="flex items-center gap-0.5 h-3 opacity-60">
                            {Array.from({ length: 28 }).map((_, w) => (
                              <div
                                key={w}
                                className="flex-1 bg-white rounded-full"
                                style={{ height: `${20 + ((w * 13) % 80)}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 5. Track A2 (Music Bed) */}
                  <div className="h-12 relative bg-[#161616] p-1 flex items-center">
                    <div
                      style={{ width: `${totalDuration * 40 * zoomLevel}px` }}
                      className="h-10 rounded border border-black/40 p-1 bg-[#1e3a5f] text-white flex items-center justify-between overflow-hidden shadow"
                    >
                      <span className="text-[10px] font-bold truncate">🎵 {selectedMusic}.mp3 [A2]</span>
                      <span className="text-[9px] font-mono opacity-80">Auto-Ducked -18dB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAR RIGHT: MASTER AUDIO VU PEAK METER (PREMIERE CLASSIC) */}
          <div className="w-12 bg-[#1c1c1c] border-l border-[#262626] p-1.5 flex flex-col justify-between flex-shrink-0 text-center font-mono text-[9px] text-neutral-500">
            <span className="text-[8px] font-bold text-neutral-400">dB</span>
            <div className="flex-1 flex justify-center gap-1.5 py-1">
              {/* Left Channel */}
              <div className="w-2 bg-[#141414] rounded-t flex flex-col justify-end overflow-hidden border border-[#2b2b2b]">
                <div
                  className="w-full transition-all duration-75"
                  style={{
                    height: `${vuLeft}%`,
                    background: vuLeft > 90 ? "#e53935" : vuLeft > 75 ? "#fbc02d" : "#238636",
                  }}
                />
              </div>
              {/* Right Channel */}
              <div className="w-2 bg-[#141414] rounded-t flex flex-col justify-end overflow-hidden border border-[#2b2b2b]">
                <div
                  className="w-full transition-all duration-75"
                  style={{
                    height: `${vuRight}%`,
                    background: vuRight > 90 ? "#e53935" : vuRight > 75 ? "#fbc02d" : "#238636",
                  }}
                />
              </div>
            </div>
            <span className="text-[8px] font-bold text-neutral-400">L R</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ADOBE PREMIERE PRO EXPORT DIALOG MODAL                    */}
      {/* ============================================================ */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#212121] border border-[#3b3b3b] rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl text-[11px] animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#382b5f] text-[#b388ff] font-serif font-black px-1.5 py-0.2 rounded text-xs">
                  Pr
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Export Sequence</h3>
                  <p className="text-[10px] text-neutral-400">{projectTitle}</p>
                </div>
              </div>

              {exportStatus !== "PROCESSING" && (
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-neutral-400 hover:text-white px-2 py-0.5 rounded"
                >
                  ✕ Close
                </button>
              )}
            </div>

            {/* Encoding Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 font-semibold">{exportMessage}</span>
                <span className="font-mono text-[#3b82f6] font-bold">{exportProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#141414] rounded-full overflow-hidden border border-[#2d2d2d]">
                <div
                  className="h-full bg-[#0d6efd] transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>

            {/* Media Spec Summary */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#2d2d2d] text-center">
              <div className="bg-[#181818] p-2 rounded">
                <span className="text-neutral-500 text-[9px] block">Clips Concatenated</span>
                <span className="text-white font-bold">{clips.length} Mini Clips</span>
              </div>
              <div className="bg-[#181818] p-2 rounded">
                <span className="text-neutral-500 text-[9px] block">Master Resolution</span>
                <span className="text-white font-bold">{resolution.toUpperCase()}</span>
              </div>
              <div className="bg-[#181818] p-2 rounded">
                <span className="text-neutral-500 text-[9px] block">Voiceovers Mixed</span>
                <span className="text-white font-bold">{voiceovers.length} Tracks</span>
              </div>
            </div>

            {/* Completed Actions */}
            {exportStatus === "COMPLETED" && (
              <div className="space-y-2 pt-1">
                <a
                  href={exportDownloadUrl || "#"}
                  download
                  className="w-full py-2.5 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition text-xs shadow"
                >
                  <Download className="h-4 w-4" />
                  <span>Download MP4 Video</span>
                  {exportedFileSize && (
                    <span className="opacity-80 text-[10px]">
                      ({(exportedFileSize / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  )}
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setIsExportModalOpen(false);
                    setIsYouTubeModalOpen(true);
                  }}
                  className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-semibold rounded-lg flex items-center justify-center gap-2 transition text-xs"
                >
                  <YouTubeIcon className="h-4 w-4 text-red-500" />
                  <span>Publish Directly to YouTube Shorts / Video</span>
                </button>
              </div>
            )}

            {/* Failure state */}
            {exportStatus === "FAILED" && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{exportMessage || "Export failed to complete."}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. GEMINI AI COPILOT INTERACTIVE DRAWER                      */}
      {/* ============================================================ */}
      {isGeminiOpen && (
        <aside className="absolute top-9 right-0 bottom-0 w-88 sm:w-96 bg-[#18181c]/95 backdrop-blur-xl border-l border-[#3b2b54] shadow-2xl flex flex-col z-40 animate-fade-in text-neutral-200">
          {/* Header */}
          <div className="h-11 px-3.5 bg-gradient-to-r from-[#211633] to-[#18181c] border-b border-[#3b2b54] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-purple-600/30 text-purple-300 border border-purple-500/30 shadow-sm">
                <Sparkles className="h-4 w-4 text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-xs text-white">Gemini AI Copilot</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  {geminiApiKey ? "Gemini 1.5/2.0 Flash (Cloud)" : "Deterministic Intent Engine (Instant)"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="p-1 text-neutral-400 hover:text-purple-300 hover:bg-[#2d2242] rounded transition"
                title="Configure Gemini API Key"
              >
                <Key className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsGeminiOpen(false)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-[#2d2242] rounded transition"
                title="Close Copilot Panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Suggestions / Instructions Carousel */}
          <div className="p-2 border-b border-[#2b203d] bg-[#14121a] flex-shrink-0 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Trim all clips to 2s")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>✂️ Trim all 2s</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Switch to 9:16 Shorts")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>📱 9:16 Shorts</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Delete voiceover")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>🗑️ Delete VO</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Set music to Phonk Drift")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>🎵 Phonk Drift</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Apply Cyberpunk LUT")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>🎨 Cyberpunk</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Set resolution to 2K QHD")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>⚡ 2K QHD</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Add 20 mini clips")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>➕ Add 20 Clips</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendGeminiInstruction("Export video")}
                className="px-2 py-1 rounded bg-[#241a38] hover:bg-[#342454] text-purple-200 border border-purple-500/30 transition flex items-center gap-1 flex-shrink-0"
              >
                <span>🚀 Export</span>
              </button>
            </div>
          </div>

          {/* Chat Messages List */}
          <div
            ref={geminiChatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 text-xs custom-scrollbar"
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl p-2.5 shadow-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-[#221c2e] border border-[#3f315a] text-neutral-200 rounded-bl-none"
                  }`}
                >
                  {msg.role === "gemini" && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-300 mb-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Gemini AI</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Confirmed Executed Actions Badges */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-purple-500/20 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                        Executed Actions:
                      </span>
                      {msg.actions.map((act: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[10px] font-mono bg-purple-950/50 text-emerald-300 px-2 py-0.5 rounded border border-purple-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                          <span>{act.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-neutral-500 mt-1 px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isAiProcessing && (
              <div className="flex items-center gap-2 text-xs text-purple-300 bg-[#221c2e] border border-[#3f315a] p-2.5 rounded-xl max-w-[85%] animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                <span>Gemini is applying edits to your sequence...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="p-2.5 bg-[#14121a] border-t border-[#2e2344] flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendGeminiInstruction();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={geminiInput}
                onChange={(e) => setGeminiInput(e.target.value)}
                placeholder="Ask Gemini to trim clips, change music, voiceover..."
                disabled={isAiProcessing}
                className="flex-1 bg-[#1e1a29] border border-[#3b2d54] text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-purple-400 placeholder-neutral-500 transition"
              />
              <button
                type="submit"
                disabled={!geminiInput.trim() || isAiProcessing}
                className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition disabled:opacity-40 shadow-sm"
                title="Send instruction (Enter)"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5 px-0.5">
              <span>Press Enter to send</span>
              <button
                type="button"
                onClick={() =>
                  setChatMessages([
                    {
                      id: `clear_${Date.now()}`,
                      role: "gemini",
                      text: "Chat cleared. What else would you like me to do with your sequence?",
                      timestamp: "Just now",
                    },
                  ])
                }
                className="hover:text-purple-300 transition"
              >
                Clear History
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ============================================================ */}
      {/* 6. GEMINI API KEY MODAL                                      */}
      {/* ============================================================ */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1c1626] border border-[#443261] rounded-2xl p-5 shadow-2xl max-w-md w-full space-y-4 text-xs text-neutral-300">
            <div className="flex items-center justify-between border-b border-[#35254d] pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Google Gemini API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-neutral-400 leading-relaxed">
              ClipForge includes a high-speed deterministic NLP intent engine that executes 100% of video editing commands immediately without any external API key.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              If you want to use Google Gemini 1.5/2.0 Flash for creative conversation, script consultation, and multi-step AI reasoning, enter your Gemini API key below:
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-purple-300">Gemini API Key</label>
              <input
                type="password"
                value={tempApiKeyInput}
                onChange={(e) => setTempApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#120e1a] border border-[#3f2e5c] text-white px-3 py-2 rounded-lg outline-none font-mono text-xs focus:border-purple-400"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestModalKey}
                  disabled={modalTestingKey || !tempApiKeyInput.trim()}
                  className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  {modalTestingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  <span>{modalTestingKey ? "Testing..." : "Test Key Connection"}</span>
                </button>
                {modalTestResult && (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      modalTestResult.valid
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {modalTestResult.valid ? modalTestResult.message : modalTestResult.error}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleSaveApiKey("")}
                className="text-neutral-400 hover:text-red-400 transition"
              >
                Remove Key (Use Offline Engine)
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#271d36] hover:bg-[#342747] text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey(tempApiKeyInput.trim())}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. FLOATING AI CHATBOT LAUNCHER (ALWAYS VISIBLE IN CORNER)   */}
      {/* ============================================================ */}
      {!isGeminiOpen && (
        <button
          type="button"
          onClick={() => setIsGeminiOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-xs border border-purple-400/50 hover:scale-105 transition shadow-purple-950/60 ring-2 ring-purple-400/30 animate-pulse"
          title="Open Gemini AI Video Editor Chatbot"
        >
          <Sparkles className="h-4 w-4 text-purple-200" />
          <span>✨ Open AI Chatbot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </button>
      )}

      {/* ============================================================ */}
      {/* 4. YOUTUBE DIRECT PUBLISHER INTEGRATION                      */}
      {/* ============================================================ */}
      <YouTubeUploadModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        videoDetails={{
          title: projectTitle,
          exportId: exportedExportId || undefined,
          tags: ["premiere", "viral", "shorts", "editing"],
        }}
      />
    </div>
  );
}
