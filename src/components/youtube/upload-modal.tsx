"use client";

import { useState, useEffect } from "react";
import { Youtube } from "@/components/ui/youtube-icon";
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Lock,
  Globe,
  Link2,
  Sparkles,
  Tv,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Music,
} from "lucide-react";

export interface ConnectedChannel {
  id: string;
  channelId: string;
  title: string;
  customUrl?: string | null;
  thumbnailUrl?: string | null;
  subscriberCount?: string | null;
  videoCount?: number | null;
  isDefault: boolean;
  status: string;
}

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoDetails: {
    title: string;
    description?: string;
    candidateId?: string;
    exportId?: string;
    mediaAssetId?: string;
    videoPath?: string;
    tags?: string[];
  };
}

export default function YouTubeUploadModal({
  isOpen,
  onClose,
  videoDetails,
}: UploadModalProps) {
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  // Form states
  const [title, setTitle] = useState(videoDetails.title || "");
  const [description, setDescription] = useState(videoDetails.description || "");
  const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private">("private");
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(videoDetails.tags)
      ? videoDetails.tags.join(", ")
      : "Shorts, Philosophy, Mindset, Motivation, Truth"
  );
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  // Upload execution state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [connectingDemo, setConnectingDemo] = useState(false);

  // Sync form when videoDetails change
  useEffect(() => {
    if (videoDetails.title) {
      setTitle(videoDetails.title.slice(0, 100));
    }
    if (videoDetails.description) {
      setDescription(videoDetails.description.slice(0, 5000));
    }
    if (videoDetails.tags && videoDetails.tags.length > 0) {
      setTagsInput(videoDetails.tags.join(", "));
    }
  }, [videoDetails]);

  // Fetch channels on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchChannels = async () => {
      try {
        setLoadingChannels(true);
        const res = await fetch(`/api/youtube/channels?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          setIsConfigured(data.isConfigured);

          const defaultCh = data.channels?.find((c: ConnectedChannel) => c.isDefault);
          if (defaultCh) {
            setSelectedChannelId(defaultCh.id);
          } else if (data.channels && data.channels.length > 0) {
            setSelectedChannelId(data.channels[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load channels", e);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMagicFill = () => {
    const magicDisclaimer = `Fair Use Notice: This video excerpt has been transformed with 9:16 vertical reframing, color grading, and commentary subtitles under Section 107 of the US Copyright Act 1976 (Fair Use). All rights belong to their respective creators.\n\n#Shorts #Philosophy #Mindset #Truth #Motivation #Trending`;
    setDescription(magicDisclaimer);
  };

  const handleConnectDemo = async () => {
    try {
      setConnectingDemo(true);
      const res = await fetch("/api/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "ClipForge Studio Shorts",
          subscriberCount: "142K",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChannels((prev) => [data.channel, ...prev]);
        setSelectedChannelId(data.channel.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnectingDemo(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedChannelId) {
      alert("Please select a YouTube channel.");
      return;
    }

    if (!title.trim()) {
      alert("Please provide a video title.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(15);
    setUploadStage("Preparing video and connecting to YouTube API...");

    // Simulated progress tick while server uploads to YouTube
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 85) return prev + Math.floor(Math.random() * 8) + 4;
        return prev;
      });
    }, 600);

    try {
      const payload: any = {
        channelId: selectedChannelId,
        candidateId: videoDetails.candidateId,
        exportId: videoDetails.exportId,
        mediaAssetId: videoDetails.mediaAssetId,
        videoPath: videoDetails.videoPath,
        title: title.trim(),
        description: description.trim(),
        privacy,
        tags: tagsInput
          .split(/[,#\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (isScheduled && scheduleDate) {
        payload.scheduledAt = new Date(scheduleDate).toISOString();
      }

      setUploadStage("Streaming video chunks to YouTube Data API v3...");

      const res = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish video to YouTube");
      }

      setUploadProgress(100);
      setUploadStage("Published successfully!");
      setUploadSuccess(data.upload);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadError(err.message || "Failed to upload video to YouTube.");
    } finally {
      setUploading(false);
    }
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-sm">
              <Youtube className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                Publish Directly to YouTube
              </h2>
              <p className="text-[11px] text-neutral-400">
                Native YouTube Data API v3 Outbound Publishing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS VIEW */}
          {uploadSuccess ? (
            <div className="space-y-6 py-4 text-center animate-fade-in">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">Video Published Successfully!</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Your short has been processed by YouTube Data API and assigned a video ID.
                </p>
              </div>

              {/* Published Video Card */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-left max-w-lg mx-auto space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                    {selectedChannel?.thumbnailUrl ? (
                      <img
                        src={selectedChannel.thumbnailUrl}
                        alt={selectedChannel.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Tv className="h-5 w-5 text-neutral-500 m-auto mt-2.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">
                      {uploadSuccess.title}
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Channel: {selectedChannel?.title} • {uploadSuccess.privacy.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-300">
                  <span className="truncate max-w-[280px]">{uploadSuccess.youtubeUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(uploadSuccess.youtubeUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1 transition"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* YouTube Processing Quality & Audio Tip */}
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-left max-w-lg mx-auto space-y-1.5 text-[11px] text-neutral-400">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Clock className="h-3.5 w-3.5" />
                  <span>YouTube HD &amp; 2K Processing Status</span>
                </div>
                <p className="leading-relaxed">
                  YouTube initially displays 360p/SD during the first 2-5 minutes while its cloud transcoders finalize the razor-sharp <strong>1080p / 2K VP9</strong> version in the background. Full Ultra-HD playback will activate automatically shortly.
                </p>
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold pt-1">
                  <Music className="h-3.5 w-3.5" />
                  <span>YouTube Shorts Audio Library Tip</span>
                </div>
                <p className="leading-relaxed">
                  If you published without background music or want extra viral discovery, open this Short in the YouTube mobile app and tap <strong>&ldquo;Add Sound&rdquo;</strong> to attach trending licensed music from the YouTube Shorts sound feed!
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-2">
                <a
                  href={uploadSuccess.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-red-600/20"
                >
                  <Youtube className="h-4 w-4 fill-current" />
                  Watch on YouTube
                </a>

                {uploadSuccess.studioUrl && (
                  <a
                    href={uploadSuccess.studioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-neutral-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in YouTube Studio
                  </a>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-neutral-400 hover:text-white underline"
                >
                  Close &amp; Return to Studio
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Banner if upload failed */}
              {uploadError && (
                <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Upload Failed</span>
                    <span>{uploadError}</span>
                  </div>
                </div>
              )}

              {/* Channel Selector Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Tv className="h-3.5 w-3.5 text-red-500" />
                    Target YouTube Channel
                  </label>
                  <a
                    href="/dashboard/settings"
                    target="_blank"
                    className="text-[11px] text-violet-400 hover:underline flex items-center gap-1"
                  >
                    Manage Channels <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {loadingChannels ? (
                  <div className="h-14 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-center text-neutral-500 text-xs gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    <span>Loading connected channels...</span>
                  </div>
                ) : channels.length === 0 ? (
                  /* NO CHANNELS CONNECTED STATE */
                  <div className="bg-neutral-950/80 border border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        No YouTube Channel Connected
                      </span>
                      <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                        Connect your YouTube channel via Google OAuth 2.0 to publish videos directly from ClipForge.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                      <a
                        href="/api/youtube/auth"
                        className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow"
                      >
                        <Youtube className="h-4 w-4 fill-current" />
                        Connect Google Account
                      </a>

                      <button
                        type="button"
                        onClick={handleConnectDemo}
                        disabled={connectingDemo}
                        className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
                      >
                        {connectingDemo ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        <span>Connect Test Channel (Instant)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CHANNEL SELECTOR DROPDOWN */
                  <div className="relative">
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      disabled={uploading}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.title} {ch.subscriberCount ? `(${ch.subscriberCount} subs)` : ""} {ch.isDefault ? "• [Default]" : ""}
                        </option>
                      ))}
                    </select>

                    {/* Selected channel preview badge */}
                    {selectedChannel && (
                      <div className="mt-2 p-2 bg-neutral-950/60 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                            {selectedChannel.thumbnailUrl ? (
                              <img
                                src={selectedChannel.thumbnailUrl}
                                alt={selectedChannel.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Tv className="h-3.5 w-3.5 text-neutral-400 m-auto mt-1.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white text-[11px] block">
                              {selectedChannel.title}
                            </span>
                            <span className="text-[10px] text-neutral-400 block font-mono">
                              {selectedChannel.customUrl || selectedChannel.channelId}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] bg-red-950/50 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-mono">
                          {selectedChannel.subscriberCount || "0"} Subscribers
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Title Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-white">Video Title</label>
                  <span
                    className={`font-mono text-[10px] ${
                      title.length > 90 ? "text-amber-400 font-bold" : "text-neutral-500"
                    }`}
                  >
                    {title.length} / 100
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  maxLength={100}
                  disabled={uploading}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Brutal Truth About Discipline | Powerful Insight #Shorts"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-white">Description</label>
                    <button
                      type="button"
                      onClick={handleMagicFill}
                      className="text-[10px] bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium transition flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-violet-400" />
                      Insert Fair Use Notice
                    </button>
                  </div>
                  <span
                    className={`font-mono text-[10px] ${
                      description.length > 4800 ? "text-amber-400 font-bold" : "text-neutral-500"
                    }`}
                  >
                    {description.length} / 5,000
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  maxLength={5000}
                  disabled={uploading}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add your transformative commentary, Section 107 legal notice, and hashtags..."
                  className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 leading-relaxed font-sans"
                />
              </div>

              {/* Privacy Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">Privacy Status</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    {
                      id: "private",
                      label: "Private",
                      desc: "Only you can view",
                      icon: Lock,
                      recommended: true,
                    },
                    {
                      id: "unlisted",
                      label: "Unlisted",
                      desc: "Anyone with link",
                      icon: Link2,
                    },
                    {
                      id: "public",
                      label: "Public",
                      desc: "Live in Shorts feed",
                      icon: Globe,
                    },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = privacy === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={uploading}
                        onClick={() => setPrivacy(p.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-red-950/20 border-red-500 text-white ring-1 ring-red-500/30"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-red-500" : "text-neutral-500"}`} />
                          {p.recommended && (
                            <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">
                              Safest
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold block text-xs">{p.label}</span>
                          <span className="text-[10px] text-neutral-500 block leading-tight">{p.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  disabled={uploading}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Shorts, Philosophy, Mindset, Motivation, Stoicism"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                />
              </div>

              {/* Scheduled Publish Toggle */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    Schedule Publishing Date &amp; Time
                  </label>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    disabled={uploading}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 rounded accent-red-600 bg-neutral-900 border-neutral-700 cursor-pointer"
                  />
                </div>

                {isScheduled && (
                  <div className="pt-2 border-t border-neutral-800 animate-fade-in">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      disabled={uploading}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Video will upload as Private and automatically transition to Public at this scheduled time.
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar if active */}
              {uploading && (
                <div className="p-3.5 bg-neutral-950 border border-red-500/30 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                      {uploadStage}
                    </span>
                    <span className="font-mono text-red-400 font-bold">{uploadProgress}%</span>
                  </div>

                  <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all duration-300 rounded-full shadow-lg shadow-red-600/50"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!uploadSuccess && (
          <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={onClose}
              className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={uploading || !selectedChannelId || !title.trim() || channels.length === 0}
              onClick={handlePublish}
              className="py-2.5 px-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-red-600/30"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading to YouTube ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Publish to YouTube</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
