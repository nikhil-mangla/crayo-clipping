import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-violet-500" />
              <span className="text-xl font-bold text-white">ClipForge AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-sm text-neutral-400 hover:text-white transition">
                Features
              </Link>
              <Link href="/pricing" className="text-sm text-neutral-400 hover:text-white transition">
                Pricing
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-neutral-300 hover:text-white transition px-4 py-2"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span className="font-bold text-white">ClipForge AI</span>
              </div>
              <p className="text-sm text-neutral-500">
                AI-powered video creation for modern creators.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><Link href="/features" className="hover:text-neutral-300 transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-neutral-300 transition">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><Link href="/privacy" className="hover:text-neutral-300 transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-neutral-300 transition">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><Link href="/contact" className="hover:text-neutral-300 transition">Contact</Link></li>
                <li><Link href="/docs" className="hover:text-neutral-300 transition">Documentation</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-neutral-800/50 text-center text-sm text-neutral-600">
            © 2024 ClipForge AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
