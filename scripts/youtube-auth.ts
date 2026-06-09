import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { google } from "googleapis";

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
const redirectUri =
  process.env.YOUTUBE_REDIRECT_URI ?? "http://localhost:3000/oauth2callback";

if (!clientId || !clientSecret) {
  throw new Error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env");
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const url = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/youtube.upload"],
});

console.log(`\nOpen this URL and approve access:\n\n${url}\n`);
const input = createInterface({ input: stdin, output: stdout });
const pasted = await input.question("Paste the full redirected URL or code: ");
input.close();

let code = pasted.trim();
try {
  code = new URL(code).searchParams.get("code") ?? code;
} catch {
  // A raw authorization code is also accepted.
}

const { tokens } = await oauth.getToken(code);
if (!tokens.refresh_token) {
  throw new Error("No refresh token returned. Revoke prior access and retry with prompt=consent.");
}
console.log(`\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
