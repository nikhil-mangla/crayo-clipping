import { z } from "zod";

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================
// Project Schemas
// ============================================

export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["AI_VIDEO", "AUTOCLIP", "VOICEOVER", "SUBTITLE", "IMAGE_GEN", "CUSTOM"]).default("AI_VIDEO"),
  platform: z.enum(["YOUTUBE_SHORTS", "INSTAGRAM_REELS", "TIKTOK", "FACEBOOK_REELS", "YOUTUBE", "CUSTOM"]).default("YOUTUBE_SHORTS"),
  aspectRatio: z.enum(["VERTICAL_9_16", "LANDSCAPE_16_9", "SQUARE_1_1", "PORTRAIT_4_5"]).default("VERTICAL_9_16"),
  duration: z.number().min(5).max(3600).optional(),
  language: z.string().default("en"),
  tone: z.string().optional(),
});

// ============================================
// Script Schemas
// ============================================

export const generateScriptSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").max(500),
  niche: z.string().optional(),
  language: z.string().default("en"),
  duration: z.number().min(15).max(600).default(60),
  audience: z.string().optional(),
  tone: z.string().default("engaging"),
  platform: z.string().default("YOUTUBE_SHORTS"),
  format: z.string().optional(),
  referenceText: z.string().max(5000).optional(),
});

export const scriptSceneSchema = z.object({
  id: z.string(),
  order: z.number(),
  narration: z.string(),
  visualPrompt: z.string(),
  duration: z.number(),
  subtitleText: z.string().optional(),
  transition: z.string().default("fade"),
});

export const scriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  scenes: z.array(scriptSceneSchema),
  outro: z.string().optional(),
  callToAction: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  musicSuggestion: z.string().optional(),
  thumbnailConcept: z.string().optional(),
});

// ============================================
// Voiceover Schemas
// ============================================

export const generateVoiceoverSchema = z.object({
  text: z.string().min(1, "Text is required").max(10000),
  voice: z.string().default("alloy"),
  language: z.string().default("en"),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

// ============================================
// Video Config Schemas
// ============================================

export const videoConfigSchema = z.object({
  platform: z.string(),
  aspectRatio: z.string(),
  duration: z.number().optional(),
  language: z.string().default("en"),
  narrationVoice: z.string().optional(),
  narrationSpeed: z.number().optional(),
  tone: z.string().optional(),
  captionStyle: z.string().default("default"),
  backgroundStyle: z.string().optional(),
  musicTrack: z.string().optional(),
  resolution: z.string().default("1080p"),
  brandKit: z.boolean().default(false),
});

// ============================================
// Caption Schemas
// ============================================

export const captionStyleSchema = z.object({
  fontFamily: z.string().default("Arial"),
  fontSize: z.number().default(48),
  fontWeight: z.string().default("bold"),
  textColor: z.string().default("#FFFFFF"),
  highlightColor: z.string().default("#7C3AED"),
  outlineColor: z.string().default("#000000"),
  outlineWidth: z.number().default(2),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().optional(),
  backgroundColor: z.string().optional(),
  backgroundOpacity: z.number().optional(),
  position: z.enum(["top", "center", "bottom"]).default("bottom"),
  animation: z.enum(["none", "word-highlight", "karaoke", "bounce", "fade"]).default("word-highlight"),
  maxWidth: z.number().default(90), // percentage
  lineHeight: z.number().default(1.2),
});

// ============================================
// Type exports
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;
export type ScriptScene = z.infer<typeof scriptSceneSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type GenerateVoiceoverInput = z.infer<typeof generateVoiceoverSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type CaptionStyle = z.infer<typeof captionStyleSchema>;
