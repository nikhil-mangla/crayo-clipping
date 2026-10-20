"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import {
  LayoutDashboard,
  Plus,
  Sparkles,
  Scissors,
  FileText,
  Mic,
  Subtitles,
  ImageIcon,
  Film,
  FolderOpen,
  Layers,
  Palette,
  Settings,
  CreditCard,
  ChevronLeft,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/create", label: "Create Video", icon: Plus, accent: true },
  { href: "/dashboard/ai-generator", label: "AI Generator", icon: Sparkles },
  { href: "/dashboard/autoclip", label: "AutoClip", icon: Scissors },
  { href: "/dashboard/scripts", label: "Script Writer", icon: FileText },
  { href: "/dashboard/voiceover", label: "Voiceover", icon: Mic },
  { href: "/dashboard/captions", label: "Captions", icon: Subtitles },
  { href: "/dashboard/images", label: "Image Gen", icon: ImageIcon },
  { href: "/dashboard/editor", label: "Video Editor", icon: Film },
  { href: "/dashboard/library", label: "Media Library", icon: FolderOpen },
  { href: "/dashboard/projects", label: "Projects", icon: Layers },
];

const bottomItems = [
  { href: "/dashboard/brand-kit", label: "Brand Kit", icon: Palette },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, setMobileSidebarOpen } = useUIStore();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-neutral-800/50">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="h-6 w-6 text-violet-500 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-white whitespace-nowrap">ClipForge AI</span>
          )}
        </Link>
        <button
          onClick={() => {
            if (mobileSidebarOpen) setMobileSidebarOpen(false);
            else toggleSidebar();
          }}
          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors md:block hidden"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              isActive(item.href)
                ? "bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 ml-[-1px]"
                : item.accent
                ? "text-violet-400 hover:bg-violet-600/10"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
            }`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className={`h-5 w-5 flex-shrink-0 ${item.accent && !isActive(item.href) ? "text-violet-400" : ""}`} />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom Items */}
      <div className="px-3 py-4 border-t border-neutral-800/50 space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive(item.href)
                ? "bg-violet-600/10 text-violet-400"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
            }`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-full bg-neutral-950 border-r border-neutral-800/50 z-30 transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-neutral-950 border-r border-neutral-800/50 animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
