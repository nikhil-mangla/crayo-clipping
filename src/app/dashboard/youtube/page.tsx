"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Youtube } from "@/components/ui/youtube-icon";
import YouTubeChannelManager, { ConnectedChannel } from "@/components/youtube/channel-manager";
import YouTubeUploadModal from "@/components/youtube/upload-modal";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Film,
  Plus,
  Tv,
  Globe,
  Lock,
  Link2,
  Sparkles,
  Layers,
  HardDrive,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

interface YouTubeUploadRecord {
  id: string;
  title: string;
  description?: string | null;
  privacy: string;
  tags: string[];
  scheduledAt?: string | null;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  studioUrl?: string | null;
  status: string;
  progress: number;
  error?: string | null;
  createdAt: string;
  channel: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    customUrl?: string | null;
  };
}

export default function YouTubeManagementPage() {
  const [activeTab, setActiveTab] = useState<"channels" | "history" | "quick_publish">("channels");
  const [uploads, setUploads] = useState<YouTubeUploadRecord[]>([]);
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [recentClips, setRecentClips] = useState<any[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);

  // Selected clip for upload modal
  const [selectedVideoDetails, setSelectedVideoDetails] = useState({
    title: "Viral Short #Shorts",
    description: "Published directly with ClipForge AI.\n\n#Shorts #Viral",
    candidateId: "",
    exportId: "",
    videoPath: "",
    tags: ["Shorts", "Viral", "ClipForge"],
  });

  const fetchChannels = async () => {
    try {
      setLoadingChannels(true);
      const res = await fetch(`/api/youtube/channels?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchUploads = async () => {
    try {
      setLoadingUploads(true);
      const res = await fetch(`/api/youtube/uploads?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
      }
    } catch (err) {
      console.error("Failed to fetch uploads:", err);
    } finally {
      setLoadingUploads(false);
    }
  };

  const fetchRecentClips = async () => {
    try {
      setLoadingClips(true);
      const res = await fetch(`/api/library?type=VIDEO`);
      if (res.ok) {
        const data = await res.json();
        setRecentClips(data.assets || []);
      }
    } catch (err) {
      console.error("Failed to fetch library clips:", err);
    } finally {
      setLoadingClips(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchUploads();
    fetchRecentClips();
  }, []);

  const defaultChannel = channels.find((c) => c.isDefault) || channels[0];

  const handleOpenUploadForAsset = (asset: any) => {
    setSelectedVideoDetails({
      title: `${asset.name.replace(/\.[^/.]+$/, "").slice(0, 90)} #Shorts`,
      description: `Original clip published from ClipForge AI.\n\n⚖️ Fair Use Section 107 Notice: Transformative educational commentary and clipping.\n\n#Shorts #Viral #ClipForge`,
      candidateId: "",
      exportId: "",
      videoPath: asset.url,
      tags: ["Shorts", "Viral", "Motivation", "ClipForge"],
    });
    setUploadModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1 rounded-full mb-1">
            <Youtube className="h-3.5 w-3.5 text-red-500" />
            <span>Outbound Publishing Hub</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">YouTube Management</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Manage authorized YouTube channels, publish rendered shorts directly, and track live upload history.
          </p>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedVideoDetails({
                title: "Viral Short #Shorts",
                description: "Published directly with ClipForge AI.\n\n#Shorts #Viral",
                candidateId: "",
                exportId: "",
                videoPath: "",
                tags: ["Shorts", "Viral", "ClipForge"],
              });
              setUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-red-950/40"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload to YouTube</span>
          </button>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Connected Channels */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Connected Channels</span>
            <Tv className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loadingChannels ? "..." : channels.length}
          </div>
          <p className="text-[11px] text-neutral-500 truncate">
            {channels.length === 0 ? "No channels linked" : `${channels.length} channel(s) active`}
          </p>
        </div>

        {/* Default Upload Destination */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Default Destination</span>
            <Youtube className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {defaultChannel ? defaultChannel.title : "Not Configured"}
          </div>
          <p className="text-[11px] text-neutral-500 truncate">
            {defaultChannel?.customUrl || (defaultChannel ? "Active default destination" : "Connect a channel")}
          </p>
        </div>

        {/* Published Videos */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Published Videos</span>
            <Film className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loadingUploads ? "..." : uploads.filter((u) => u.status === "COMPLETED").length}
          </div>
          <p className="text-[11px] text-neutral-500">Live on YouTube</p>
        </div>

        {/* API Quota Health */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>YouTube Data API v3</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Healthy
          </div>
          <p className="text-[11px] text-neutral-500">10,000 daily quota limit</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab("channels")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "channels"
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Tv className="h-3.5 w-3.5" />
          <span>Connected Channels ({channels.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("history");
            fetchUploads();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "history"
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Publishing History ({uploads.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("quick_publish");
            fetchRecentClips();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "quick_publish"
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>Publish from Library</span>
        </button>
      </div>

      {/* TAB 1: Channels Management */}
      {activeTab === "channels" && (
        <div className="space-y-6">
          <YouTubeChannelManager />
        </div>
      )}

      {/* TAB 2: Uploads History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-400" />
              Recent YouTube Uploads
            </h3>
            <button
              onClick={fetchUploads}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingUploads ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingUploads ? (
            <div className="p-12 text-center text-neutral-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-red-500" />
              Loading upload history...
            </div>
          ) : uploads.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
              <Youtube className="h-10 w-10 text-neutral-600 mx-auto" />
              <h4 className="text-sm font-semibold text-neutral-300">No YouTube uploads yet</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Select a rendered video in AutoClip Studio or the Media Library and click &ldquo;Publish to YouTube&rdquo; to publish your first Short.
              </p>
              <button
                onClick={() => setActiveTab("quick_publish")}
                className="mt-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition"
              >
                Browse Media Library <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Youtube className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-white text-xs">{upload.title}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            upload.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : upload.status === "FAILED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {upload.status}
                        </span>
                        <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded uppercase font-mono">
                          {upload.privacy}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                        <span>Channel: {upload.channel?.title || "Connected Channel"}</span>
                        <span>•</span>
                        <span>{new Date(upload.createdAt).toLocaleString()}</span>
                      </div>

                      {upload.error && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1 pt-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {upload.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    {upload.youtubeUrl && (
                      <a
                        href={upload.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Globe className="h-3.5 w-3.5 text-red-400" />
                        <span>Watch on YouTube</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {upload.studioUrl && (
                      <a
                        href={upload.studioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow"
                      >
                        <Tv className="h-3.5 w-3.5" />
                        <span>YouTube Studio</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Quick Publish from Library */}
      {activeTab === "quick_publish" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="h-4 w-4 text-violet-400" />
                Select a Video Asset to Publish
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Choose any uploaded or generated clip from your workspace to publish directly to YouTube.
              </p>
            </div>
            <Link
              href="/dashboard/autoclip"
              className="text-xs text-violet-400 hover:underline flex items-center gap-1"
            >
              Go to AutoClip Studio <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {loadingClips ? (
            <div className="p-12 text-center text-neutral-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-violet-500" />
              Loading video assets...
            </div>
          ) : recentClips.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
              <Film className="h-10 w-10 text-neutral-600 mx-auto" />
              <h4 className="text-sm font-semibold text-neutral-300">No video assets found</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Create videos in AutoClip, the AI Generator, or the Video Editor to publish them to YouTube.
              </p>
              <Link
                href="/dashboard/autoclip"
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Open AutoClip Studio
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentClips.map((clip) => (
                <div
                  key={clip.id}
                  className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="relative aspect-video bg-neutral-950 rounded-xl overflow-hidden mb-3 border border-neutral-800 flex items-center justify-center">
                      <video src={clip.url} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-neutral-300">
                        VIDEO
                      </span>
                    </div>

                    <h4 className="font-semibold text-white text-xs truncate mb-1" title={clip.name}>
                      {clip.name}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" /> {(clip.fileSize / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      {clip.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {clip.duration.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">
                      {new Date(clip.createdAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => handleOpenUploadForAsset(clip)}
                      className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                    >
                      <Youtube className="h-3.5 w-3.5" />
                      <span>Publish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide-over Upload Modal */}
      <YouTubeUploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          fetchUploads();
        }}
        videoDetails={selectedVideoDetails}
      />
    </div>
  );
}
