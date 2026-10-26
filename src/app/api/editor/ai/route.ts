import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface EditorAction {
  type:
    | "TRIM_ALL_CLIPS"
    | "TRIM_CLIP"
    | "SPLIT_CLIP"
    | "SET_CLIP_SPEED"
    | "DELETE_CLIP"
    | "CLEAR_TIMELINE"
    | "ADD_SAMPLE_CLIPS"
    | "DELETE_VOICEOVER"
    | "CLEAR_VOICEOVERS"
    | "ADD_VOICEOVER"
    | "SET_VOICEOVER_VOLUME"
    | "SET_MUSIC"
    | "SET_MUSIC_VOLUME"
    | "SET_ASPECT_RATIO"
    | "SET_RESOLUTION"
    | "SET_COLOR_FILTER"
    | "PLAY"
    | "PAUSE"
    | "SEEK"
    | "EXPORT_SEQUENCE";
  payload?: any;
}

export interface TimelineStateContext {
  clipsCount: number;
  totalDuration: number;
  aspectRatio: "9:16" | "16:9";
  resolution: "1080p" | "2k" | "4k";
  selectedMusic: string;
  musicVolume: number;
  videoFilter: string;
  playheadTime: number;
  voiceoversCount: number;
  clips?: Array<{ id: string; title: string; duration: number; speed?: number; startTime?: number }>;
  voiceovers?: Array<{ id: string; title: string; duration: number; volume?: number; startTime?: number }>;
}

