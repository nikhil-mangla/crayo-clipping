"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Clock,
  Film,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  type: string;
  status: string;
  duration?: number;
  createdAt: string;
  exports: Array<{ id: string; format: string; resolution: string }>;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full mb-1">
            <Layers className="h-3.5 w-3.5" />
            <span>Project Management</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Project History</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            All your AI video creations, AutoClip highlights, and story timelines.
          </p>
        </div>

        <Link
          href="/dashboard/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-violet-600/20 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> New Project
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-500 text-sm">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-violet-500" />
          Loading your projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-4">
          <Film className="h-12 w-12 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No projects yet</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Get started by launching an AutoClip extraction or AI video generation workflow.
          </p>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition"
          >
            <Sparkles className="h-4 w-4" /> Start Creating
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-950 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                    {proj.type}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      proj.status === "COMPLETED" || proj.status === "READY"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base truncate mb-1" title={proj.title}>
                  {proj.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-2">
                  {proj.duration && (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {proj.duration}s
                    </span>
                  )}
                  {proj.exports?.length > 0 && (
                    <span className="text-violet-400 font-medium">
                      {proj.exports.length} Export{proj.exports.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-neutral-600">
                  {new Date(proj.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  {proj.type === "AUTOCLIP" ? (
                    <Link
                      href={`/dashboard/autoclip/${proj.id}`}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Studio
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/editor"
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Open
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(proj.id)}
                    className="p-1.5 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded transition"
                    title="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
