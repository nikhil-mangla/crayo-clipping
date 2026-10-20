"use client";

import Link from "next/link";
import {
  Sparkles,
  Scissors,
  FileText,
  Mic,
  Subtitles,
  ImageIcon,
  Film,
  ArrowRight,
  Zap,
} from "lucide-react";

const tools = [
  {
    title: "AI Video Generator",
    description: "Generate complete videos from a simple topic or script, with voiceover, visuals, and animated captions.",
    href: "/dashboard/ai-generator",
    icon: Sparkles,
    badge: "Most Popular",
    color: "from-violet-600 to-indigo-600",
  },
  {
    title: "AutoClip (Long to Shorts)",
    description: "Transform podcasts, YouTube videos, and tutorials into viral 9:16 short clips with automatic highlight detection.",
    href: "/dashboard/autoclip",
    icon: Scissors,
    badge: "High Engagement",
    color: "from-blue-600 to-cyan-600",
  },
  {
    title: "AI Script Writer",
    description: "Craft scroll-stopping hooks and full multi-scene scripts for horror, motivation, facts, or gaming niches.",
    href: "/dashboard/scripts",
    icon: FileText,
    badge: "Story Engine",
    color: "from-emerald-600 to-teal-600",
  },
  {
    title: "Voiceover Studio",
    description: "Convert scripts into natural AI narration with multiple voice personalities, pacing control, and preview.",
    href: "/dashboard/voiceover",
    icon: Mic,
    badge: "Audio Studio",
    color: "from-amber-600 to-orange-600",
  },
  {
    title: "Caption Editor",
    description: "Add viral animated karaoke captions with keyword highlighting, bold social presets, and safe-zone alignment.",
    href: "/dashboard/captions",
    icon: Subtitles,
    badge: "Captions",
    color: "from-fuchsia-600 to-pink-600",
  },
  {
    title: "AI Image Generator",
    description: "Generate photorealistic or anime background visuals and scene artwork tailored to your video concept.",
    href: "/dashboard/images",
    icon: ImageIcon,
    badge: "Visuals",
    color: "from-purple-600 to-violet-600",
  },
  {
    title: "Video Editor",
    description: "Full multitrack timeline editor to trim clips, arrange scenes, burn captions, and export high-res MP4s.",
    href: "/dashboard/editor",
    icon: Film,
    badge: "Studio",
    color: "from-rose-600 to-red-600",
  },
];

export default function CreateVideoHubPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-3 py-1 rounded-full mb-2">
          <Zap className="h-3.5 w-3.5" />
          <span>Creator Workflows</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Create New Content</h1>
        <p className="text-neutral-400 mt-1 text-sm md:text-base">
          Choose a creation workflow to transform your ideas into engaging video content.
        </p>
      </div>

      {/* Workflow Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className="group relative bg-neutral-900 border border-neutral-800 hover:border-violet-500/40 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-violet-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow`}
                >
                  <tool.icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-950 border border-neutral-800 px-2.5 py-0.5 rounded-full">
                  {tool.badge}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">
                {tool.title}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {tool.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs font-semibold text-violet-400 group-hover:text-violet-300">
              <span>Launch Tool</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