// Built-in intelligent NLP compiler: parses natural language instructions deterministically
// Executes immediately with 0ms external latency when Gemini API key is absent or as fallback!
function compileIntentToActions(
  prompt: string,
  state: TimelineStateContext
): { reply: string; actions: EditorAction[] } {
  const p = prompt.toLowerCase().trim();
  const actions: EditorAction[] = [];
  const responses: string[] = [];

  // 1. TRIM ALL CLIPS
  // e.g. "trim all to 2s", "make each clip 2.5 seconds", "cut clips to 1 second"
  const trimAllMatch = p.match(/(?:trim|set|make|cut)\s+(?:all\s+)?(?:the\s+)?clips?\s+(?:to\s+|length\s+)?([0-9]+(?:\.[0-9]+)?)\s*(?:s|sec|seconds)?/i) ||
    p.match(/trim\s+all\s+to\s+([0-9]+(?:\.[0-9]+)?)/i) ||
    p.match(/each\s+clip\s+([0-9]+(?:\.[0-9]+)?)\s*s/i);

  if (trimAllMatch) {
    const sec = Math.max(0.2, Math.min(60, parseFloat(trimAllMatch[1])));
    actions.push({ type: "TRIM_ALL_CLIPS", payload: { duration: sec } });
    responses.push(`Trimmed all clips to ${sec}s duration.`);
  }

  // 2. ASPECT RATIO
  // e.g. "switch to 9:16", "shorts format", "tiktok", "reels", "widescreen", "16:9"
  if (p.includes("9:16") || p.includes("shorts") || p.includes("tiktok") || p.includes("reels") || p.includes("vertical")) {
    actions.push({ type: "SET_ASPECT_RATIO", payload: { aspectRatio: "9:16" } });
    responses.push("Set aspect ratio to 9:16 Vertical (optimized for YouTube Shorts & TikTok).");
  } else if (p.includes("16:9") || p.includes("horizontal") || p.includes("widescreen") || p.includes("landscape")) {
    actions.push({ type: "SET_ASPECT_RATIO", payload: { aspectRatio: "16:9" } });
    responses.push("Set aspect ratio to 16:9 Widescreen.");
  }

  // 3. RESOLUTION
  // e.g. "set resolution to 4k", "make it 2k", "1080p"
  if (p.includes("4k") || p.includes("uhd")) {
    actions.push({ type: "SET_RESOLUTION", payload: { resolution: "4k" } });
    responses.push("Set output sequence resolution to 4K UHD.");
  } else if (p.includes("2k") || p.includes("1440") || p.includes("qhd")) {
    actions.push({ type: "SET_RESOLUTION", payload: { resolution: "2k" } });
    responses.push("Set output sequence resolution to 2K QHD (forces YouTube high-bitrate VP9 codec).");
  } else if (p.includes("1080") || p.includes("fhd")) {
    actions.push({ type: "SET_RESOLUTION", payload: { resolution: "1080p" } });
    responses.push("Set resolution to 1080p Full HD.");
  }

  // 4. VOICEOVER DELETE / CLEAR
  // e.g. "delete voiceover", "remove voiceover", "clear voiceovers", "delete audio"
  if (p.includes("delete voiceover") || p.includes("remove voiceover") || p.includes("clear voiceover") || p.includes("delete all voiceovers") || p.includes("remove audio track")) {
    actions.push({ type: "CLEAR_VOICEOVERS" });
    responses.push("Removed all voiceovers from Timeline Track A1.");
  }

  // 5. ADD VOICEOVER
  // e.g. "add voiceover saying Welcome to the video", "add stoic voiceover"
  const addVoMatch = p.match(/add\s+(?:a\s+)?voiceover\s+(?:saying|with text)?\s*["']?([^"']+)["']?/i);
  if (addVoMatch && !p.includes("delete") && !p.includes("remove")) {
    const voText = addVoMatch[1].trim();
    actions.push({
      type: "ADD_VOICEOVER",
      payload: {
        text: voText,
        title: voText.slice(0, 24),
        startTime: state.playheadTime || 0,
        duration: Math.max(2, Math.round(voText.split(" ").length * 0.4)),
      },
    });
    responses.push(`Added voiceover: "${voText}" to Track A1 at ${state.playheadTime.toFixed(1)}s.`);
  }

  // 6. MUSIC SELECTION & VOLUME
  // e.g. "set music to phonk", "change music to lofi", "mute music", "set music volume to 30%"
  if (p.includes("phonk")) {
    actions.push({ type: "SET_MUSIC", payload: { musicTrack: "phonk" } });
    responses.push("Selected soundtrack: Phonk Drift.");
  } else if (p.includes("cyberpunk music") || p.includes("synthwave") || (p.includes("cyberpunk") && !p.includes("filter") && !p.includes("lut") && !p.includes("color") && !p.includes("grade"))) {
    actions.push({ type: "SET_MUSIC", payload: { musicTrack: "cyberpunk" } });
    responses.push("Selected soundtrack: Cyberpunk Pulse.");
  } else if (p.includes("lofi") || p.includes("chill")) {
    actions.push({ type: "SET_MUSIC", payload: { musicTrack: "lofi" } });
    responses.push("Selected soundtrack: Chill Lofi Beats.");
  } else if (p.includes("cinematic") || p.includes("epic")) {
    actions.push({ type: "SET_MUSIC", payload: { musicTrack: "cinematic" } });
    responses.push("Selected soundtrack: Cinematic Ambient.");
  } else if (p.includes("rock") || p.includes("energy")) {
    actions.push({ type: "SET_MUSIC", payload: { musicTrack: "rock" } });
    responses.push("Selected soundtrack: Energetic Rock.");
  } else if (p.includes("mute music") || p.includes("remove music") || p.includes("no music")) {
    actions.push({ type: "SET_MUSIC", payload: { musicTrack: "none" } });
    responses.push("Muted background music on Track A2.");
  }

  // Music volume
  const volMatch = p.match(/(?:music\s+volume|volume|bgm)\s+(?:to\s+)?([0-9]+)%?/i);
  if (volMatch) {
    const raw = parseFloat(volMatch[1]);
    const normalizedVol = raw > 1 ? raw / 100 : raw;
    actions.push({ type: "SET_MUSIC_VOLUME", payload: { volume: Math.max(0, Math.min(1, normalizedVol)) } });
    responses.push(`Adjusted music volume to ${Math.round(normalizedVol * 100)}%.`);
  }

  // 7. COLOR GRADING / LUT FILTERS
  // e.g. "apply cyberpunk filter", "teal and orange", "vintage warm", "matrix neon", "black and white"
  if (p.includes("cyberpunk filter") || p.includes("cyberpunk lut") || p.includes("cyberpunk color") || (p.includes("cyberpunk") && !p.includes("music") && !p.includes("track") && !p.includes("song"))) {
    actions.push({ type: "SET_COLOR_FILTER", payload: { filter: "cyberpunk" } });
    responses.push("Applied Cyberpunk Neon color grade (cool blues, electric pinks).");
  } else if (p.includes("teal") || p.includes("orange")) {
    actions.push({ type: "SET_COLOR_FILTER", payload: { filter: "teal_orange" } });
    responses.push("Applied Hollywood Teal & Orange LUT.");
  } else if (p.includes("vintage") || p.includes("warm") || p.includes("sepia")) {
    actions.push({ type: "SET_COLOR_FILTER", payload: { filter: "vintage_warm" } });
    responses.push("Applied Warm Vintage Golden LUT.");
  } else if (p.includes("matrix") || p.includes("neon")) {
    actions.push({ type: "SET_COLOR_FILTER", payload: { filter: "matrix_neon" } });
    responses.push("Applied Matrix Green Sci-Fi filter.");
  } else if (p.includes("black and white") || p.includes("grayscale") || p.includes("b&w") || p.includes("noir")) {
    actions.push({ type: "SET_COLOR_FILTER", payload: { filter: "noir_bw" } });
    responses.push("Applied Dramatic Noir Black & White grade.");
  } else if (p.includes("reset filter") || p.includes("no filter") || p.includes("normal color")) {
    actions.push({ type: "SET_COLOR_FILTER", payload: { filter: "none" } });
    responses.push("Reset Lumetri color grading to Neutral.");
  }

  // 8. CLIP SPEED
  // e.g. "speed up clips to 1.5x", "slow down to 0.75x", "2x speed"
  const speedMatch = p.match(/(?:speed\s+up|speed|slow\s+down)\s+(?:to\s+)?([0-9]+(?:\.[0-9]+)?)\s*x?/i);
  if (speedMatch) {
    const spd = Math.max(0.5, Math.min(3.0, parseFloat(speedMatch[1])));
    actions.push({ type: "SET_CLIP_SPEED", payload: { speed: spd } });
    responses.push(`Set playback speed to ${spd}x across sequence.`);
  }

  // 9. SPLIT CLIP AT PLAYHEAD OR GIVEN TIME
  // e.g. "split clip at 3s", "slice clip at playhead", "blade cut"
  if (p.includes("split") || p.includes("slice") || p.includes("cut clip")) {
    const timeMatch = p.match(/(?:at|time)\s+([0-9]+(?:\.[0-9]+)?)/i);
    const splitTime = timeMatch ? parseFloat(timeMatch[1]) : state.playheadTime;
    actions.push({ type: "SPLIT_CLIP", payload: { time: splitTime } });
    responses.push(`Split clip at ${splitTime.toFixed(2)}s on timeline.`);
  }

  // 10. CLEAR TIMELINE
  if (p.includes("clear timeline") || p.includes("delete all clips") || p.includes("reset sequence")) {
    actions.push({ type: "CLEAR_TIMELINE" });
    responses.push("Cleared all clips from timeline sequence.");
  }

  // 11. ADD SAMPLE CLIPS (UP TO 100)
  // e.g. "add 10 clips", "add 50 mini clips", "fill timeline with 20 clips"
  const addClipsMatch = p.match(/add\s+([0-9]+)\s+(?:mini\s+)?clips?/i) ||
    p.match(/create\s+([0-9]+)\s+clips?/i);
  if (addClipsMatch) {
    const count = Math.min(100, Math.max(1, parseInt(addClipsMatch[1], 10)));
    actions.push({ type: "ADD_SAMPLE_CLIPS", payload: { count } });
    responses.push(`Appended ${count} mini clips into Track V1.`);
  }

  // 12. PLAYBACK CONTROLS
  if (p === "play" || p.includes("play sequence") || p.includes("start playback")) {
    actions.push({ type: "PLAY" });
    responses.push("Playback started.");
  } else if (p === "pause" || p === "stop" || p.includes("stop playback")) {
    actions.push({ type: "PAUSE" });
    responses.push("Playback paused.");
  } else if (p.includes("go to start") || p.includes("beginning") || p.includes("rewind")) {
    actions.push({ type: "SEEK", payload: { time: 0 } });
    responses.push("Moved playhead to sequence start (00:00:00:00).");
  }

  // 13. EXPORT / RENDER
  // e.g. "export video", "render sequence", "download mp4", "export in 2k"
  if (p.includes("export") || p.includes("render") || p.includes("download video")) {
    actions.push({ type: "EXPORT_SEQUENCE" });
    responses.push("Triggered timeline export! Normalizing clips and rendering high-bitrate MP4...");
  }

  // If no specific actionable commands matched, provide an intelligent creator consultation response
  if (actions.length === 0) {
    return {
      reply: `I understand you're looking to edit: "${prompt}".\n\nYou can give me direct instructions such as:\n• "Trim all clips to 2s"\n• "Switch to 9:16 Shorts" (or 16:9 widescreen)\n• "Delete voiceover" or "Add voiceover saying [text]"\n• "Set music to Phonk Drift" or "Mute music"\n• "Set resolution to 4K" or 2K QHD\n• "Apply Cyberpunk / Teal & Orange / Vintage LUT"\n• "Add 20 mini clips" (supports up to 100)\n• "Split clip at 2.5s"\n• "Export video"`,
      actions: [],
    };
  }

  return {
    reply: responses.join(" "),
    actions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, geminiApiKey, timelineState, testOnly } = body;

    // Direct API Key Connection Test mode
    if (testOnly) {
      const keyToTest =
        geminiApiKey?.trim() ||
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim();

      if (!keyToTest) {
        return NextResponse.json(
          { valid: false, error: "No API key provided to test. Please enter a key starting with AIzaSy..." },
          { status: 400 }
        );
      }

      try {
        // Query official models endpoint to verify key & retrieve authorized models
        const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`;
        const modelsRes = await fetch(modelsUrl, {
          headers: { "x-goog-api-key": keyToTest },
        });

        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const available: string[] =
            modelsData?.models?.map((m: any) => m.name?.replace("models/", "")).filter(Boolean) || [];
          const preferredModel =
            available.find((m) => m.includes("1.5-flash")) ||
            available.find((m) => m.includes("flash")) ||
            available[0] ||
            "gemini-1.5-flash";

          return NextResponse.json({
            valid: true,
            model: preferredModel,
            availableModels: available.slice(0, 5),
            message: `✓ Google Gemini API Key is valid and active! (${available.length} models ready)`,
          });
        } else {
          const errData = await modelsRes.json().catch(() => ({}));
          const errMsg =
            errData?.error?.message || `Google API returned status code ${modelsRes.status}`;
          return NextResponse.json(
            { valid: false, error: errMsg },
            { status: 400 }
          );
        }
      } catch (testErr: any) {
        return NextResponse.json(
          { valid: false, error: testErr.message || "Failed to contact Google Gemini API" },
          { status: 500 }
        );
      }
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json({ error: "Instruction prompt is required" }, { status: 400 });
    }

    const state: TimelineStateContext = timelineState || {
      clipsCount: 0,
      totalDuration: 0,
      aspectRatio: "9:16",
      resolution: "1080p",
      selectedMusic: "none",
      musicVolume: 0.18,
      videoFilter: "none",
      playheadTime: 0,
      voiceoversCount: 0,
    };

    // Check for Gemini API Key (client provided > env GEMINI_API_KEY > env GOOGLE_API_KEY)
    const apiKey =
      geminiApiKey?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim();

    // If Gemini API Key is available, invoke the official Google Gemini Generative AI REST endpoint
    if (apiKey) {
      try {
        const systemPrompt = `You are an elite Adobe Premiere Pro & viral video editing AI assistant embedded inside ClipForge AI Video Editor.
The user is working on a sequence with:
- Clips Count: ${state.clipsCount}
- Total Sequence Duration: ${state.totalDuration.toFixed(1)}s
- Aspect Ratio: ${state.aspectRatio}
- Resolution: ${state.resolution}
- Active Background Music: ${state.selectedMusic} (Volume: ${Math.round(state.musicVolume * 100)}%)
- Lumetri Color Filter: ${state.videoFilter}
- Current Playhead Timecode: ${state.playheadTime.toFixed(2)}s
- Voiceovers on Track A1: ${state.voiceoversCount}

Analyze the user's instruction and return a valid JSON object matching this schema:
{
  "reply": "Conversational, enthusiastic explanation of what actions were taken (max 2 sentences)",
  "actions": [
    {
      "type": "TRIM_ALL_CLIPS | TRIM_CLIP | SPLIT_CLIP | SET_CLIP_SPEED | DELETE_CLIP | CLEAR_TIMELINE | ADD_SAMPLE_CLIPS | DELETE_VOICEOVER | CLEAR_VOICEOVERS | ADD_VOICEOVER | SET_VOICEOVER_VOLUME | SET_MUSIC | SET_MUSIC_VOLUME | SET_ASPECT_RATIO | SET_RESOLUTION | SET_COLOR_FILTER | PLAY | PAUSE | SEEK | EXPORT_SEQUENCE",
      "payload": { ...appropriate fields... }
    }
  ]
}

Available Action Types & Payloads:
- TRIM_ALL_CLIPS: { "duration": number in seconds (e.g. 2.0) }
- SET_ASPECT_RATIO: { "aspectRatio": "9:16" | "16:9" }
- SET_RESOLUTION: { "resolution": "1080p" | "2k" | "4k" }
- CLEAR_VOICEOVERS: {}
- ADD_VOICEOVER: { "text": string, "title": string, "startTime": number, "duration": number }
- SET_MUSIC: { "musicTrack": "phonk" | "cyberpunk" | "lofi" | "cinematic" | "rock" | "none" }
- SET_MUSIC_VOLUME: { "volume": number from 0.0 to 1.0 }
- SET_COLOR_FILTER: { "filter": "none" | "teal_orange" | "cyberpunk" | "vintage_warm" | "matrix_neon" | "noir_bw" }
- SET_CLIP_SPEED: { "speed": number from 0.5 to 2.5 }
- SPLIT_CLIP: { "time": number in seconds }
- ADD_SAMPLE_CLIPS: { "count": number up to 100 }
- CLEAR_TIMELINE: {}
- PLAY: {}
- PAUSE: {}
- SEEK: { "time": number }
- EXPORT_SEQUENCE: {}

Respond ONLY with raw JSON. No markdown code blocks, no backticks, no extra formatting.`;

        // Try candidate models in order of speed and capability
        const candidateModels = [
          "gemini-1.5-flash",
          "gemini-1.5-flash-latest",
          "gemini-2.0-flash-exp",
          "gemini-1.5-pro",
          "gemini-pro",
        ];

        let candidateText: string | null = null;
        let successfulModel = "gemini-1.5-flash";

        for (const modelName of candidateModels) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const geminiRes = await fetch(geminiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nUser Instruction: "${prompt}"` }],
                  },
                ],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: "application/json",
                },
              }),
            });

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              successfulModel = modelName;
              if (candidateText) break;
            } else {
              const errBody = await geminiRes.text();
              console.warn(`Gemini (${modelName}) returned status ${geminiRes.status}:`, errBody);
              // Stop immediately if key is invalid (400 / 403)
              if (geminiRes.status === 400 || geminiRes.status === 403) break;
            }
          } catch (mErr) {
            console.warn(`Error querying Gemini model ${modelName}:`, mErr);
          }
        }

        if (candidateText) {
          try {
            // Parse clean JSON
            const cleaned = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.reply && Array.isArray(parsed.actions)) {
              return NextResponse.json({
                source: "gemini",
                model: successfulModel,
                reply: parsed.reply,
                actions: parsed.actions,
              });
            }
          } catch (jsonErr) {
            console.warn("Failed to parse Gemini JSON output, falling back to deterministic intent compiler:", jsonErr);
          }
        }
      } catch (geminiCallErr) {
        console.warn("Gemini fetch failed, falling back to deterministic intent compiler:", geminiCallErr);
      }
    }

    // Fallback: Deterministic NLP intent compiler
    // Guaranteed instant execution for all editing actions!
    const compiled = compileIntentToActions(prompt, state);

    return NextResponse.json({
      source: "compiler",
      model: "deterministic-nlp",
      reply: compiled.reply,
      actions: compiled.actions,
    });
  } catch (error: any) {
    console.error("Editor AI endpoint error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error processing AI instruction" },
      { status: 500 }
    );
  }
}
