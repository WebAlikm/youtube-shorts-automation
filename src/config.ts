import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  FISH_AUDIO_API_KEY: z.string().min(1),
  FISH_VOICE_ID: z.string().min(1),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_SCRIPT_MODEL: z.string().default("gpt-5.5"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  GOOGLE_SHEET_ID: z.string().min(1),
  GOOGLE_SHEET_TAB: z.string().default("Queue"),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
  YOUTUBE_CLIENT_ID: z.string().min(1),
  YOUTUBE_CLIENT_SECRET: z.string().min(1),
  YOUTUBE_REFRESH_TOKEN: z.string().min(1),
  YOUTUBE_REDIRECT_URI: z.string().url().default("http://localhost:3000/oauth2callback"),
  YOUTUBE_PRIVACY_STATUS: z.enum(["private", "unlisted", "public"]).default("private"),
  YOUTUBE_CATEGORY_ID: z.string().default("28"),
  MAX_JOBS_PER_RUN: z.coerce.number().int().min(1).max(10).default(1),
});

export const config = schema.parse(process.env);

export function googleServiceAccount() {
  return JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
  };
}
