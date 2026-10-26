import { TranscriptSegment } from "../ai/transcription";

/**
 * Parses time string (HH:MM:SS.mmm or MM:SS.mmm) into seconds
 */
function parseVttTimestamp(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

/**
 * Parses a WebVTT (.vtt) file into structured TranscriptSegment array with millisecond precision
 */
export function parseVttToSegments(vttContent: string): TranscriptSegment[] {
  const blocks = vttContent.split(/\n\s*\n/);
  const timeRegex = /([0-9:.]+)\s+-->\s+([0-9:.]+)/;
  const rawCues: Array<{ start: number; end: number; text: string }> = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    let timeLine = "";
    const textLines: string[] = [];

    for (const line of lines) {
      if (timeRegex.test(line)) {
        timeLine = line;
      } else if (
        timeLine &&
        !line.startsWith("WEBVTT") &&
        !line.startsWith("Kind:") &&
        !line.startsWith("Language:") &&
        !line.startsWith("NOTE")
      ) {
        textLines.push(line);
      }
    }

    if (timeLine && textLines.length > 0) {
      const match = timeRegex.exec(timeLine);
      if (match) {
        const start = parseVttTimestamp(match[1]);
        const end = parseVttTimestamp(match[2]);

        // Clean out inline tags like <00:00:01.000><c> and HTML entities
        const cleanText = textLines
          .join(" ")
          .replace(/<[^>]+>/g, "")
          .replace(/&gt;&gt;/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim();

        if (cleanText && end > start) {
          rawCues.push({ start, end, text: cleanText });
        }
      }
    }
  }

  // Deduplicate rolling overlap lines common in YouTube auto-generated captions
  const cleaned: TranscriptSegment[] = [];
  let prevText = "";
  let segId = 1;

  for (const cue of rawCues) {
    if (cue.text === prevText) continue;

    let textToAdd = cue.text;
    if (prevText && cue.text.startsWith(prevText)) {
      const remaining = cue.text.slice(prevText.length).trim();
      if (remaining.length > 0) {
        textToAdd = remaining;
      }
    }

    if (textToAdd) {
      // Split into words for word timing
      const words = textToAdd.split(/\s+/).filter(Boolean);
      const wordDur = (cue.end - cue.start) / Math.max(1, words.length);

      cleaned.push({
        id: segId++,
        start: Number(cue.start.toFixed(2)),
        end: Number(cue.end.toFixed(2)),
        text: textToAdd,
        words: words.map((w, i) => ({
          word: w,
          start: Number((cue.start + i * wordDur).toFixed(2)),
          end: Number((cue.start + (i + 1) * wordDur).toFixed(2)),
        })),
      });

      prevText = cue.text;
    }
  }

  return cleaned;
}
