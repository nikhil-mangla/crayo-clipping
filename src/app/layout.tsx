import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClipForge AI - Forge Viral Content with AI",
  description:
    "AI-powered video creation platform. Transform ideas into viral short-form videos for YouTube Shorts, Instagram Reels, TikTok, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-white antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#262626",
              border: "1px solid #404040",
              color: "#ffffff",
            },
          }}
        />
      </body>
    </html>
  );
}
