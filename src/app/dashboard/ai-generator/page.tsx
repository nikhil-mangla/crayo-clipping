"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Play,
  Pause,
  Download,
  Film,
  Subtitles,
  Mic,
  Sliders,
  Layers,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface SceneItem {
  id: string;
  order: number;
  narration: string;
  visualPrompt: string;
  duration: number;
  subtitleText: string;
}

export default function AiVideoGeneratorPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Input
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("motivation");
  const [tone, setTone] = useState("engaging");
  const [duration, setDuration] = useState(30);

  // Step 2: Settings
  const [aspectRatio, setAspectRatio] = useState<"VERTICAL_9_16" | "LANDSCAPE_16_9">("VERTICAL_9_16");
  const [voice, setVoice] = useState("alloy");
  const [captionPreset, setCaptionPreset] = useState<"bold_viral" | "electric_violet" | "minimal_clean" | "classic_dark" | "none">("bold_viral");

  // Step 3: Generated Script & Scenes
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [hook, setHook] = useState("");
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [voiceoverAudioUrl, setVoiceoverAudioUrl] = useState<string | null>(null);
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false);

  // Step 4: Rendered Output
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const handleGenerateScript = async () => {
    if (!topic.trim()) return;
    setGeneratingScript(true);

    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          niche,
          tone,
          duration,
          platform: aspectRatio === "VERTICAL_9_16" ? "TIKTOK" : "YOUTUBE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate script");

      setScriptTitle(data.script.title);
      setHook(data.script.hook);
      setScenes(data.script.scenes || []);
      setStep(3);
    } catch (e: any) {
      alert(e.message || "Failed to generate script");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleSynthesizeVoiceover = async () => {
    if (scenes.length === 0) return;
    setGeneratingVoiceover(true);

    const fullNarration = scenes.map((s) => s.narration).join(" ");

    try {
      const res = await fetch("/api/voiceover/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullNarration,
          voice,
          speed: 1.0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voiceover synthesis failed");

      setVoiceoverAudioUrl(data.voiceover.audioUrl);
    } catch (e: any) {
      alert(e.message || "Voiceover synthesis failed");
    } finally {
      setGeneratingVoiceover(false);
    }
  };

  const handleRenderFinalVideo = async () => {
    setRenderingVideo(true);
    setRenderError(null);

    try {
      const res = await fetch("/api/video/render-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: scriptTitle || topic,
          scenes,
          aspectRatio,
          captionPreset,
          audioUrl: voiceoverAudioUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Video rendering failed");

      setRenderedVideoUrl(data.videoUrl);
      setExportId(data.exportId);
      setStep(4);
    } catch (e: any) {
      setRenderError(e.message || "Rendering failed");
    } finally {
      setRenderingVideo(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-3 py-1 rounded-full mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Guided AI Creation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            AI Video Generator
          </h1>
          <p className="text-neutral-400 mt-0.5 text-xs md:text-sm">
            Go from idea to rendered, captioned video in minutes.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                step === s
                  ? "bg-violet-600 text-white font-bold"
                  : step > s
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Idea & Topic */}
      {step === 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Step 1: What is your video about?</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Video Topic or Concept
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 3 psychology tricks that instantly command respect in any conversation..."
              className="w-full p-4 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-neutral-500 leading-relaxed"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Niche</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value="motivation">Motivation & Mindset</option>
                <option value="horror">Horror & Mystery Stories</option>
                <option value="facts">Mind-Blowing Facts</option>
                <option value="reddit">Reddit Storytelling</option>
                <option value="education">Educational & Science</option>
                <option value="gaming">Gaming Clips & Lore</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value="engaging">Engaging & Fast-Paced</option>
                <option value="suspenseful">Suspenseful & Dramatic</option>
                <option value="inspirational">Inspirational & Powerful</option>
                <option value="informative">Informative & Clear</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Target Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value={20}>20 seconds (Ultra-Fast)</option>
                <option value={30}>30 seconds (Optimal Shorts)</option>
                <option value={45}>45 seconds (Balanced Story)</option>
                <option value={60}>60 seconds (Full TikTok)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={!topic.trim()}
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              Continue to Styling <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Platform & Styling */}
      {step === 2 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white">Step 2: Video Configuration & Style</h2>

          <div className="space-y-4">
            <label className="block text-xs font-semibold text-neutral-300">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setAspectRatio("VERTICAL_9_16")}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                  aspectRatio === "VERTICAL_9_16"
                    ? "bg-violet-600/15 border-violet-500 text-white"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <div className="h-10 w-6 border-2 border-current rounded flex items-center justify-center text-[10px] font-mono">
                  9:16
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">9:16 Vertical</h4>
                  <p className="text-xs text-neutral-400">TikTok, Shorts, Reels</p>
                </div>
              </div>

              <div
                onClick={() => setAspectRatio("LANDSCAPE_16_9")}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                  aspectRatio === "LANDSCAPE_16_9"
                    ? "bg-violet-600/15 border-violet-500 text-white"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <div className="h-6 w-10 border-2 border-current rounded flex items-center justify-center text-[10px] font-mono">
                  16:9
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">16:9 Landscape</h4>
                  <p className="text-xs text-neutral-400">YouTube, Facebook</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-violet-400" />
                Narration Voice
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value="alloy">Alloy (Balanced & Confident)</option>
                <option value="echo">Echo (Warm & Narrative)</option>
                <option value="fable">Fable (Expressive & British)</option>
                <option value="onyx">Onyx (Deep & Authoritative)</option>
                <option value="nova">Nova (Energetic Female)</option>
                <option value="shimmer">Shimmer (Clear & Engaging)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <Subtitles className="h-3.5 w-3.5 text-violet-400" />
                Captions Style
              </label>
              <select
                value={captionPreset}
                onChange={(e) => setCaptionPreset(e.target.value as any)}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
              >
                <option value="bold_viral">🔥 Bold Viral (Yellow & White Highlight)</option>
                <option value="electric_violet">⚡ Electric Violet (Brand Neon)</option>
                <option value="minimal_clean">✨ Minimal Clean (Crisp White)</option>
                <option value="classic_dark">⬛ Classic Box (Translucent Dark)</option>
                <option value="none">🚫 No Captions</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold hover:bg-neutral-800 transition"
            >
              Back
            </button>
            <button
              type="button"
              disabled={generatingScript}
              onClick={handleGenerateScript}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-violet-600/20"
            >
              {generatingScript ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Script & Storyboard...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Storyboard
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review Storyboard & Voiceover */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{scriptTitle || "Video Storyboard"}</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Hook: <strong className="text-violet-300">&ldquo;{hook}&rdquo;</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={generatingScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 rounded-lg transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
            </div>

            {/* Scenes Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Scene Flow ({scenes.length} Scenes)
              </h3>

              {scenes.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-violet-400">Scene #{idx + 1}</span>
                    <span className="text-neutral-500 font-mono">{s.duration}s</span>
                  </div>
                  <p className="text-sm text-white font-medium">&ldquo;{s.narration}&rdquo;</p>
                  <p className="text-xs text-neutral-500 italic">Visual: {s.visualPrompt}</p>
                </div>
              ))}
            </div>

            {/* Voiceover Section */}
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Mic className="h-4 w-4 text-violet-400" />
                    AI Narration Audio
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Voice: {voice.toUpperCase()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSynthesizeVoiceover}
                  disabled={generatingVoiceover}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  {generatingVoiceover ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Synthesizing Audio...
                    </>
                  ) : voiceoverAudioUrl ? (
                    "Re-generate Voiceover"
                  ) : (
                    "Synthesize Voiceover"
                  )}
                </button>
              </div>

              {voiceoverAudioUrl && (
                <div className="bg-neutral-950 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <audio src={voiceoverAudioUrl} controls className="w-full h-8" />
                </div>
              )}
            </div>

            {/* Render Button */}
            <div className="pt-4 flex justify-between border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold hover:bg-neutral-800 transition"
              >
                Back
              </button>

              <button
                type="button"
                disabled={renderingVideo}
                onClick={handleRenderFinalVideo}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-violet-600/20"
              >
                {renderingVideo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assembling Video & Burning Subtitles...
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4" />
                    Render Final Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Rendered Output & Download */}
      {step === 4 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="text-center max-w-md mx-auto space-y-2">
            <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Video Rendered Successfully!</h2>
            <p className="text-xs text-neutral-400">
              Your video has been synthesized with narration, scenes, and animated captions.
            </p>
          </div>

          {renderedVideoUrl && (
            <div className="max-w-sm mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
              <video
                src={renderedVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {exportId && (
              <a
                href={`/api/autoclip/download/${exportId}`}
                download
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Download className="h-4 w-4" />
                Download MP4 Video
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setTopic("");
                setRenderedVideoUrl(null);
              }}
              className="w-full sm:w-auto px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              Create Another Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
