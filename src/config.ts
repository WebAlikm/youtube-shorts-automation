import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),
  FISH_AUDIO_API_KEY: z.string().min(1),
  FISH_VOICE_ID: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  CREATOMATE_API_KEY: z.string().min(1),
  CREATOMATE_TEMPLATE_ID: z.string().min(1),
  GOOGLE_SHEET_ID: z.string().min(1),
  GOOGLE_SHEET_TAB: z.string().default("Queue"),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
  YOUTUBE_CLIENT_ID: z.string().min(1),
  YOUTUBE_CLIENT_SECRET: z.string().min(1),
  YOUTUBE_REFRESH_TOKEN: z.string().min(1),
  YOUTUBE_REDIRECT_URI: z.string().url().default("http://localhost:3000/oauth2callback"),
  YOUTUBE_PRIVACY_STATUS: z.enum(["private", "unlisted", "public"]).default("private"),
  YOUTUBE_CATEGORY_ID: z.string().default("28"),
  STORAGE_REGION: z.string().default("auto"),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_PUBLIC_URL: z.string().url(),
  MAX_JOBS_PER_RUN: z.coerce.number().int().min(1).max(10).default(1),
  POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  POLL_TIMEOUT_MS: z.coerce.number().int().min(60000).default(900000),
});

export const config = schema.parse(process.env);

export function googleServiceAccount() {
  return JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
  };
}
