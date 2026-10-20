"use client";

import { useUIStore } from "@/stores/ui-store";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  Plus,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CreditCard,
} from "lucide-react";

export default function Header() {
  const { setMobileSidebarOpen } = useUIStore();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 bg-neutral-900/50 backdrop-blur-xl border-b border-neutral-800/50 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/create"
          className="hidden sm:inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create
        </Link>

        <button className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors relative">
          <Bell className="h-5 w-5" />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <div className="h-8 w-8 bg-violet-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
              {initials}
            </div>
            <ChevronDown className="h-4 w-4 text-neutral-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-neutral-800">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-neutral-500 truncate">{userEmail}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Link>
              </div>

              <div className="border-t border-neutral-800 py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
