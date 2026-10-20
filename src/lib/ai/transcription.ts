import fs from "fs";
import { execSafeProcess } from "@/lib/video/ffmpeg";

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  duration: number;
  language: string;
  provider: "openai_whisper" | "local_energy_fallback";
  isFallback: boolean;
}

export interface ITranscriptionProvider {
  name: string;
  isAvailable(): boolean;
  transcribe(audioFilePath: string, language?: string): Promise<TranscriptionResult>;
}

/**
 * Real OpenAI Whisper API provider
 */
export class OpenAIWhisperProvider implements ITranscriptionProvider {
  name = "openai_whisper";

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
  }

  async transcribe(audioFilePath: string, language = "en"): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error(
        "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment or Settings."
      );
    }

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at ${audioFilePath}`);
    }

    const fileBuffer = fs.readFileSync(audioFilePath);
    const blob = new Blob([fileBuffer], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    if (language) {
      formData.append("language", language);
    }
    formData.append("timestamp_granularities[]", "segment");
    formData.append("timestamp_granularities[]", "word");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    const segments: TranscriptSegment[] = (data.segments || []).map(
      (s: { id: number; start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }, index: number) => ({
        id: s.id ?? index,
        start: s.start,
        end: s.end,
        text: s.text.trim(),
        words: s.words || [],
      })
    );

    const words: TranscriptWord[] = (data.words || []).map(
      (w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })
    );

    return {
      text: data.text || "",
      segments,
      words,
      duration: data.duration || 0,
      language: data.language || language,
      provider: "openai_whisper",
      isFallback: false,
    };
  }
}

/**
 * Local audio silence/energy speech segmenter
 * Used when no external API key is provided, so that users can still experience
 * the entire AutoClip pipeline end-to-end, with explicit notification.
 */
export class LocalEnergyFallbackProvider implements ITranscriptionProvider {
  name = "local_energy_fallback";

  isAvailable(): boolean {
    return true; // Always available on system with FFmpeg
  }

  async transcribe(audioFilePath: string, language = "en"): Promise<TranscriptionResult> {
    const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

    // Run silencedetect filter: silence of -30dB for at least 0.4 seconds
    const args = [
      "-i",
      audioFilePath,
      "-af",
      "silencedetect=noise=-30dB:d=0.4",
      "-f",
      "null",
      "-",
    ];

    let combinedOutput = "";
    try {
      const { stdout, stderr } = await execSafeProcess(FFMPEG_PATH, args, 180000);
      combinedOutput = stdout + "\n" + stderr;
    } catch (err) {
      combinedOutput = (err as Error).message || "";
    }

    // Extract silence_start and silence_end
    const silenceStarts: number[] = [];
    const silenceEnds: number[] = [];

    const startRegex = /silence_start: ([0-9.]+)/g;
    const endRegex = /silence_end: ([0-9.]+)/g;

    let m: RegExpExecArray | null;
    while ((m = startRegex.exec(combinedOutput)) !== null) {
      silenceStarts.push(parseFloat(m[1]));
    }
    while ((m = endRegex.exec(combinedOutput)) !== null) {
      silenceEnds.push(parseFloat(m[1]));
    }

    // Determine audio duration
    let totalDuration = 60;
    const durMatch = /Duration: ([0-9:.]+)/.exec(combinedOutput);
    if (durMatch) {
      const parts = durMatch[1].split(":").map(Number);
      if (parts.length === 3) {
        totalDuration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    // Build speech intervals between silence intervals
    const speechIntervals: Array<{ start: number; end: number }> = [];
    let curStart = 0;

    for (let i = 0; i < silenceStarts.length; i++) {
      const sStart = silenceStarts[i];
      if (sStart - curStart >= 1.0) {
        speechIntervals.push({ start: curStart, end: sStart });
      }
      curStart = silenceEnds[i] !== undefined ? silenceEnds[i] : sStart + 0.5;
    }

    if (totalDuration - curStart >= 1.0) {
      speechIntervals.push({ start: curStart, end: totalDuration });
    }

    // Subdivide any long speech intervals into natural conversational phrase chunks (3.5s - 5s)
    const refinedIntervals: Array<{ start: number; end: number }> = [];
    for (const raw of speechIntervals) {
      const dur = raw.end - raw.start;
      if (dur > 5.5) {
        const chunkSize = 4.5;
        for (let t = raw.start; t < raw.end; t += chunkSize) {
          const segEnd = Math.min(raw.end, t + chunkSize);
          if (segEnd - t >= 1.0) {
            refinedIntervals.push({ start: t, end: segEnd });
          }
        }
      } else {
        refinedIntervals.push(raw);
      }
    }

    // If still no intervals, chunk whole audio into 4.5s intervals
    if (refinedIntervals.length === 0) {
      const chunk = 4.5;
      for (let t = 0; t < totalDuration; t += chunk) {
        refinedIntervals.push({ start: t, end: Math.min(totalDuration, t + chunk) });
      }
    }

    // Sample descriptive narration templates for offline demonstration
    const samplePhrases = [
      "Here is the single most important secret you need to know.",
      "Most people completely overlook this fundamental truth.",
      "When you look at the top creators, they always start with a hook.",
      "This simple habit changes everything about your daily productivity.",
      "Pay close attention because this concept is rarely discussed.",
      "The result speaks for itself once you apply this technique.",
      "Imagine what happens when you combine consistency with genuine focus.",
      "Make sure to save this and share it with someone who needs it.",
    ];

    const segments: TranscriptSegment[] = refinedIntervals.map((interval, idx) => {
      const phrase = samplePhrases[idx % samplePhrases.length];
      const text = `${phrase} [Segment ${idx + 1}]`;
      const wordsText = text.split(" ");
      const wordDuration = (interval.end - interval.start) / Math.max(1, wordsText.length);

      const words: TranscriptWord[] = wordsText.map((w, wIdx) => ({
        word: w,
        start: interval.start + wIdx * wordDuration,
        end: interval.start + (wIdx + 1) * wordDuration,
      }));

      return {
        id: idx,
        start: Number(interval.start.toFixed(2)),
        end: Number(interval.end.toFixed(2)),
        text,
        words,
      };
    });

    const fullText = segments.map((s) => s.text).join(" ");
    const allWords = segments.flatMap((s) => s.words || []);

    return {
      text: fullText,
      segments,
      words: allWords,
      duration: totalDuration,
      language,
      provider: "local_energy_fallback",
      isFallback: true,
    };
  }
}

/**
 * Returns the best available transcription provider
 */
export function getTranscriptionProvider(): ITranscriptionProvider {
  const whisper = new OpenAIWhisperProvider();
  if (whisper.isAvailable()) {
    return whisper;
  }
  return new LocalEnergyFallbackProvider();
}
