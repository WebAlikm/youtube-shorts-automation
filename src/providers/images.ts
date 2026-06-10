import { config } from "../config.js";
import { saveBuffer } from "../utils.js";

const STYLE = `Vertical 9:16 YouTube Shorts illustration. Extremely simple beginner MS Paint drawing, intentionally amateur and funny. White background. Thick uneven black outlines. Wobbly hand-drawn lines. Stick-figure humans with round heads and dot eyes. Flat primary and secondary colors only. No realistic shading, no 3D, no cinematic lighting, no anime, no Disney style, no polished illustration, no professional vector art, no detailed background, no complex textures. Clear centered composition with generous padding. No text unless specifically requested.`;

export async function generateImage(prompt: string, outputPath: string) {
  if (!config.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required to generate images. Provide image_urls in the Sheet to bypass image generation.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.OPENAI_IMAGE_MODEL,
      prompt: `${STYLE}\n\nScene: ${prompt}`,
      size: "1024x1536",
      quality: "high",
      output_format: "png",
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI image generation failed (${response.status}): ${await response.text()}`);
  }
  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI returned no image data");
  return saveBuffer(outputPath, Buffer.from(encoded, "base64"));
}
