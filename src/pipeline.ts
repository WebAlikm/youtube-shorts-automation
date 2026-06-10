import { rm } from "node:fs/promises";
import { renderVideo } from "./providers/ffmpeg.js";
import { synthesizeSpeech } from "./providers/fish.js";
import { generateImage } from "./providers/images.js";
import { createVideoPlan } from "./providers/openai.js";
import { updateRow } from "./providers/sheets.js";
import { uploadVideo } from "./providers/youtube.js";
import { QueueRow, TimedScene, VideoPlan, queueStatus } from "./types.js";
import { download, ensureTmp, mediaDuration, safeKey } from "./utils.js";

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

function list(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function manualPlan(row: QueueRow) {
  const narration = list(row.script);
  const imageUrls = list(row.imageUrls);
  if (!narration.length || !imageUrls.length) return null;
  if (narration.length !== imageUrls.length) {
    throw new Error(
      `Manual mode requires one script line per image URL. Found ${narration.length} script lines and ${imageUrls.length} image URLs.`,
    );
  }

  const plan: VideoPlan = {
    title: row.title || row.topic.slice(0, 100),
    description: row.description || row.topic,
    tags: row.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 15),
    scenes: narration.map((text, index) => ({
      narration: text,
      imagePrompt: `Manual image ${index + 1}`,
    })),
  };
  return { plan, imageUrls };
}

export async function processRow(row: QueueRow) {
  await ensureTmp();
  const jobKey = `${row.rowNumber}-${Date.now()}-${safeKey(row.topic)}`;
  const jobDir = `tmp/${jobKey}`;
  const audioPath = `${jobDir}/narration.mp3`;
  const videoPath = `${jobDir}/video.mp4`;

  try {
    const manual = manualPlan(row);
    const plan = manual?.plan ?? (await createVideoPlan(row.topic, row.instructions));
    const narration = plan.scenes.map((scene) => scene.narration).join(" ");
    await synthesizeSpeech(narration, audioPath);
    const duration = await mediaDuration(audioPath);
    const timings = sceneDurations(
      plan.scenes.map((scene) => scene.narration),
      duration,
    );

    const timedScenes: TimedScene[] = [];
    for (const [index, scene] of plan.scenes.entries()) {
      const imagePath = `${jobDir}/scene-${index + 1}.png`;
      const imageUrl = manual?.imageUrls[index];
      if (imageUrl) {
        await download(imageUrl, imagePath);
      } else {
        await generateImage(scene.imagePrompt, imagePath);
      }
      const timing = timings[index];
      if (!timing) throw new Error(`Missing timing for scene ${index + 1}`);
      timedScenes.push({ ...scene, imagePath, ...timing });
    }

    await renderVideo(audioPath, timedScenes, videoPath);
    await updateRow(row.rowNumber, {
      status: queueStatus.rendered,
      script: narration,
      title: plan.title,
      description: plan.description,
      videoUrl: "",
      error: "",
    });

    const youtubeId = await uploadVideo(videoPath, plan);
    await updateRow(row.rowNumber, {
      status: queueStatus.uploaded,
      videoUrl: `https://youtu.be/${youtubeId}`,
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
