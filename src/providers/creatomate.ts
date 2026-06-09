import { config } from "../config.js";
import { TimedScene } from "../types.js";
import { sleep } from "../utils.js";

interface Render {
  id: string;
  status: string;
  url?: string;
  error_message?: string;
}

export async function renderVideo(audioUrl: string, scenes: TimedScene[]) {
  const modifications: Record<string, string | number> = {
    "Audio.source": audioUrl,
  };
  scenes.forEach((scene, index) => {
    const slot = `Image-${index + 1}`;
    modifications[`${slot}.source`] = scene.imageUrl;
    modifications[`${slot}.time`] = scene.start;
    modifications[`${slot}.duration`] = scene.duration;
  });

  const response = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.CREATOMATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: config.CREATOMATE_TEMPLATE_ID,
      modifications,
    }),
  });
  if (!response.ok) {
    throw new Error(`Creatomate submit failed (${response.status}): ${await response.text()}`);
  }
  const created = (await response.json()) as Render[];
  const renderId = created[0]?.id;
  if (!renderId) throw new Error("Creatomate returned no render ID");

  const deadline = Date.now() + config.POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(config.POLL_INTERVAL_MS);
    const statusResponse = await fetch(
      `https://api.creatomate.com/v1/renders/${renderId}`,
      { headers: { Authorization: `Bearer ${config.CREATOMATE_API_KEY}` } },
    );
    if (!statusResponse.ok) {
      throw new Error(`Creatomate polling failed: ${await statusResponse.text()}`);
    }
    const render = (await statusResponse.json()) as Render;
    if (render.status === "succeeded" && render.url) return render.url;
    if (render.status === "failed") {
      throw new Error(render.error_message ?? "Creatomate render failed");
    }
  }
  throw new Error("Creatomate render timed out");
}
