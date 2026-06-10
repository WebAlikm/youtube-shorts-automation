import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { TimedScene } from "../types.js";

const execFileAsync = promisify(execFile);

function concatPath(path: string) {
  return resolve(path).replace(/'/g, "'\\''");
}

export async function renderVideo(
  audioPath: string,
  scenes: TimedScene[],
  outputPath: string,
) {
  if (!scenes.length) throw new Error("Cannot render a video without scenes");

  const concatFile = `${outputPath}.concat.txt`;
  const entries = scenes.flatMap((scene) => [
    `file '${concatPath(scene.imagePath)}'`,
    `duration ${scene.duration.toFixed(3)}`,
  ]);

  // The concat demuxer needs the final image repeated to preserve its duration.
  entries.push(`file '${concatPath(scenes[scenes.length - 1]!.imagePath)}'`);
  await writeFile(concatFile, `${entries.join("\n")}\n`);

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-i",
      audioPath,
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );

  return outputPath;
}
