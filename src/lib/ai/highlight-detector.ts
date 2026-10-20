import { TranscriptSegment } from "./transcription";

export interface CandidateClipProposal {
  startTime: number;
  endTime: number;
  duration: number;
  title: string;
  transcriptSnippet: string;
  score: number; // 0 - 100
  scoreBreakdown: {
    hookScore: number;
    pacingScore: number;
    coherenceScore: number;
    sceneScore: number;
    overallScore: number;
    explanation: string;
  };
  matchingSegments: TranscriptSegment[];
}

export interface HighlightDetectorOptions {
  minDuration?: number; // default 15s
  maxDuration?: number; // default 60s
  targetCount?: number; // default 3 - 5
  sceneCuts?: number[]; // timestamps of visual scene changes
}

const HOOK_KEYWORDS = [
  "secret",
  "truth",
  "nobody",
  "never",
  "always",
  "mistake",
  "stop",
  "why",
  "how",
  "what if",
  "imagine",
  "listen",
  "crucial",
  "important",
  "best",
  "worst",
  "incredible",
  "insane",
  "actually",
  "proven",
  "shocking",
  "rules",
  "hack",
  "formula",
];

const QUESTION_STARTERS = [
  "why",
  "how",
  "what",
  "who",
  "when",
  "where",
  "have you ever",
  "did you know",
  "do you want",
];

/**
 * Calculates hook strength of a text snippet (0 - 100)
 */
function evaluateHook(text: string): { score: number; reason: string } {
  const lower = text.toLowerCase().trim();
  let score = 40; // baseline
  const reasons: string[] = [];

  // Check question start
  for (const qs of QUESTION_STARTERS) {
    if (lower.startsWith(qs)) {
      score += 25;
      reasons.push("Starts with an engaging question");
      break;
    }
  }

  // Count hook keywords
  let hookMatches = 0;
  for (const kw of HOOK_KEYWORDS) {
    if (lower.includes(kw)) {
      hookMatches++;
    }
  }

  if (hookMatches > 0) {
    const boost = Math.min(30, hookMatches * 10);
    score += boost;
    reasons.push(`Contains high-interest terms (${hookMatches} found)`);
  }

  // Check exclamatory or question punctuation
  if (text.includes("?") || text.includes("!")) {
    score += 10;
    reasons.push("Dynamic punctuation detected");
  }

  return {
    score: Math.min(98, Math.max(20, score)),
    reason: reasons.length > 0 ? reasons.join("; ") : "Moderate introductory tone",
  };
}

/**
 * Calculates speech pacing based on words per minute (WPM)
 */
function evaluatePacing(text: string, durationSec: number): { score: number; wpm: number } {
  if (durationSec <= 0) return { score: 50, wpm: 0 };
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wpm = (words.length / durationSec) * 60;

  // Ideal conversational/educational video WPM is 130 - 170
  let score = 85;
  if (wpm >= 120 && wpm <= 180) {
    score = 95;
  } else if (wpm >= 100 && wpm < 120) {
    score = 80;
  } else if (wpm > 180 && wpm <= 220) {
    score = 80;
  } else if (wpm < 80) {
    score = 50; // Too slow or silent
  } else {
    score = 60; // Too fast
  }

  return { score, wpm: Math.round(wpm) };
}

/**
 * Evaluates whether boundaries start and end naturally at sentence edges
 */
function evaluateCoherence(firstSeg: TranscriptSegment, lastSeg: TranscriptSegment): number {
  let score = 75;

  const firstText = firstSeg.text.trim();
  const lastText = lastSeg.text.trim();

  // Starts with capital letter
  if (/^[A-Z]/.test(firstText)) {
    score += 12;
  }

  // Ends with sentence terminal (. ! ?)
  if (/[.!?]$/.test(lastText)) {
    score += 13;
  }

  return Math.min(100, score);
}

/**
 * Evaluates proximity to visual scene cuts
 */
function evaluateSceneHarmony(start: number, end: number, sceneCuts: number[]): number {
  if (sceneCuts.length === 0) return 70; // Neutral if no scene cuts available

  let minStartDist = 999;
  let minEndDist = 999;

  for (const cut of sceneCuts) {
    minStartDist = Math.min(minStartDist, Math.abs(start - cut));
    minEndDist = Math.min(minEndDist, Math.abs(end - cut));
  }

  let score = 60;
  if (minStartDist <= 1.0) score += 20; // Aligns with cut at start
  if (minEndDist <= 1.0) score += 20;   // Aligns with cut at end

  return Math.min(100, score);
}

/**
 * Generate a smart social-ready title for the candidate clip
 */
function generateClipTitle(text: string, index: number): string {
  const clean = text.replace(/\[.*?\]/g, "").trim();
  const sentences = clean.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);

  if (sentences.length > 0) {
    const first = sentences[0];
    if (first.length <= 45) {
      return first;
    }
    // Truncate to first meaningful phrase
    const words = first.split(" ").slice(0, 7).join(" ");
    return words + "...";
  }

  return `Highlight Clip #${index + 1}`;
}

/**
 * Analyzes transcript segments and visual scene changes to identify candidate highlights
 */
