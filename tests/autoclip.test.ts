import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatAssTime, formatSrtTime, hexToAssColor, generateAssContent, generateSrtContent } from "../src/lib/subtitles/ass-generator";
import { detectCandidateHighlights } from "../src/lib/ai/highlight-detector";

describe("Subtitle Generator Tests", () => {
  test("formatAssTime formats seconds to H:MM:SS.cc", () => {
    assert.equal(formatAssTime(0), "0:00:00.00");
    assert.equal(formatAssTime(65.45), "0:01:05.45");
    assert.equal(formatAssTime(3661.12), "1:01:01.12");
  });

  test("formatSrtTime formats seconds to HH:MM:SS,mmm", () => {
    assert.equal(formatSrtTime(0), "00:00:00,000");
    assert.equal(formatSrtTime(65.456), "00:01:05,456");
    assert.equal(formatSrtTime(3661.123), "01:01:01,123");
  });

  test("hexToAssColor correctly converts RGB hex to ASS BGR format", () => {
    // Pure Red #FF0000 -> BGR &H000000FF
    assert.equal(hexToAssColor("#FF0000"), "&H000000FF");
    // Pure Blue #0000FF -> BGR &H00FF0000
    assert.equal(hexToAssColor("#0000FF"), "&H00FF0000");
    // White #FFFFFF -> &H00FFFFFF
    assert.equal(hexToAssColor("#FFFFFF"), "&H00FFFFFF");
  });

  test("generateAssContent generates valid ASS script structure", () => {
    const segments = [
      { id: 1, start: 2.0, end: 5.5, text: "Here is the key insight." },
    ];
    const ass = generateAssContent(segments, 1.0, { preset: "bold_viral" });
    assert.match(ass, /\[Script Info\]/);
    assert.match(ass, /\[V4\+ Styles\]/);
    assert.match(ass, /\[Events\]/);
    assert.match(ass, /Dialogue: 0,0:00:01\.00,0:00:04\.50/);
    assert.match(ass, /Here is the key/);
  });

  test("generateSrtContent generates standard numbered SRT cues", () => {
    const segments = [
      { id: 1, start: 1.0, end: 4.0, text: "Welcome to ClipForge" },
      { id: 2, start: 4.5, end: 8.0, text: "AI Video Platform" },
    ];
    const srt = generateSrtContent(segments, 0);
    assert.match(srt, /1\n00:00:01,000 --> 00:00:04,000\nWelcome to ClipForge/);
    assert.match(srt, /2\n00:00:04,500 --> 00:00:08,000\nAI Video Platform/);
  });
});

describe("Highlight Detector Algorithm Tests", () => {
  test("detectCandidateHighlights prioritizes high-interest hooks and natural pacing", () => {
    const segments = [
      { id: 1, start: 0, end: 4, text: "Did you know this incredible secret about video editing?" },
      { id: 2, start: 4, end: 8, text: "Most people spend hours rendering manually." },
      { id: 3, start: 8, end: 14, text: "With our automated pipeline, you do it in seconds." },
      { id: 4, start: 14, end: 20, text: "The difference is like night and day." },
    ];

    const candidates = detectCandidateHighlights(segments, 25, {
      minDuration: 10,
      maxDuration: 22,
      targetCount: 2,
    });

    assert.ok(candidates.length > 0, "Should generate at least 1 candidate");
    const topCandidate = candidates[0];
    assert.ok(topCandidate.score >= 70, "Hook segment should score >= 70");
    assert.ok(topCandidate.duration >= 10 && topCandidate.duration <= 22);
    assert.ok(topCandidate.scoreBreakdown.hookScore > 50);
  });
});
