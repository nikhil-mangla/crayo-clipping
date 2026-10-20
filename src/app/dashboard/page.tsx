import Link from "next/link";
import { connection } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import {
  Plus,
  Sparkles,
  Scissors,
  FileText,
  Mic,
  ImageIcon,
  Video,
  HardDrive,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const quickActions = [
  {
    href: "/dashboard/create",
    icon: Plus,
    title: "Create Video",
    description: "Start a new AI video project",
    color: "violet",
  },
  {
    href: "/dashboard/autoclip",
    icon: Scissors,
    title: "AutoClip",
    description: "Extract clips from long videos",
    color: "blue",
  },
  {
    href: "/dashboard/scripts",
    icon: FileText,
    title: "Write Script",
    description: "Generate AI-powered scripts",
    color: "emerald",
  },
  {
    href: "/dashboard/voiceover",
    icon: Mic,
    title: "Voiceover",
    description: "Create AI narration",
    color: "amber",
  },
  {
    href: "/dashboard/images",
    icon: ImageIcon,
    title: "Generate Images",
    description: "AI image creation",
    color: "pink",
  },
];

const colorMap: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20",
  blue: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20",
  pink: "bg-pink-500/10 text-pink-400 group-hover:bg-pink-500/20",
};

export default async function DashboardPage() {
  await connection();
  const user = await requireAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user.name?.split(" ")[0] || "Creator"}
        </h1>
        <p className="text-neutral-400 mt-1">
          What would you like to create today?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Video, label: "Videos Created", value: "0", color: "text-violet-400" },
          { icon: HardDrive, label: "Storage Used", value: "0 MB", color: "text-blue-400" },
          { icon: Clock, label: "Export Minutes", value: "0", color: "text-emerald-400" },
          { icon: TrendingUp, label: "This Month", value: "0 videos", color: "text-amber-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-neutral-500">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-5 hover:border-neutral-600 transition-all duration-200"
            >
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                  colorMap[action.color]
                }`}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{action.title}</h3>
              <p className="text-xs text-neutral-500">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-12 text-center">
          <div className="h-16 w-16 bg-neutral-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-300 mb-2">No projects yet</h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
            Create your first AI-powered video to get started. It only takes a few minutes.
          </p>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Video
          </Link>
        </div>
      </div>
    </div>
  );
}
