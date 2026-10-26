"use client";

import { useState, useEffect } from "react";
import { Youtube } from "@/components/ui/youtube-icon";
import {
  Tv,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Star,
  RefreshCw,
  Key,
  ShieldCheck,
  Check,
  Info,
  X,
  Copy,
  Settings,
  Sparkles,
  Lock,
} from "lucide-react";

export interface ConnectedChannel {
  id: string;
  channelId: string;
  title: string;
  description?: string | null;
  customUrl?: string | null;
  thumbnailUrl?: string | null;
  subscriberCount?: string | null;
  videoCount?: number | null;
  isDefault: boolean;
  status: string;
  createdAt: string;
  _count?: {
    uploads: number;
  };
}

const PRESET_AVATARS = [
  { label: "Studio Purple", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
  { label: "Dark Mindset", url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80" },
  { label: "Cyber Red", url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80" },
  { label: "Gold Creator", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
];

export default function YouTubeChannelManager() {
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedClientId, setMaskedClientId] = useState("");
  const [redirectUri, setRedirectUri] = useState("http://localhost:3000/api/youtube/callback");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // In-app OAuth credentials modal state
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [inputClientId, setInputClientId] = useState("");
  const [inputClientSecret, setInputClientSecret] = useState("");
  const [savingOAuth, setSavingOAuth] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // In-app Manual Channel Creator modal state
  const [addChannelModalOpen, setAddChannelModalOpen] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState("");
  const [newChannelHandle, setNewChannelHandle] = useState("");
  const [newChannelSubs, setNewChannelSubs] = useState("100K");
  const [newChannelAvatar, setNewChannelAvatar] = useState(PRESET_AVATARS[0].url);
  const [addingChannel, setAddingChannel] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/youtube/config?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.isConfigured);
        setMaskedClientId(data.maskedClientId || "");
        if (data.redirectUri) setRedirectUri(data.redirectUri);
      }
    } catch (err) {
      console.error("Error fetching YouTube config:", err);
    }
  };

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/youtube/channels?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        if (typeof data.isConfigured === "boolean") {
          setIsConfigured(data.isConfigured);
        }
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchConfig();

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("youtube_connected") === "true") {
        const chName = url.searchParams.get("channel_name") || "Your channel";
        setNotification({
          type: "success",
          message: `Successfully connected "${chName}" to ClipForge!`,
        });
        setTimeout(() => setNotification(null), 5000);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (url.searchParams.get("youtube_error")) {
        setNotification({
          type: "error",
          message: url.searchParams.get("youtube_error") || "Failed to connect YouTube channel.",
        });
        setTimeout(() => setNotification(null), 6000);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (url.searchParams.get("youtube_modal") === "setup_needed") {
        setOauthModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2500);
  };

  const handleSaveOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputClientId.trim() || !inputClientSecret.trim()) {
      alert("Please provide both Google Client ID and Google Client Secret.");
      return;
    }

    try {
      setSavingOAuth(true);
      const res = await fetch("/api/youtube/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: inputClientId.trim(),
          clientSecret: inputClientSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save OAuth credentials");
      }

      setIsConfigured(true);
      setMaskedClientId(`${inputClientId.trim().slice(0, 10)}...`);
      setOauthModalOpen(false);
      setInputClientSecret("");
      setNotification({
        type: "success",
        message: "Google OAuth credentials saved! You can now click 'Connect YouTube Channel'.",
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to save credentials");
    } finally {
      setSavingOAuth(false);
    }
  };

  const handleAddCustomChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelTitle.trim()) {
      alert("Please enter a channel name.");
      return;
    }

    try {
      setAddingChannel(true);
      const res = await fetch("/api/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newChannelTitle.trim(),
          customUrl: newChannelHandle.trim()
            ? (newChannelHandle.startsWith("@") ? newChannelHandle.trim() : `@${newChannelHandle.trim()}`)
            : `@${newChannelTitle.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          subscriberCount: newChannelSubs.trim() || "100K",
          thumbnailUrl: newChannelAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create channel");
      }

      setChannels((prev) => [data.channel, ...prev]);
      setAddChannelModalOpen(false);
      setNewChannelTitle("");
      setNewChannelHandle("");
      setNotification({
        type: "success",
        message: `Channel "${data.channel.title}" added to your workspace!`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to add channel");
    } finally {
      setAddingChannel(false);
    }
  };

  const handleSetDefault = async (channelId: string) => {
    try {
      setActionLoadingId(channelId);
      const res = await fetch(`/api/youtube/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) => ({
            ...c,
            isDefault: c.id === channelId,
          }))
        );
        setNotification({
          type: "success",
          message: "Default upload destination updated.",
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDisconnect = async (channel: ConnectedChannel) => {
    if (!confirm(`Are you sure you want to disconnect "${channel.title}"?`)) {
      return;
    }

    try {
      setActionLoadingId(channel.id);
      const res = await fetch(`/api/youtube/channels/${channel.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.id !== channel.id));
        setNotification({
          type: "success",
          message: `Disconnected "${channel.title}".`,
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConnectClick = () => {
    if (isConfigured) {
      window.location.href = "/api/youtube/auth?returnTo=/dashboard/youtube";
    } else {
      setOauthModalOpen(true);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 flex-shrink-0">
            <Youtube className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Connected Channels
              <span className="text-[10px] bg-red-950/60 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-mono">
                {channels.length} {channels.length === 1 ? "Channel" : "Channels"}
              </span>
              {isConfigured ? (
                <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                  <Check className="h-3 w-3" /> OAuth Active
                </span>
              ) : (
                <span className="text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full font-sans">
                  Demo Mode Ready
                </span>
              )}
            </h2>
            <p className="text-[11px] text-neutral-400">
              Manage multiple YouTube destinations, configure API credentials in-app, or connect via Google OAuth.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Connect Button */}
          <button
            type="button"
            onClick={handleConnectClick}
            className="py-2 px-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-red-950/40"
          >
            <Youtube className="h-4 w-4" />
            <span>Connect YouTube Channel</span>
          </button>

          {/* Add Channel Manually Button */}
          <button
            type="button"
            onClick={() => {
              setNewChannelTitle("");
              setNewChannelHandle("");
              setAddChannelModalOpen(true);
            }}
            className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 border border-neutral-700"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Add Channel Manually</span>
          </button>

          {/* Configure OAuth Credentials Button */}
          <button
            type="button"
            onClick={() => setOauthModalOpen(true)}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-medium transition border border-neutral-700"
            title="Configure Google OAuth Credentials In-App"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            notification.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Configuration Status Banner */}
      {!isConfigured && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">
                No Google Cloud Credentials entered yet? No problem.
              </span>
              <p className="text-[11px] text-neutral-400">
                You can <strong className="text-white">Add Channels Manually</strong> right here, or click <strong className="text-amber-300">Paste Google Credentials</strong> to connect directly with your real Google account without touching any files.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setOauthModalOpen(true)}
              className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition"
            >
              Paste Google Credentials
            </button>
          </div>
        </div>
      )}

      {/* Channel Cards Grid */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-neutral-500 text-xs gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-red-500" />
          <span>Loading YouTube channels...</span>
        </div>
      ) : channels.length === 0 ? (
        <div className="p-10 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mx-auto">
            <Tv className="h-7 w-7 text-red-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No YouTube Channels Connected Yet</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Add your first channel below. You can connect via official Google OAuth or create channel profiles directly inside this manager.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleConnectClick}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow shadow-red-600/20"
            >
              <Youtube className="h-4 w-4" />
              <span>Connect with Google</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNewChannelTitle("Main Shorts Channel");
                setNewChannelHandle("@mainshorts");
                setAddChannelModalOpen(true);
              }}
              className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium transition border border-neutral-700 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Add Channel Manually</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 ${
                channel.isDefault
                  ? "bg-neutral-950 border-red-500/40 ring-1 ring-red-500/20 shadow-xl"
                  : "bg-neutral-950/80 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {/* Channel Profile Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700 shadow-sm">
                    {channel.thumbnailUrl ? (
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Tv className="h-5 w-5 text-neutral-400 m-auto mt-3" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs truncate" title={channel.title}>
                        {channel.title}
                      </span>
                      {channel.isDefault && (
                        <span className="text-[9px] bg-red-950 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded-full font-semibold flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block font-mono truncate">
                      {channel.customUrl || channel.channelId}
                    </span>
                  </div>
                </div>

                {/* Disconnect / Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDisconnect(channel)}
                  disabled={actionLoadingId === channel.id}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 transition flex-shrink-0"
                  title="Disconnect channel"
                >
                  {actionLoadingId === channel.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-neutral-800/80">
                <div className="p-2 bg-neutral-900/80 rounded-xl">
                  <span className="text-neutral-500 text-[10px] block">Subscribers</span>
                  <span className="font-semibold text-white">
                    {channel.subscriberCount || "0"}
                  </span>
                </div>
                <div className="p-2 bg-neutral-900/80 rounded-xl">
                  <span className="text-neutral-500 text-[10px] block">Published</span>
                  <span className="font-semibold text-white">
                    {channel._count?.uploads || 0} clips
                  </span>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Active Destination
                </span>

                {!channel.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(channel.id)}
                    disabled={actionLoadingId === channel.id}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <Star className="h-3 w-3 text-amber-400" />
                    <span>Set as Default</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: In-App OAuth Credentials Dialog                                   */}
      {/* ========================================================================= */}
      {oauthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setOauthModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google OAuth Credentials</h3>
                <p className="text-xs text-neutral-400">
                  Paste your Google Cloud keys directly here without opening any files.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveOAuth} className="space-y-4 text-xs">
              {/* Authorized Redirect URI copy box */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Authorized Redirect URI
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRedirect}
                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    {copiedRedirect ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy URI
                      </>
                    )}
                  </button>
                </div>
                <code className="block p-2 bg-neutral-900 rounded font-mono text-[11px] text-amber-300 break-all">
                  {redirectUri}
                </code>
                <span className="text-[10px] text-neutral-500 block">
                  Add this URI to your Google Cloud Console OAuth 2.0 Web Application client.
                </span>
              </div>

              {/* Client ID input */}
              <div className="space-y-1">
                <label className="block text-neutral-300 font-medium">
                  Google Client ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Client Secret input */}
              <div className="space-y-1">
                <label className="block text-neutral-300 font-medium">
                  Google Client Secret <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                  value={inputClientSecret}
                  onChange={(e) => setInputClientSecret(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* 3 Step Helper */}
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1 leading-relaxed">
                <span className="font-semibold text-neutral-300 block">Quick 1-Minute Steps:</span>
                <div>1. In Google Cloud Console, enable <strong>YouTube Data API v3</strong>.</div>
                <div>2. Create OAuth Client ID (Web Application) and add the Redirect URI above.</div>
                <div>3. Paste the Client ID and Secret here and click Save.</div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setOauthModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOAuth}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  {savingOAuth && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save &amp; Apply Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Add Channel Manually (Instant Studio Mode)                        */}
      {/* ========================================================================= */}
      {addChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setAddChannelModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Tv className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add YouTube Channel</h3>
                <p className="text-xs text-neutral-400">
                  Create and manage multiple channel profiles right inside your dashboard.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddCustomChannel} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-neutral-300 font-medium">
                  Channel Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Mindset Shorts"
                  value={newChannelTitle}
                  onChange={(e) => setNewChannelTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-neutral-300 font-medium">Handle / Username</label>
                  <input
                    type="text"
                    placeholder="@dailymindset"
                    value={newChannelHandle}
                    onChange={(e) => setNewChannelHandle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-300 font-medium">Subscribers</label>
                  <input
                    type="text"
                    placeholder="120K"
                    value={newChannelSubs}
                    onChange={(e) => setNewChannelSubs(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2">
                <label className="block text-neutral-300 font-medium">Channel Avatar</label>
                <div className="flex items-center gap-2.5">
                  {PRESET_AVATARS.map((avatar) => (
                    <button
                      key={avatar.label}
                      type="button"
                      onClick={() => setNewChannelAvatar(avatar.url)}
                      className={`h-11 w-11 rounded-full overflow-hidden border-2 transition ${
                        newChannelAvatar === avatar.url
                          ? "border-red-500 ring-2 ring-red-500/30 scale-105"
                          : "border-neutral-700 hover:border-neutral-500 opacity-60 hover:opacity-100"
                      }`}
                      title={avatar.label}
                    >
                      <img src={avatar.url} alt={avatar.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setAddChannelModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingChannel}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  {addingChannel && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Add Channel to Dashboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
