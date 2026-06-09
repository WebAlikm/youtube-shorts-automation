import { config } from "../config.js";
import { saveBuffer } from "../utils.js";

export async function synthesizeSpeech(text: string, outputPath: string) {
  const response = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.FISH_AUDIO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reference_id: config.FISH_VOICE_ID,
      format: "mp3",
      normalize: true,
      mp3_bitrate: 192,
    }),
  });
  if (!response.ok) {
    throw new Error(`Fish Audio failed (${response.status}): ${await response.text()}`);
  }
  return saveBuffer(outputPath, Buffer.from(await response.arrayBuffer()));
}
