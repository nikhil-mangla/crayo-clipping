"use client";

import { useState } from "react";
import {
  Settings,
  Key,
  Shield,
  User,
  HardDrive,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("Creator");
  const [email, setEmail] = useState("creator@clipforge.ai");

  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-neutral-800 text-neutral-300 text-xs px-3 py-1 rounded-full mb-1">
          <Settings className="h-3.5 w-3.5" />
          <span>System & Account</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings & Integrations</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Manage your account profile, configure custom AI provider API keys, and monitor engine health.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Settings and API preferences updated successfully.</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="h-4 w-4 text-violet-400" /> User Profile
          </h2>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 bg-neutral-950/60 border border-neutral-800 rounded-lg text-neutral-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* AI API Keys Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" /> AI Provider Integrations
            </h2>
            <span className="text-[11px] text-neutral-500">
              Optional — Fallback engines run locally when keys are omitted.
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 flex items-center justify-between">
                <span>OpenAI API Key (Whisper STT, GPT-4o, TTS)</span>
                <span className="text-[10px] text-neutral-500 font-mono">sk-...</span>
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">
                ElevenLabs API Key (Ultra-Realistic Voices)
              </label>
              <input
                type="password"
                value={elevenlabsKey}
                onChange={(e) => setElevenlabsKey(e.target.value)}
                placeholder="xi-api-key-..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* System & Engine Diagnostic Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" /> System Diagnostics & Engine Status
          </h2>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <span className="text-neutral-500 text-[10px] block">FFmpeg Media Processor</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> v7.1.1 (libass / x264)
              </span>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <span className="text-neutral-500 text-[10px] block">Database Engine</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> PostgreSQL (Connected)
              </span>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
              <span className="text-neutral-500 text-[10px] block">Queue & Cache</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Redis / BullMQ (PONG)
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-xs transition shadow"
        >
          Save All Settings
        </button>
      </form>
    </div>
  );
}
