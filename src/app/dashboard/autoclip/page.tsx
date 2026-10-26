"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scissors,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Clock,
  Film,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sliders,
  RefreshCw,
} from "lucide-react";

interface AutoClipProjectItem {
  id: string;
  title: string;
  duration: number | null;
  status: string;
  createdAt: string;
  mediaFileName?: string;
  jobId?: string;
  jobStatus?: string;
  jobProgress?: number;
  jobStage?: string;
  candidatesCount: number;
}

export default function AutoClipHubPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("en");
  const [targetCount, setTargetCount] = useState(4);
  const [minDuration, setMinDuration] = useState(15);
  const [maxDuration, setMaxDuration] = useState(60);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<AutoClipProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/autoclip/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file to upload");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      formData.append("language", language);
      formData.append("targetCount", targetCount.toString());
      formData.append("minDuration", minDuration.toString());
      formData.append("maxDuration", maxDuration.toString());

      const res = await fetch("/api/autoclip/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      router.push(`/dashboard/autoclip/${data.projectId}`);
    } catch (err: any) {
      setError(err.message || "Failed to upload video");
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) {
      setError("Please enter a valid video URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/autoclip/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: videoUrl,
          title: title || "Imported Video",
          language,
          targetCount,
          minDuration,
          maxDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "URL import failed");
      }

      router.push(`/dashboard/autoclip/${data.projectId}`);
    } catch (err: any) {
      setError(err.message || "Failed to import video from URL");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-3 py-1 rounded-full mb-2">
            <Scissors className="h-3.5 w-3.5" />
            <span>AI Short-Form Extraction</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AutoClip Studio</h1>
          <p className="text-neutral-400 mt-1 text-sm md:text-base">
            Turn podcasts, long videos, and tutorials into engaging viral clips for TikTok, YouTube Shorts, and Reels.
          </p>
        </div>

        <button
          onClick={loadProjects}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Projects
        </button>
      </div>

      {/* Main Creation Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xl">
        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1 bg-neutral-950 rounded-xl max-w-sm mb-6 border border-neutral-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === "upload"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("url");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === "url"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            Import URL
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Tab 1: Upload */}
        {activeTab === "upload" && (
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                file
                  ? "border-violet-500/50 bg-violet-950/10"
                  : "border-neutral-700 hover:border-violet-500 hover:bg-neutral-800/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="h-14 w-14 bg-violet-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-violet-400">
                <Upload className="h-7 w-7" />
              </div>
              {file ? (
                <div>
                  <p className="text-white font-medium text-base">{file.name}</p>
                  <p className="text-neutral-400 text-xs mt-1">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB • Ready to analyze
                  </p>
                  <span className="inline-block mt-3 text-xs text-violet-400 hover:underline">
                    Click to choose different file
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-neutral-200 font-medium text-base">
                    Click to upload or drag and drop video
                  </p>
                  <p className="text-neutral-500 text-xs mt-1">
                    Supports MP4, MOV, WebM up to 500MB
                  </p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Podcast Episode #42 Highlights"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Spoken Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="hi">Hindi</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>

            {/* Advanced Clip Controls */}
            <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/60 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Sliders className="h-4 w-4 text-violet-400" />
                <span>Clip Generation Preferences</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Target Clips Count</label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={3}>3 Clips (Quick Highlights)</option>
                    <option value={4}>4 Clips (Standard Pack)</option>
                    <option value={6}>6 Clips (Viral Pack)</option>
                    <option value={8}>8 Clips (Creator Bundle)</option>
                    <option value={10}>10 Clips (Mega Pack)</option>
                    <option value={12}>12 Clips (Pro Studio)</option>
                    <option value={15}>15 Clips (Full Coverage)</option>
                    <option value={20}>20 Clips (All Viral Moments)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Min Duration</label>
                  <select
                    value={minDuration}
                    onChange={(e) => setMinDuration(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Max Duration</label>
                  <select
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds (Shorts limit)</option>
                    <option value={90}>90 seconds (Reels limit)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced Clip Controls for URL */}
            <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/60 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Sliders className="h-4 w-4 text-violet-400" />
                <span>Clip Generation Preferences</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Target Clips Count</label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={3}>3 Clips (Quick Highlights)</option>
                    <option value={4}>4 Clips (Standard Pack)</option>
                    <option value={6}>6 Clips (Viral Pack)</option>
                    <option value={8}>8 Clips (Creator Bundle)</option>
                    <option value={10}>10 Clips (Mega Pack)</option>
                    <option value={12}>12 Clips (Pro Studio)</option>
                    <option value={15}>15 Clips (Full Coverage)</option>
                    <option value={20}>20 Clips (All Viral Moments)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Min Duration</label>
                  <select
                    value={minDuration}
                    onChange={(e) => setMinDuration(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Max Duration</label>
                  <select
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds (Shorts limit)</option>
                    <option value={90}>90 seconds (Reels limit)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading & Starting AutoClip Pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Viral Clips with AI
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: URL */}
        {activeTab === "url" && (
          <form onSubmit={handleUrlSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Authorized Video URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <LinkIcon className="h-4 w-4 text-neutral-500 absolute left-3.5 top-3" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Enter a direct MP4/WebM video stream URL you have authorization to process.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Masterclass Video Clip"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Spoken Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="hi">Hindi</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            {/* Advanced Clip Controls for URL */}
            <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/60 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Sliders className="h-4 w-4 text-violet-400" />
                <span>Clip Generation Preferences</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Target Clips Count</label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={3}>3 Clips (Quick Highlights)</option>
                    <option value={4}>4 Clips (Standard Pack)</option>
                    <option value={6}>6 Clips (Viral Pack)</option>
                    <option value={8}>8 Clips (Creator Bundle)</option>
                    <option value={10}>10 Clips (Mega Pack)</option>
                    <option value={12}>12 Clips (Pro Studio)</option>
                    <option value={15}>15 Clips (Full Coverage)</option>
                    <option value={20}>20 Clips (All Viral Moments)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Min Duration</label>
                  <select
                    value={minDuration}
                    onChange={(e) => setMinDuration(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Max Duration</label>
                  <select
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds (Shorts limit)</option>
                    <option value={90}>90 seconds (Reels limit)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !videoUrl}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading Stream & Launching Pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Import & Generate Clips
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Recent AutoClip Projects */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Film className="h-5 w-5 text-violet-400" />
          Recent AutoClip Projects
        </h2>

        {loadingProjects ? (
          <div className="p-8 text-center text-neutral-500 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-violet-500" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-8 text-center text-neutral-400 text-sm">
            No AutoClip projects found yet. Upload a video above to generate your first set of vertical clips!
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        proj.status === "READY" || proj.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : proj.status === "GENERATING"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {proj.status === "GENERATING" ? "Analyzing..." : proj.status}
                    </span>
                    {proj.duration && (
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(proj.duration / 60)}:
                        {String(Math.floor(proj.duration % 60)).padStart(2, "0")}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-white text-base truncate mb-1" title={proj.title}>
                    {proj.title}
                  </h3>

                  {proj.jobStatus === "PROCESSING" && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-neutral-400">
                        <span className="truncate">{proj.jobStage || "Processing..."}</span>
                        <span>{proj.jobProgress || 0}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-violet-500 h-full transition-all duration-300"
                          style={{ width: `${proj.jobProgress || 10}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {proj.candidatesCount > 0 && (
                    <p className="text-xs text-violet-400 mt-2 font-medium">
                      {proj.candidatesCount} Viral Highlights Detected
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/dashboard/autoclip/${proj.id}`}
                    className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium group-hover:translate-x-0.5 transition-transform"
                  >
                    Open Studio <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
