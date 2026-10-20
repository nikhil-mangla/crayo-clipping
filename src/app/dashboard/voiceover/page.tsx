"use client";

import { useState } from "react";
import {
  Mic,
  Play,
  Pause,
  Download,
  Loader2,
  Volume2,
  Sliders,
  CheckCircle2,
} from "lucide-react";

const voices = [
  { id: "alloy", name: "Alloy", desc: "Balanced, neutral, versatile" },
  { id: "echo", name: "Echo", desc: "Warm, narrative, smooth" },
  { id: "fable", name: "Fable", desc: "British, expressive, storytelling" },
  { id: "onyx", name: "Onyx", desc: "Deep, masculine, authoritative" },
  { id: "nova", name: "Nova", desc: "Energetic, bright female" },
  { id: "shimmer", name: "Shimmer", desc: "Clear, engaging, educational" },
];

export default function VoiceoverStudioPage() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [speed, setSpeed] = useState(1.0);

  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const handleSynthesize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/voiceover/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice,
          speed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speech synthesis failed");

      setAudioUrl(data.voiceover.audioUrl);
      setDuration(data.voiceover.duration);
      setProvider(data.voiceover.provider);
    } catch (e: any) {
      alert(e.message || "Speech synthesis failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full mb-2">
          <Mic className="h-3.5 w-3.5" />
          <span>Speech Synthesis</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">AI Voiceover Studio</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Convert your text into realistic, expressive AI narration with custom pacing and voice styles.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <form onSubmit={handleSynthesize} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Narration Script Text
            </label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or write the text you want the AI voice to narrate..."
              className="w-full p-4 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-neutral-500 leading-relaxed"
            />
            <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
              <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>Est. Duration: ~{((text.trim().split(/\s+/).filter(Boolean).length / 150) * 60 / speed).toFixed(1)}s</span>
            </div>
          </div>

          {/* Voice Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Select Voice Persona
            </label>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {voices.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    voice === v.id
                      ? "bg-amber-500/15 border-amber-500 text-white"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{v.name}</span>
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-neutral-400">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pacing Speed */}
          <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-950/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-amber-400" /> Speech Rate
              </span>
              <span className="font-mono text-amber-400">{speed}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={generating || !text.trim()}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synthesizing Natural Speech...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Generate Voiceover Audio
              </>
            )}
          </button>
        </form>

        {/* Audio Output Player Card */}
        {audioUrl && (
          <div className="mt-6 pt-6 border-t border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Audio Generated ({duration}s)</span>
              </div>
              {provider && (
                <span className="text-[11px] text-neutral-500 font-mono">
                  Engine: {provider}
                </span>
              )}
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-center gap-4">
              <audio src={audioUrl} controls className="w-full h-9" />
              <a
                href={audioUrl}
                download="voiceover.mp3"
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download MP3
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
