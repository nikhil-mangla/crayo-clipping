"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ArrowRight,
  Share2,
} from "lucide-react";

export default function ScriptWriterPage() {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("motivation");
  const [tone, setTone] = useState("engaging");
  const [duration, setDuration] = useState(45);
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          niche,
          tone,
          duration,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Script generation failed");

      setScript(data.script);
    } catch (e: any) {
      alert(e.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  const copyFullScript = () => {
    if (!script) return;
    const fullText = `Title: ${script.title}\n\nHook:\n${script.hook}\n\nScenes:\n${script.scenes
      .map((s: any, i: number) => `Scene ${i + 1} (${s.duration}s):\n${s.narration}`)
      .join("\n\n")}\n\nCTA: ${script.callToAction}\n\nHashtags: ${script.hashtags.join(" ")}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full mb-2">
          <FileText className="h-3.5 w-3.5" />
          <span>Viral Story Engine</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">AI Script Writer</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Generate scroll-stopping video scripts with psychological hooks, scene pacing, and visual prompts.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-400">
            Script Parameters
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Topic or Story Idea
              </label>
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The mysterious disappearance of the Flannan Isles lighthouse keepers in 1900..."
                className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-neutral-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Niche</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                >
                  <option value="horror">Horror & Mystery</option>
                  <option value="motivation">Motivation</option>
                  <option value="facts">Mind-Blowing Facts</option>
                  <option value="reddit">Reddit Story</option>
                  <option value="education">Educational</option>
                  <option value="gaming">Gaming Lore</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                >
                  <option value="engaging">Fast-Paced</option>
                  <option value="suspenseful">Suspenseful</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="chilling">Chilling / Dark</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                >
                  <option value={30}>30s Short</option>
                  <option value={45}>45s Standard</option>
                  <option value={60}>60s Deep Dive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Script...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Script
                </>
              )}
            </button>
          </form>
        </div>

        {/* Output Panel (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xl">
          {script ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <h3 className="font-bold text-white text-base">{script.title}</h3>
                  <span className="text-[11px] text-neutral-500">
                    Engine: {script.provider}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyFullScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>

                  <Link
                    href={`/dashboard/ai-generator?topic=${encodeURIComponent(script.title)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    Create Video <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Hook Box */}
              <div className="p-3.5 bg-violet-950/20 border border-violet-500/30 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                  Scroll-Stopping Hook
                </span>
                <p className="text-sm text-white font-medium">&ldquo;{script.hook}&rdquo;</p>
              </div>

              {/* Scene Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Scene Breakdown ({script.scenes.length} Scenes)
                </span>

                {script.scenes.map((s: any, idx: number) => (
                  <div
                    key={s.id || idx}
                    className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">Scene #{idx + 1}</span>
                      <span className="text-neutral-500 font-mono">{s.duration}s</span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">{s.narration}</p>
                    <p className="text-[11px] text-neutral-500 italic">Visual: {s.visualPrompt}</p>
                  </div>
                ))}
              </div>

              {/* Footer Meta */}
              <div className="pt-2 border-t border-neutral-800 flex flex-wrap gap-2">
                {script.hashtags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-neutral-950 border border-neutral-800 text-neutral-400 text-[11px] px-2.5 py-1 rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
              <FileText className="h-10 w-10 text-neutral-700" />
              <p className="text-xs text-neutral-400">
                Enter your topic on the left and click &ldquo;Generate Script&rdquo; to create a multi-scene viral video script.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
