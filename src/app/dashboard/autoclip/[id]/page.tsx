"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
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
  const [captionPreset, setCaptionPreset] = useState<"bold_viral" | "electric_violet" | "minimal_clean" | "classic_dark" | "none">("bold_viral");

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

  const fetchProjectData = async () => {
    try {
      // Find latest job for project
      const projRes = await fetch(`/api/autoclip/projects`);
      if (!projRes.ok) return;
      const projData = await projRes.json();
      const p = (projData.projects || []).find((x: any) => x.id === projectId);

      if (p && p.jobId) {
        const jobRes = await fetch(`/api/autoclip/jobs/${p.jobId}`);
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

    if (cand.metadata?.renderedCropMode) {
      setCropMode(cand.metadata.renderedCropMode);
    }
    if (cand.metadata?.captionPreset) {
      setCaptionPreset(cand.metadata.captionPreset);
    }

    if (videoRef.current) {
      videoRef.current.currentTime = cand.startTime;
      setCurrentTime(cand.startTime);
    }
  };

  // Video time tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Loop within candidate window
    if (cur >= editEnd) {
      videoRef.current.currentTime = editStart;
      videoRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < editStart || videoRef.current.currentTime >= editEnd) {
        videoRef.current.currentTime = editStart;
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
          quality: "high",
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
              setToastMessage("Clip rendered successfully! Ready for download.");
              setTimeout(() => setToastMessage(null), 4000);
              fetchProjectData();
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
            {/* Player Container */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {project?.sourceMediaUrl ? (
                <video
                  ref={videoRef}
                  src={project.sourceMediaUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <div className="text-neutral-500 text-xs flex flex-col items-center gap-2">
                  <Film className="h-8 w-8" />
                  <span>Video preview unavailable</span>
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
                      videoRef.current.currentTime = editStart;
                      setCurrentTime(editStart);
                    }
                  }}
                  className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
                  title="Rewind to clip start"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs font-mono text-neutral-400">
                <span className="text-white font-bold">{currentTime.toFixed(1)}s</span> / {project?.duration ? `${project.duration}s` : "0s"}
              </div>

              <div className="text-xs bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-300">
                Duration: <strong className="text-violet-400 font-mono">{(editEnd - editStart).toFixed(1)}s</strong>
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
                { id: "blur_background", label: "Blurred Canvas" },
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
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value="bold_viral">🔥 Bold Viral (Yellow & White, Stroke)</option>
                <option value="electric_violet">⚡ Electric Violet (Brand Neon)</option>
                <option value="minimal_clean">✨ Minimal Clean (White Sans-Serif)</option>
                <option value="classic_dark">⬛ Classic Box (Translucent Pill)</option>
                <option value="none">🚫 No Subtitles (Clean Video)</option>
              </select>
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

            {/* Downloads if already rendered */}
            {selectedCandidate?.status === "RENDERED" && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3 pt-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Vertical 9:16 Video Ready!</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedCandidate.metadata?.exportId && (
                    <a
                      href={`/api/autoclip/download/${selectedCandidate.metadata.exportId}`}
                      download
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5 transition shadow"
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
          </div>
        </div>
      </div>

      {/* Candidate Clips Selector Carousel / Gallery */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-400" />
            Candidate Highlights ({candidates.length})
          </h2>
          <span className="text-xs text-neutral-400">
            Click any candidate to preview, edit timing, and export
          </span>
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
    </div>
  );
}
