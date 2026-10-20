"use client";

import { useState } from "react";
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
  Subtitles,
  Volume2,
} from "lucide-react";

interface TimelineClip {
  id: string;
  title: string;
  duration: number; // in seconds
  color: string;
  type: "video" | "audio" | "subtitle";
}

export default function VideoEditorPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");

  const [clips, setClips] = useState<TimelineClip[]>([
    { id: "1", title: "Scene 1: Hook Opening", duration: 6, color: "bg-violet-600", type: "video" },
    { id: "2", title: "Scene 2: Core Revelation", duration: 10, color: "bg-blue-600", type: "video" },
    { id: "3", title: "Scene 3: Proof & Examples", duration: 8, color: "bg-indigo-600", type: "video" },
    { id: "4", title: "Scene 4: Call to Action", duration: 6, color: "bg-purple-600", type: "video" },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string>("1");

  const totalDuration = clips.reduce((acc, c) => acc + c.duration, 0);
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const handleUpdateDuration = (newDur: number) => {
    if (!selectedClip) return;
    setClips(clips.map((c) => (c.id === selectedClip.id ? { ...c, duration: Math.max(1, newDur) } : c)));
  };

  const handleAddScene = () => {
    const newId = (clips.length + 1).toString();
    setClips([
      ...clips,
      {
        id: newId,
        title: `Scene ${newId}: New Section`,
        duration: 5,
        color: "bg-teal-600",
        type: "video",
      },
    ]);
  };

  const handleDeleteScene = (id: string) => {
    if (clips.length <= 1) return;
    const remaining = clips.filter((c) => c.id !== id);
    setClips(remaining);
    if (selectedClipId === id) {
      setSelectedClipId(remaining[0].id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1 rounded-full mb-1">
            <Film className="h-3.5 w-3.5" />
            <span>Non-Linear Editor</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Timeline Video Editor</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                aspectRatio === "9:16" ? "bg-violet-600 text-white" : "text-neutral-400"
              }`}
            >
              9:16
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("16:9")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                aspectRatio === "16:9" ? "bg-violet-600 text-white" : "text-neutral-400"
              }`}
            >
              16:9
            </button>
          </div>

          <button
            type="button"
            onClick={() => alert("Timeline exported! Check your Downloads or Projects tab.")}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-2 shadow"
          >
            <Download className="h-3.5 w-3.5" /> Export MP4
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Center: Video Preview (8 cols) */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
            {/* Aspect ratio frame simulation */}
            <div
              className={`relative border-2 border-violet-500/80 bg-neutral-950 flex flex-col items-center justify-center p-4 transition-all ${
                aspectRatio === "9:16" ? "h-full aspect-[9/16]" : "w-full h-full"
              }`}
            >
              <div className="h-10 w-10 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center mb-2">
                <Film className="h-5 w-5" />
              </div>
              <p className="text-white text-xs font-bold">{selectedClip?.title}</p>
              <p className="text-neutral-500 text-[10px] mt-0.5">
                Duration: {selectedClip?.duration}s • Format: {aspectRatio}
              </p>

              {/* Subtitle Overlay Simulation */}
              <div className="absolute bottom-6 w-full text-center px-4">
                <span className="bg-black/80 text-yellow-400 text-xs font-black uppercase px-2 py-1 rounded">
                  Dynamic Captions Preview
                </span>
              </div>
            </div>
          </div>

          {/* Player controls */}
          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-8 w-8 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => setPlayheadTime(0)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <span className="text-xs font-mono text-neutral-400">
              <strong className="text-white">{playheadTime.toFixed(1)}s</strong> / {totalDuration}s
            </span>

            <button
              type="button"
              onClick={handleAddScene}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Scene
            </button>
          </div>
        </div>

        {/* Right Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Scene Inspector
          </h2>

          {selectedClip ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Scene Name</label>
                <input
                  type="text"
                  value={selectedClip.title}
                  onChange={(e) =>
                    setClips(
                      clips.map((c) => (c.id === selectedClip.id ? { ...c, title: e.target.value } : c))
                    )
                  }
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={selectedClip.duration}
                  onChange={(e) => handleUpdateDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteScene(selectedClip.id)}
                  disabled={clips.length <= 1}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 border border-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Scene
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">Select a clip on the timeline to edit properties.</p>
          )}
        </div>
      </div>

      {/* Multitrack Timeline */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800">
          <span className="font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-violet-400" />
            Multitrack Timeline
          </span>
          <span className="font-mono text-neutral-500">Total: {totalDuration}s</span>
        </div>

        {/* Tracks */}
        <div className="space-y-3">
          {/* Video Track */}
          <div className="flex items-center gap-3">
            <div className="w-24 text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5 flex-shrink-0">
              <Film className="h-3.5 w-3.5 text-violet-400" /> Video
            </div>
            <div className="flex-1 flex gap-1 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 overflow-x-auto">
              {clips.map((clip) => {
                const widthPercent = (clip.duration / totalDuration) * 100;
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    style={{ width: `${Math.max(15, widthPercent)}%` }}
                    className={`h-12 rounded-lg p-2 flex flex-col justify-between cursor-pointer transition flex-shrink-0 text-white ${
                      clip.color
                    } ${isSelected ? "ring-2 ring-white shadow-lg" : "opacity-85 hover:opacity-100"}`}
                  >
                    <span className="text-[10px] font-bold truncate">{clip.title}</span>
                    <span className="text-[9px] font-mono text-white/80">{clip.duration}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subtitle Track */}
          <div className="flex items-center gap-3">
            <div className="w-24 text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5 flex-shrink-0">
              <Subtitles className="h-3.5 w-3.5 text-yellow-400" /> Captions
            </div>
            <div className="flex-1 flex gap-1 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
              <div className="w-full h-7 bg-yellow-500/20 border border-yellow-500/40 rounded-lg flex items-center px-3 text-[10px] font-mono text-yellow-300">
                Auto-Synced Animated Subtitles (ASS Track)
              </div>
            </div>
          </div>

          {/* Audio Track */}
          <div className="flex items-center gap-3">
            <div className="w-24 text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5 flex-shrink-0">
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> Audio
            </div>
            <div className="flex-1 flex gap-1 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
              <div className="w-full h-7 bg-cyan-500/20 border border-cyan-500/40 rounded-lg flex items-center px-3 text-[10px] font-mono text-cyan-300">
                AI Voiceover & Background Music (48kHz Stereo)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
