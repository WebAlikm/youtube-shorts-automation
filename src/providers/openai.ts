import { config } from "../config.js";
import { VideoPlan, videoPlanSchema } from "../types.js";

const videoPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "tags", "scenes"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 100 },
    description: { type: "string", minLength: 1 },
    tags: {
      type: "array",
      maxItems: 15,
      items: { type: "string", minLength: 1 },
    },
    scenes: {
      type: "array",
      minItems: 6,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["narration", "imagePrompt"],
        properties: {
          narration: { type: "string", minLength: 1 },
          imagePrompt: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
}

function responseText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text")
      ?.text ?? ""
  );
}

export async function createVideoPlan(
  topic: string,
  instructions: string,
): Promise<VideoPlan> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.OPENAI_SCRIPT_MODEL,
      input: [
        {
          role: "system",
          content:
            "Create factual, high-retention YouTube Shorts plans. Keep the full narration coherent, punchy, and under 95 words. Each image prompt must describe one clear vertical scene matching only its narration.",
        },
        {
          role: "user",
          content: `Create a 25-35 second vertical YouTube Short about: ${topic}

Additional instructions: ${instructions || "None"}

Use 6-9 scenes. The title must be under 100 characters. Include a short description with 2-3 relevant hashtags and up to 15 tags.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "youtube_short_plan",
          strict: true,
          schema: videoPlanJsonSchema,
        },
      },
    }),
  });

  const result = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(
      `OpenAI script generation failed (${response.status}): ${
        result.error?.message ?? JSON.stringify(result)
      }`,
    );
  }

  const text = responseText(result);
  if (!text) throw new Error("OpenAI returned no script plan");
  return videoPlanSchema.parse(JSON.parse(text));
}
