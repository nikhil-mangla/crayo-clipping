"use client";

import { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  HardDrive,
  Video,
  ArrowRight,
} from "lucide-react";

const plans = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    features: [
      "3 AI Videos / month",
      "AutoClip up to 10 min source videos",
      "720p HD exports",
      "Standard voiceovers",
      "2GB cloud storage",
    ],
  },
  {
    id: "CREATOR",
    name: "Creator",
    price: 19,
    popular: false,
    features: [
      "30 AI Videos / month",
      "AutoClip up to 45 min source videos",
      "1080p Full HD vertical exports",
      "All AI voices & speeds",
      "20GB cloud storage",
      "Custom brand watermarks",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 49,
    popular: true,
    features: [
      "100 AI Videos / month",
      "AutoClip unlimited video duration",
      "Priority background rendering",
      "4K Ultra HD exports",
      "100GB cloud storage",
      "All animated caption presets",
      "Direct SRT & VTT downloads",
    ],
  },
  {
    id: "TEAM",
    name: "Team",
    price: 99,
    popular: false,
    features: [
      "Unlimited AI Video generation",
      "5 Team member seats",
      "Shared media workspace",
      "500GB cloud storage",
      "Dedicated rendering worker",
      "Custom branding & priority support",
    ],
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("PRO");
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = (planId: string) => {
    setUpgrading(true);
    setTimeout(() => {
      setCurrentPlan(planId);
      setUpgrading(false);
      alert(`Plan updated to ${planId}! Subscription status is active.`);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full mb-1">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Plans & Usage</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Billing & Subscriptions</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Manage your subscription tier, render quotas, and monthly usage metrics.
        </p>
      </div>

      {/* Current Usage Metrics */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Current Plan
            </span>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
              <span>{currentPlan} Plan</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Active
              </span>
            </h3>
          </div>

          <div className="text-right">
            <span className="text-xs text-neutral-400">Renews on</span>
            <p className="text-xs font-semibold text-white">Next Month</p>
          </div>
        </div>

        {/* Meters */}
        <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-800 text-xs">
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Video className="h-3.5 w-3.5 text-violet-400" /> Videos Created
              </span>
              <span className="font-mono text-white">8 / 100</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-violet-500 h-full w-[8%]" />
            </div>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-blue-400" /> Export Minutes
              </span>
              <span className="font-mono text-white">14 / 300 min</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[5%]" />
            </div>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
            <div className="flex justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" /> Storage Used
              </span>
              <span className="font-mono text-white">1.8 / 100 GB</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[2%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Tiers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              className={`relative bg-neutral-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                p.popular
                  ? "border-violet-500 ring-1 ring-violet-500/30 shadow-xl"
                  : "border-neutral-800"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              )}

              <div>
                <h4 className="text-base font-bold text-white mb-1">{p.name}</h4>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-white">${p.price}</span>
                  <span className="text-xs text-neutral-500">/month</span>
                </div>

                <ul className="space-y-2 text-xs text-neutral-400">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  disabled={isCurrent || upgrading}
                  onClick={() => handleUpgrade(p.id)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
                    isCurrent
                      ? "bg-neutral-800 text-neutral-500 cursor-default"
                      : p.popular
                      ? "bg-violet-600 hover:bg-violet-500 text-white shadow"
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                  }`}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
