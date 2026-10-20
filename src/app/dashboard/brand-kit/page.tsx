"use client";

import { useState } from "react";
import {
  Palette,
  Sparkles,
  Upload,
  CheckCircle2,
  Sliders,
  Type,
  Shield,
} from "lucide-react";

export default function BrandKitPage() {
  const [brandName, setBrandName] = useState("My Creator Brand");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [accentColor, setAccentColor] = useState("#38bdf8");
  const [headingFont, setHeadingFont] = useState("Inter");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkText, setWatermarkText] = useState("@mybrand");
  const [watermarkOpacity, setWatermarkOpacity] = useState(60);

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
        <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs px-3 py-1 rounded-full mb-2">
          <Palette className="h-3.5 w-3.5" />
          <span>Brand Identity</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Brand Kit Studio</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Set up consistent colors, fonts, watermarks, and outro branding automatically applied across your video projects.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Brand settings successfully saved!</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
            Brand / Channel Name
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm"
          />
        </div>

        {/* Colors */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Primary Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 bg-transparent cursor-pointer rounded"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-12 bg-transparent cursor-pointer rounded"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-xs uppercase"
              />
            </div>
          </div>
        </div>

        {/* Typography */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-pink-400" /> Default Subtitle Font
          </label>
          <select
            value={headingFont}
            onChange={(e) => setHeadingFont(e.target.value)}
            className="w-full p-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-xs"
          >
            <option value="Inter">Inter (Clean Modern Sans-Serif)</option>
            <option value="Montserrat">Montserrat (Bold Impactful)</option>
            <option value="Impact">Impact (Classic Viral Headline)</option>
            <option value="Arial">Arial (Universal Neutral)</option>
          </select>
        </div>

        {/* Watermark Section */}
        <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                Video Watermark & Handle
              </h4>
              <p className="text-xs text-neutral-400">
                Prevent repost theft by stamping your social handle on rendered clips.
              </p>
            </div>
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
              className="h-4 w-4 accent-violet-600 rounded"
            />
          </div>

          {watermarkEnabled && (
            <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Watermark Handle</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>Opacity</span>
                  <span>{watermarkOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-xl text-xs transition shadow"
        >
          Save Brand Kit Settings
        </button>
      </form>
    </div>
  );
}
