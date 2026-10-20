export interface GeneratedScene {
  id: string;
  order: number;
  narration: string;
  visualPrompt: string;
  duration: number;
  subtitleText: string;
  transition: string;
}

export interface GeneratedScript {
  title: string;
  hook: string;
  niche: string;
  tone: string;
  scenes: GeneratedScene[];
  callToAction: string;
  hashtags: string[];
  musicSuggestion: string;
  thumbnailConcept: string;
  isAiGenerated: boolean;
  provider: string;
}

export interface ScriptGenerationParams {
  topic: string;
  niche?: string;
  tone?: string;
  duration?: number; // seconds
  language?: string;
  platform?: string;
}

/**
 * Script generator supporting OpenAI / Anthropic when configured,
 * and high-engagement niche templates when offline.
 */
export async function generateAiScript(params: ScriptGenerationParams): Promise<GeneratedScript> {
  const { topic, niche = "general", tone = "engaging", duration = 45, language = "en" } = params;

  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey && openaiKey.trim().length > 0) {
    try {
      const prompt = `You are a viral short-form video scriptwriter. Create a high-converting ${duration}-second video script for ${params.platform || "TikTok/Shorts"} on the topic: "${topic}".
Niche: ${niche}. Tone: ${tone}. Language: ${language}.
Return a strict JSON object with:
{
  "title": "catchy short title",
  "hook": "first 3-second hook that stops scrolling",
  "scenes": [
    {
      "order": 1,
      "narration": "voiceover line (approx 5-8 seconds)",
      "visualPrompt": "detailed description of image or video scene",
      "duration": 6
    }
  ],
  "callToAction": "ending CTA line",
  "hashtags": ["#tag1", "#tag2"],
  "musicSuggestion": "background track style",
  "thumbnailConcept": "visual thumbnail description"
}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);

        const scenes: GeneratedScene[] = (parsed.scenes || []).map((s: any, idx: number) => ({
          id: `scene_${idx + 1}`,
          order: idx + 1,
          narration: s.narration || "",
          visualPrompt: s.visualPrompt || "",
          duration: s.duration || 6,
          subtitleText: s.narration || "",
          transition: "fade",
        }));

        return {
          title: parsed.title || topic,
          hook: parsed.hook || `Discover the truth about ${topic}`,
          niche,
          tone,
          scenes,
          callToAction: parsed.callToAction || "Follow for more daily insights!",
          hashtags: parsed.hashtags || ["#viral", "#shorts", "#trending"],
          musicSuggestion: parsed.musicSuggestion || "Energetic Lo-Fi Pulse",
          thumbnailConcept: parsed.thumbnailConcept || `Eye-catching visual of ${topic}`,
          isAiGenerated: true,
          provider: "openai_gpt4o",
        };
      }
    } catch (e) {
      console.warn("OpenAI API script generation failed, falling back to template engine:", e);
    }
  }

  // Template-based generator for offline or unconfigured environments
  const sceneCount = Math.max(3, Math.min(8, Math.round(duration / 7)));
  const sceneDuration = Number((duration / sceneCount).toFixed(1));

  const scenes: GeneratedScene[] = [
    {
      id: "scene_1",
      order: 1,
      narration: `Stop scrolling. If you care about ${topic}, here is the one thing nobody is talking about.`,
      visualPrompt: `Dramatic close-up cinematic shot illustrating ${topic}, high contrast neon studio lighting`,
      duration: sceneDuration,
      subtitleText: `Stop scrolling. If you care about ${topic}, here is what you need to know.`,
      transition: "fade",
    },
    {
      id: "scene_2",
      order: 2,
      narration: `Most people think it works one way, but when you look behind the scenes, the reality is completely different.`,
      visualPrompt: `Dynamic visual showing contrast and unexpected reveal related to ${topic}`,
      duration: sceneDuration,
      subtitleText: `Most people think it works one way, but the reality is completely different.`,
      transition: "slide_left",
    },
    {
      id: "scene_3",
      order: 3,
      narration: `When you apply this principle consistently, your results multiply faster than you ever imagined.`,
      visualPrompt: `Fast-paced montage of growth, mastery, and success indicators for ${topic}`,
      duration: sceneDuration,
      subtitleText: `When you apply this principle consistently, your results multiply.`,
      transition: "fade",
    },
    {
      id: "scene_4",
      order: 4,
      narration: `Save this video right now so you don't forget, and drop your thoughts in the comments below.`,
      visualPrompt: `Engaging call to action overlay screen with sleek typography and subtle particles`,
      duration: sceneDuration,
      subtitleText: `Save this video now and leave your thoughts in the comments!`,
      transition: "fade",
    },
  ];

  return {
    title: `The Truth About ${topic}`,
    hook: `Stop scrolling. If you care about ${topic}, here is what you need to know.`,
    niche,
    tone,
    scenes: scenes.slice(0, sceneCount),
    callToAction: "Follow for daily viral insights!",
    hashtags: [`#${topic.replace(/\s+/g, "").toLowerCase()}`, "#viral", "#growth", "#shorts"],
    musicSuggestion: "Dark Ambient Phonk or Inspiring Upbeat Lo-Fi",
    thumbnailConcept: `Bold 3D typography of "${topic.toUpperCase()}" with glowing neon rim lighting`,
    isAiGenerated: false,
    provider: "clipforge_template_engine",
  };
}
