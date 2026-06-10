import { z } from "zod";

export const sceneSchema = z.object({
  narration: z.string().min(1),
  imagePrompt: z.string().min(1),
});

export const videoPlanSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).max(15),
  scenes: z.array(sceneSchema).min(2).max(12),
});

export type VideoPlan = z.infer<typeof videoPlanSchema>;

export const queueStatus = {
  ready: "READY",
  processing: "PROCESSING",
  rendered: "RENDERED",
  uploaded: "UPLOADED",
  failed: "FAILED",
} as const;

export interface QueueRow {
  rowNumber: number;
  topic: string;
  instructions: string;
  status: string;
  youtubeId: string;
}

export interface TimedScene {
  narration: string;
  imagePrompt: string;
  imagePath: string;
  start: number;
  duration: number;
}
