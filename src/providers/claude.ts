import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { VideoPlan, videoPlanSchema } from "../types.js";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export async function createVideoPlan(
  topic: string,
  instructions: string,
): Promise<VideoPlan> {
  const response = await client.messages.create({
    model: config.ANTHROPIC_MODEL,
    max_tokens: 3000,
    system:
      "You create factual, high-retention YouTube Shorts. Return only valid JSON. Do not use markdown fences.",
    messages: [
      {
        role: "user",
        content: `Create a 25-35 second vertical YouTube Short about: ${topic}

Additional instructions: ${instructions || "None"}

Return this exact JSON shape:
{
  "title": "under 100 characters",
  "description": "short description with 2-3 relevant hashtags",
  "tags": ["up to 15 tags"],
  "scenes": [
    {
      "narration": "one short spoken section",
      "imagePrompt": "a concrete visual matching only this section"
    }
  ]
}

Use 6-9 scenes. The full narration must be coherent, factual, punchy, and under 95 words.`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return videoPlanSchema.parse(JSON.parse(text));
}
