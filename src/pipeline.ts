import { rm } from "node:fs/promises";
import { createVideoPlan } from "./providers/claude.js";
import { renderVideo } from "./providers/creatomate.js";
import { synthesizeSpeech } from "./providers/fish.js";
import { generateImage } from "./providers/images.js";
import { updateRow } from "./providers/sheets.js";
import { uploadAsset } from "./providers/storage.js";
import { uploadVideo } from "./providers/youtube.js";
import { QueueRow, TimedScene, queueStatus } from "./types.js";
import {
  download,
  ensureTmp,
  mediaDuration,
  safeKey,
} from "./utils.js";

function sceneDurations(narration: string[], totalDuration: number) {
  const weights = narration.map((text) => Math.max(1, text.trim().split(/\s+/).length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  return weights.map((weight, index) => {
    const remaining = totalDuration - cursor;
    const duration =
      index === weights.length - 1
        ? remaining
        : Math.max(0.5, (weight / totalWeight) * totalDuration);
    const result = { start: cursor, duration };
    cursor += duration;
    return result;
  });
}

export async function processRow(row: QueueRow) {
  await ensureTmp();
  const jobKey = `${row.rowNumber}-${Date.now()}-${safeKey(row.topic)}`;
  const jobDir = `tmp/${jobKey}`;
  const audioPath = `${jobDir}/narration.mp3`;
  const videoPath = `${jobDir}/video.mp4`;

  try {
    const plan = await createVideoPlan(row.topic, row.instructions);
    const narration = plan.scenes.map((scene) => scene.narration).join(" ");
    await synthesizeSpeech(narration, audioPath);
    const duration = await mediaDuration(audioPath);
    const timings = sceneDurations(
      plan.scenes.map((scene) => scene.narration),
      duration,
    );

    const audioUrl = await uploadAsset(
      audioPath,
      `${jobKey}/narration.mp3`,
      "audio/mpeg",
    );

    const timedScenes: TimedScene[] = [];
    for (const [index, scene] of plan.scenes.entries()) {
      const imagePath = `${jobDir}/scene-${index + 1}.png`;
      await generateImage(scene.imagePrompt, imagePath);
      const imageUrl = await uploadAsset(
        imagePath,
        `${jobKey}/scene-${index + 1}.png`,
        "image/png",
      );
      const timing = timings[index];
      if (!timing) throw new Error(`Missing timing for scene ${index + 1}`);
      timedScenes.push({ ...scene, imageUrl, ...timing });
    }

    const renderUrl = await renderVideo(audioUrl, timedScenes);
    await updateRow(row.rowNumber, {
      status: queueStatus.rendered,
      script: narration,
      title: plan.title,
      description: plan.description,
      videoUrl: renderUrl,
      error: "",
    });

    await download(renderUrl, videoPath);
    const youtubeId = await uploadVideo(videoPath, plan);
    await updateRow(row.rowNumber, {
      status: queueStatus.uploaded,
      youtubeId,
      error: "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    await updateRow(row.rowNumber, {
      status: queueStatus.failed,
      error: message.slice(0, 45000),
    });
    throw error;
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}
