import { readFile, writeFile } from "node:fs/promises";

const [serviceAccountPath, oauthClientPath, fishVoiceId] = process.argv.slice(2);

if (!serviceAccountPath || !oauthClientPath || !fishVoiceId) {
  throw new Error(
    "Usage: node scripts/configure-local.mjs <service-account.json> <oauth-client.json> <fish-voice-id>",
  );
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
const oauthFile = JSON.parse(await readFile(oauthClientPath, "utf8"));
const oauth = oauthFile.installed ?? oauthFile.web;

if (serviceAccount.type !== "service_account") {
  throw new Error("The first file is not a Google service-account key.");
}
if (!oauth?.client_id || !oauth?.client_secret) {
  throw new Error("The second file is not a valid Google OAuth client file.");
}

const template = await readFile(".env.example", "utf8");
const replacements = new Map([
  ["FISH_VOICE_ID", fishVoiceId],
  ["GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify(serviceAccount)],
  ["YOUTUBE_CLIENT_ID", oauth.client_id],
  ["YOUTUBE_CLIENT_SECRET", oauth.client_secret],
  ["YOUTUBE_REDIRECT_URI", "http://localhost:3000/oauth2callback"],
]);

const configured = template
  .split("\n")
  .map((line) => {
    const separator = line.indexOf("=");
    if (separator === -1) return line;
    const key = line.slice(0, separator);
    const value = replacements.get(key);
    return value === undefined ? line : `${key}=${value}`;
  })
  .join("\n");

await writeFile(".env", configured, { mode: 0o600 });
console.log("Created local .env with Google credentials and Fish voice ID.");
