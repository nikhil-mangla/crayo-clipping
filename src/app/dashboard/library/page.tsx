"use client";

import { useState, useEffect } from "react";
import YouTubeUploadModal from "@/components/youtube/upload-modal";
import { Youtube } from "@/components/ui/youtube-icon";
import {
  FolderOpen,
  Film,
  Mic,
  ImageIcon,
  Download,
  Search,
  Loader2,
  HardDrive,
  Clock,
  ExternalLink,
} from "lucide-react";

interface MediaItem {
  id: string;
  name: string;
  type: string;
  fileSize: number;
  duration?: number;
  width?: number;
  height?: number;
  createdAt: string;
  url: string;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedUploadAsset, setSelectedUploadAsset] = useState<MediaItem | null>(null);

  const loadAssets = async (type = "ALL") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/library?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets(selectedType);
  }, [selectedType]);

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full mb-1">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Workspace Cloud</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Media Library</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            All your uploaded footage, generated artwork, and voiceover audio assets.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search media files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-xs focus:ring-1 focus:ring-blue-500"
          />
          <Search className="h-4 w-4 text-neutral-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 text-xs">
        {["ALL", "VIDEO", "IMAGE", "VOICEOVER"].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
              selectedType === t
                ? "bg-blue-600 text-white"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            {t === "ALL" ? "All Files" : `${t.slice(0, 1)}${t.slice(1).toLowerCase()}s`}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500 text-sm">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
          Loading media library...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-2">
          <FolderOpen className="h-10 w-10 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-300">No media assets found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Upload footage in AutoClip, create images in Image Gen, or synthesize voiceovers to populate your library.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="relative aspect-video bg-neutral-950 rounded-xl overflow-hidden mb-3 border border-neutral-800 flex items-center justify-center">
                  {asset.type === "IMAGE" ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : asset.type === "VIDEO" ? (
                    <video src={asset.url} className="w-full h-full object-cover" />
                  ) : (
                    <Mic className="h-8 w-8 text-amber-400" />
                  )}

                  <span className="absolute top-2 left-2 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-neutral-300">
                    {asset.type}
                  </span>
                </div>

                <h4 className="font-semibold text-white text-xs truncate mb-1" title={asset.name}>
                  {asset.name}
                </h4>

                <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" /> {(asset.fileSize / 1024).toFixed(0)} KB
                  </span>
                  {asset.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {asset.duration.toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-[10px] text-neutral-600">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5">
                  {asset.type === "VIDEO" && (
                    <button
                      type="button"
                      onClick={() => setSelectedUploadAsset(asset)}
                      className="p-1.5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded transition flex items-center gap-1"
                      title="Publish to YouTube"
                    >
                      <Youtube className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  )}
                  <a
                    href={asset.url}
                    download
                    className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
                    title="Open Fullscreen"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* YouTube Publishing Slide-over Modal */}
      {selectedUploadAsset && (
        <YouTubeUploadModal
          isOpen={!!selectedUploadAsset}
          onClose={() => setSelectedUploadAsset(null)}
          videoDetails={{
            title: `${selectedUploadAsset.name.replace(/\.[^/.]+$/, "").slice(0, 90)} #Shorts`,
            description: `Original clip published from ClipForge AI Media Library.\n\n#Shorts #Viral #ClipForge`,
            mediaAssetId: selectedUploadAsset.id,
            videoPath: selectedUploadAsset.url,
            tags: ["Shorts", "Viral", "ClipForge"],
          }}
        />
      )}
    </div>
  );
}
