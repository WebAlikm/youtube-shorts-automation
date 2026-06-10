# YouTube Shorts Automation

Automates this pipeline:

```text
Google Sheets queue
  -> OpenAI script and scene plan
  -> Fish Audio narration
  -> OpenAI scene images
  -> FFmpeg vertical MP4
  -> YouTube upload
  -> Sheet status and URL update
```

The GitHub Actions workflow runs hourly and processes rows whose `status` is
`READY`. Uploads default to `private`.

## Google Sheet

Create a tab called `Queue`. The worker creates this header automatically:

| topic | instructions | status | script | title | description | video_url | youtube_id | error | updated_at |
|---|---|---|---|---|---|---|---|---|---|

Add a topic and set `status` to `READY`. Share the Sheet with the service
account email as an editor.

Statuses:

- `READY`: waiting
- `PROCESSING`: claimed by a worker
- `RENDERED`: FFmpeg completed
- `UPLOADED`: YouTube completed
- `FAILED`: inspect the `error` cell, fix the cause, then set back to `READY`

## Video Rendering

The GitHub Actions runner installs FFmpeg and renders the generated images and
narration directly into a 1080x1920 MP4. Creatomate and public asset storage
are not required.

## YouTube OAuth

1. Create a Google Cloud project.
2. Enable YouTube Data API v3.
3. Configure the OAuth consent screen.
4. Create a Desktop OAuth client, or configure the Web client redirect below.
5. Copy `.env.example` to `.env` and set the client ID and secret.
6. Run `npm install`, then `npm run youtube:auth`.
7. Approve the target YouTube channel and save the printed refresh token.

Service accounts cannot upload to normal YouTube channels.

## GitHub Configuration

Add these repository **Secrets**:

```text
FISH_AUDIO_API_KEY
OPENAI_API_KEY
GOOGLE_SERVICE_ACCOUNT_JSON
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN
```

Add these repository **Variables**:

```text
FISH_VOICE_ID=<Fish Audio reference ID>
OPENAI_SCRIPT_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-2
GOOGLE_SHEET_ID=<spreadsheet ID>
GOOGLE_SHEET_TAB=Queue
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
YOUTUBE_PRIVACY_STATUS=private
YOUTUBE_CATEGORY_ID=28
MAX_JOBS_PER_RUN=1
```

## Local Validation

```bash
cp .env.example .env
npm install
npm run build
npm start
```

Do not commit `.env`, OAuth tokens, service-account JSON, or API keys.

## Import Existing Google Credentials

To populate a local `.env` without copying private keys manually:

```bash
npm run configure:local -- /path/to/service-account.json /path/to/oauth-client.json <fish-voice-id>
```

For a Web application OAuth client, add this exact authorized redirect URI in
Google Cloud before running `npm run youtube:auth`:

```text
http://localhost:3000/oauth2callback
```
