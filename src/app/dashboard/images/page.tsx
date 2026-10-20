"use client";

import { useState } from "react";
import {
  ImageIcon,
  Sparkles,
  Download,
  Loader2,
  Sliders,
  ExternalLink,
} from "lucide-react";

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"VERTICAL_9_16" | "LANDSCAPE_16_9" | "SQUARE_1_1">("VERTICAL_9_16");
  const [style, setStyle] = useState("cinematic");

  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          style,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");

      setImageUrl(data.imageUrl);
      setProvider(data.provider);
    } catch (e: any) {
      alert(e.message || "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs px-3 py-1 rounded-full mb-2">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Visual Artwork</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">AI Image Generator</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Generate custom backgrounds, character scenes, and thumbnail visuals for your videos.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-400">
            Prompt & Style
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Image Description
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A solitary astronaut standing on the edge of a crystal cliff overlooking a violet nebula..."
                className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-purple-500 placeholder-neutral-500 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                >
                  <option value="VERTICAL_9_16">9:16 Vertical</option>
                  <option value="LANDSCAPE_16_9">16:9 Landscape</option>
                  <option value="SQUARE_1_1">1:1 Square</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                >
                  <option value="cinematic">Cinematic 3D</option>
                  <option value="anime">Anime / Manga</option>
                  <option value="photorealistic">Photorealistic</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Visual Asset...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Image
                </>
              )}
            </button>
          </form>
        </div>

        {/* Output Preview (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          {imageUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {aspectRatio === "VERTICAL_9_16" ? "9:16 Vertical" : "16:9 Landscape"}
                </span>
                {provider && (
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Engine: {provider}
                  </span>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black flex items-center justify-center max-h-[460px]">
                <img
                  src={imageUrl}
                  alt={prompt}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={imageUrl}
                  download="generated-image.jpg"
                  className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Download className="h-4 w-4" /> Download Image
                </a>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Fullscreen
                </a>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
              <ImageIcon className="h-10 w-10 text-neutral-700" />
              <p className="text-xs text-neutral-400">
                Enter your visual description on the left and click &ldquo;Generate Image&rdquo; to create custom artwork.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
