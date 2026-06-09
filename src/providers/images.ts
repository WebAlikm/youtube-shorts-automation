import OpenAI from "openai";
import { config } from "../config.js";
import { download } from "../utils.js";

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const STYLE = `Vertical 9:16 YouTube Shorts illustration. Extremely simple beginner MS Paint drawing, intentionally amateur and funny. White background. Thick uneven black outlines. Wobbly hand-drawn lines. Stick-figure humans with round heads and dot eyes. Flat primary and secondary colors only. No realistic shading, no 3D, no cinematic lighting, no anime, no Disney style, no polished illustration, no professional vector art, no detailed background, no complex textures. Clear centered composition with generous padding. No text unless specifically requested.`;

export async function generateImage(prompt: string, outputPath: string) {
  const response = await client.images.generate({
    model: config.OPENAI_IMAGE_MODEL,
    prompt: `${STYLE}\n\nScene: ${prompt}`,
    size: "1024x1536",
    quality: "high",
  });
  const image = response.data?.[0];
  if (image?.b64_json) {
    const { saveBuffer } = await import("../utils.js");
    return saveBuffer(outputPath, Buffer.from(image.b64_json, "base64"));
  }
  if (image?.url) return download(image.url, outputPath);
  throw new Error("OpenAI returned no image data");
}
