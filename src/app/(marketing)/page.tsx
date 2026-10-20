import Link from "next/link";
import {
  Sparkles,
  Scissors,
  FileText,
  Mic,
  Subtitles,
  ImageIcon,
  ArrowRight,
  Play,
  Zap,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Video Generator",
    description: "Transform any idea into a polished video with AI-generated scripts, visuals, and narration.",
  },
  {
    icon: Scissors,
    title: "AutoClip",
    description: "Upload long videos and automatically extract the most engaging short-form clips.",
  },
  {
    icon: FileText,
    title: "Script Writer",
    description: "Generate viral scripts for any niche — horror, motivation, education, gaming, and more.",
  },
  {
    icon: Mic,
    title: "Voiceover Studio",
    description: "Natural-sounding AI narration in multiple voices and languages with speed control.",
  },
  {
    icon: Subtitles,
    title: "Caption Editor",
    description: "Animated word-by-word captions with karaoke highlighting and custom styling.",
  },
  {
    icon: ImageIcon,
    title: "Image Generator",
    description: "Create stunning AI-generated backgrounds and scene visuals for your videos.",
  },
];

const steps = [
  { number: "01", title: "Enter Your Idea", description: "Provide a topic, script, or upload existing content." },
  { number: "02", title: "AI Creates Your Video", description: "Our AI generates scripts, visuals, narration, and captions." },
  { number: "03", title: "Export & Share", description: "Download your video optimized for any social platform." },
];

const plans = [
  {
    name: "Free",
    price: "0",
    features: ["3 videos/month", "720p exports", "Basic captions", "2GB storage"],
  },
  {
    name: "Creator",
    price: "19",
    features: ["30 videos/month", "1080p exports", "Advanced captions", "20GB storage", "All voices"],
    popular: false,
  },
  {
    name: "Pro",
    price: "49",
    features: ["100 videos/month", "4K exports", "All features", "100GB storage", "Priority rendering", "AutoClip"],
    popular: true,
  },
  {
    name: "Team",
    price: "99",
    features: ["Unlimited videos", "4K exports", "All features", "500GB storage", "5 team members", "Brand kit"],
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
            <Zap className="h-4 w-4 text-violet-400" />
            <span className="text-sm text-violet-300">AI-Powered Video Creation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Forge Viral Content
            </span>
            <br />
            <span className="text-white">with AI</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
            Create stunning short-form videos for YouTube Shorts, Instagram Reels, TikTok, 
            and more. From idea to export in minutes, not hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
            >
              Start Creating Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
            >
              <Play className="h-5 w-5" />
              See How It Works
            </Link>
          </div>

          {/* Platform badges */}
          <div className="mt-16 flex items-center justify-center gap-8 text-neutral-600">
            <span className="text-sm">Optimized for:</span>
            <div className="flex items-center gap-6 text-neutral-500">
              <span className="text-sm font-medium">YouTube</span>
              <span className="text-sm font-medium">TikTok</span>
              <span className="text-sm font-medium">Instagram</span>
              <span className="text-sm font-medium">Facebook</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Create
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              A complete suite of AI-powered tools for modern content creators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-violet-500/30 transition-all duration-300"
              >
                <div className="h-12 w-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Three Steps to Viral Content
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-6xl font-bold text-violet-500/20 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-neutral-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-neutral-400 text-lg">Start free, scale as you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-neutral-900/50 border rounded-2xl p-6 ${
                  plan.popular
                    ? "border-violet-500 ring-1 ring-violet-500/20"
                    : "border-neutral-800"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  {plan.price !== "0" && <span className="text-neutral-500">/mo</span>}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-neutral-400">
                      <CheckCircle className="h-4 w-4 text-violet-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? "bg-violet-600 hover:bg-violet-700 text-white"
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-neutral-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Forge Your Content?
          </h2>
          <p className="text-neutral-400 text-lg mb-8">
            Join thousands of creators using AI to produce engaging videos faster.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
          >
            Start Creating Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
