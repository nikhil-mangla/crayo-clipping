"use client";

import { useState } from "react";
import {
  Subtitles,
  Download,
  Sliders,
  Type,
  Palette,
  Sparkles,
  Check,
} from "lucide-react";

export default function CaptionsEditorPage() {
  const [text, setText] = useState(
    "Stop scrolling. If you want to grow your audience, here is the secret most people overlook."
  );
  const [preset, setPreset] = useState<"bold_viral" | "electric_violet" | "minimal_clean" | "classic_dark">("bold_viral");
  const [fontSize, setFontSize] = useState(36);
  const [position, setPosition] = useState<"bottom" | "center" | "top">("bottom");
  const [highlightKeyword, setHighlightKeyword] = useState("secret");

  const downloadSrt = () => {
    const srt = `1\n00:00:00,000 --> 00:00:02,500\nStop scrolling.\n\n2\n00:00:02,500 --> 00:00:05,800\nIf you want to grow your audience,\n\n3\n00:00:05,800 --> 00:00:09,500\nhere is the ${highlightKeyword.toUpperCase()} most people overlook.`;

    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captions.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs px-3 py-1 rounded-full mb-2">
          <Subtitles className="h-3.5 w-3.5" />
          <span>Karaoke Subtitles</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Animated Caption Studio</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Style, animate, and export high-impact subtitles tailored for TikTok, Shorts, and Reels safe zones.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Controls (6 cols) */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-400">
            Caption Settings
          </h2>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Sample Subtitle Text
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Style Preset
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "bold_viral", label: "🔥 Bold Viral (Yellow/Black)" },
                { id: "electric_violet", label: "⚡ Electric Violet (Brand)" },
                { id: "minimal_clean", label: "✨ Minimal Clean (White)" },
                { id: "classic_dark", label: "⬛ Classic Dark Box" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as any)}
                  className={`p-3 rounded-xl border text-left transition font-medium ${
                    preset === p.id
                      ? "bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-300"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Font Size</label>
              <input
                type="range"
                min="24"
                max="54"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-fuchsia-500"
              />
              <span className="text-[11px] text-neutral-500 font-mono">{fontSize}px</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Vertical Placement
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as any)}
                className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value="bottom">Bottom Safe Zone</option>
                <option value="center">Center Stage</option>
                <option value="top">Top Header</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Highlighted Keyword
            </label>
            <input
              type="text"
              value={highlightKeyword}
              onChange={(e) => setHighlightKeyword(e.target.value)}
              placeholder="Word to emphasize with accent color..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
            />
          </div>

          <button
            type="button"
            onClick={downloadSrt}
            className="w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow"
          >
            <Download className="h-4 w-4" /> Download .SRT Subtitle File
          </button>
        </div>

        {/* Live 9:16 Preview (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[280px] aspect-[9/16] bg-neutral-950 rounded-3xl border-4 border-neutral-800 shadow-2xl overflow-hidden flex flex-col justify-between p-4">
            {/* Top Bar */}
            <div className="text-[10px] text-neutral-500 font-mono text-center">
              9:16 Mobile View
            </div>

            {/* Subtitle Box Positioned */}
            <div
              className={`w-full text-center px-2 transition-all ${
                position === "top"
                  ? "mt-4"
                  : position === "center"
                  ? "my-auto"
                  : "mb-8"
              }`}
            >
              <div
                style={{ fontSize: `${fontSize * 0.55}px` }}
                className={`font-black leading-tight uppercase tracking-tight transition-all ${
                  preset === "bold_viral"
                    ? "text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
                    : preset === "electric_violet"
                    ? "text-violet-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
                    : preset === "minimal_clean"
                    ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    : "bg-black/75 text-white px-3 py-2 rounded-xl border border-neutral-700 inline-block"
                }`}
              >
                {text.split(" ").map((w, idx) => {
                  const isHighlighted = w.toLowerCase().includes(highlightKeyword.toLowerCase());
                  return (
                    <span
                      key={idx}
                      className={
                        isHighlighted
                          ? preset === "bold_viral"
                            ? "text-white underline decoration-yellow-400"
                            : "text-yellow-300"
                          : ""
                      }
                    >
                      {w}{" "}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom Safe Zone Indicator */}
            <div className="h-10 border-t border-dashed border-red-500/30 flex items-center justify-center text-[9px] text-red-400 font-mono">
              TikTok / Reels UI Safe Zone
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
