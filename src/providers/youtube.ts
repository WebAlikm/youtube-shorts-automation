import { createReadStream } from "node:fs";
import { google, youtube_v3 } from "googleapis";
import { config } from "../config.js";

function youtubeClient() {
  const auth = new google.auth.OAuth2(
    config.YOUTUBE_CLIENT_ID,
    config.YOUTUBE_CLIENT_SECRET,
    config.YOUTUBE_REDIRECT_URI,
  );
  auth.setCredentials({ refresh_token: config.YOUTUBE_REFRESH_TOKEN });
  return google.youtube({ version: "v3", auth });
}

export async function uploadVideo(
  path: string,
  metadata: {
    title: string;
    description: string;
    tags: string[];
  },
) {
  const requestBody: youtube_v3.Schema$Video = {
    snippet: {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: config.YOUTUBE_CATEGORY_ID,
    },
    status: {
      privacyStatus: config.YOUTUBE_PRIVACY_STATUS,
      selfDeclaredMadeForKids: false,
    },
  };

  const response = await youtubeClient().videos.insert({
    part: ["snippet", "status"],
    requestBody,
    media: { body: createReadStream(path) },
  });
  if (!response.data.id) throw new Error("YouTube returned no video ID");
  return response.data.id;
}