export function detectCandidateHighlights(
  segments: TranscriptSegment[],
  totalDuration: number,
  options: HighlightDetectorOptions = {}
): CandidateClipProposal[] {
  const minDuration = options.minDuration || 15;
  const maxDuration = Math.min(options.maxDuration || 60, totalDuration);
  const targetCount = options.targetCount || 4;
  const sceneCuts = options.sceneCuts || [];

  if (segments.length === 0) {
    // If no segments, propose simple sliced chunks of the video
    const chunk = Math.max(minDuration, Math.min(maxDuration, totalDuration / targetCount));
    const proposals: CandidateClipProposal[] = [];
    for (let t = 0; t + minDuration <= totalDuration && proposals.length < targetCount; t += chunk) {
      const end = Math.min(totalDuration, t + chunk);
      proposals.push({
        startTime: Number(t.toFixed(2)),
        endTime: Number(end.toFixed(2)),
        duration: Number((end - t).toFixed(2)),
        title: `Clip Segment ${proposals.length + 1}`,
        transcriptSnippet: "Video highlight section",
        score: 75,
        scoreBreakdown: {
          hookScore: 70,
          pacingScore: 75,
          coherenceScore: 75,
          sceneScore: 75,
          overallScore: 75,
          explanation: "Automated segment boundary based on media timing",
        },
        matchingSegments: [],
      });
    }
    return proposals;
  }

  const candidates: CandidateClipProposal[] = [];

  // Sliding window approach across transcript segments
  for (let i = 0; i < segments.length; i++) {
    const startSeg = segments[i];
    const startTime = startSeg.start;

    for (let j = i; j < segments.length; j++) {
      const endSeg = segments[j];
      const endTime = endSeg.end;
      const duration = endTime - startTime;

      if (duration < minDuration) continue;
      if (duration > maxDuration) break; // Exceeded max duration for this start window

      const matchingSegs = segments.slice(i, j + 1);
      const combinedText = matchingSegs.map((s) => s.text).join(" ");

      const hookEval = evaluateHook(matchingSegs[0].text);
      const pacingEval = evaluatePacing(combinedText, duration);
      const coherence = evaluateCoherence(startSeg, endSeg);
      const sceneScore = evaluateSceneHarmony(startTime, endTime, sceneCuts);

      // Duration factor: favors 25s - 45s optimal short-form window
      let durationFactor = 1.0;
      if (duration >= 20 && duration <= 45) {
        durationFactor = 1.05;
      } else if (duration < 18) {
        durationFactor = 0.92;
      }

      const weighted =
        0.35 * hookEval.score +
        0.25 * pacingEval.score +
        0.25 * coherence +
        0.15 * sceneScore;

      const overall = Math.min(99, Math.round(weighted * durationFactor));

      candidates.push({
        startTime: Number(startTime.toFixed(2)),
        endTime: Number(endTime.toFixed(2)),
        duration: Number(duration.toFixed(2)),
        title: generateClipTitle(combinedText, candidates.length),
        transcriptSnippet: combinedText,
        score: overall,
        scoreBreakdown: {
          hookScore: hookEval.score,
          pacingScore: pacingEval.score,
          coherenceScore: coherence,
          sceneScore,
          overallScore: overall,
          explanation: `Pacing: ${pacingEval.wpm} WPM. ${hookEval.reason}. Boundary alignment: ${coherence}%. Note: Score is an algorithmic estimate.`,
        },
        matchingSegments: matchingSegs,
      });
    }
  }

  // Safety fallback if no combination satisfied the strict duration filter
  if (candidates.length === 0) {
    const chunk = Math.max(8, Math.min(maxDuration, totalDuration / Math.max(1, targetCount)));
    for (let t = 0; t < totalDuration && candidates.length < targetCount; t += chunk) {
      const end = Math.min(totalDuration, t + chunk);
      if (end - t >= 5) {
        const matching = segments.filter((s) => s.end >= t && s.start <= end);
        candidates.push({
          startTime: Number(t.toFixed(2)),
          endTime: Number(end.toFixed(2)),
          duration: Number((end - t).toFixed(2)),
          title: `Highlight Segment ${candidates.length + 1}`,
          transcriptSnippet: matching.map((s) => s.text).join(" ") || "Video highlight segment",
          score: 80,
          scoreBreakdown: {
            hookScore: 78,
            pacingScore: 82,
            coherenceScore: 80,
            sceneScore: 75,
            overallScore: 80,
            explanation: "Fallback segment boundary aligned with video timeline",
          },
          matchingSegments: matching,
        });
      }
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Pick non-overlapping top candidates (allow slight overlap < 30%)
  const selected: CandidateClipProposal[] = [];

  for (const cand of candidates) {
    if (selected.length >= targetCount) break;

    // Check overlap with already selected
    const overlaps = selected.some((s) => {
      const maxStart = Math.max(s.startTime, cand.startTime);
      const minEnd = Math.min(s.endTime, cand.endTime);
      const overlapDuration = Math.max(0, minEnd - maxStart);
      return overlapDuration > cand.duration * 0.35;
    });

    if (!overlaps) {
      selected.push(cand);
    }
  }

  // If we couldn't get enough non-overlapping, fill with remaining best
  if (selected.length < targetCount) {
    for (const cand of candidates) {
      if (selected.length >= targetCount) break;
      if (!selected.includes(cand)) {
        selected.push(cand);
      }
    }
  }

  // Sort selected clips chronologically by start time for creator convenience
  selected.sort((a, b) => a.startTime - b.startTime);

  return selected;
}
