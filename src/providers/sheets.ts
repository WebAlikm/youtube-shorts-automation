import { google } from "googleapis";
import { config, googleServiceAccount } from "../config.js";
import { QueueRow, queueStatus } from "../types.js";

const HEADERS = [
  "topic",
  "instructions",
  "status",
  "script",
  "title",
  "description",
  "video_url",
  "youtube_id",
  "error",
  "updated_at",
];

function sheetsClient() {
  const account = googleServiceAccount();
  const auth = new google.auth.JWT({
    email: account.client_email,
    key: account.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function ensureSheet() {
  const sheets = sheetsClient();
  const range = `${config.GOOGLE_SHEET_TAB}!A1:J1`;
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range,
  });
  if (!result.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

export async function getReadyRows(): Promise<QueueRow[]> {
  const sheets = sheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: `${config.GOOGLE_SHEET_TAB}!A2:J`,
  });

  return (result.data.values ?? [])
    .map((values, index) => ({
      rowNumber: index + 2,
      topic: values[0] ?? "",
      instructions: values[1] ?? "",
      status: values[2] ?? "",
      youtubeId: values[7] ?? "",
    }))
    .filter(
      (row) =>
        row.topic &&
        row.status.toUpperCase() === queueStatus.ready &&
        !row.youtubeId,
    )
    .slice(0, config.MAX_JOBS_PER_RUN);
}

export async function claimRow(row: QueueRow) {
  const sheets = sheetsClient();
  const cell = `${config.GOOGLE_SHEET_TAB}!C${row.rowNumber}`;
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: cell,
  });
  if (current.data.values?.[0]?.[0] !== queueStatus.ready) return false;
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: `${config.GOOGLE_SHEET_TAB}!C${row.rowNumber}:J${row.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          queueStatus.processing,
          "",
          "",
          "",
          "",
          "",
          "",
          new Date().toISOString(),
        ],
      ],
    },
  });
  return true;
}

export async function updateRow(
  rowNumber: number,
  values: Partial<{
    status: string;
    script: string;
    title: string;
    description: string;
    videoUrl: string;
    youtubeId: string;
    error: string;
  }>,
) {
  const sheets = sheetsClient();
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: `${config.GOOGLE_SHEET_TAB}!C${rowNumber}:J${rowNumber}`,
  });
  const row = existing.data.values?.[0] ?? [];
  const next = [
    values.status ?? row[0] ?? "",
    values.script ?? row[1] ?? "",
    values.title ?? row[2] ?? "",
    values.description ?? row[3] ?? "",
    values.videoUrl ?? row[4] ?? "",
    values.youtubeId ?? row[5] ?? "",
    values.error ?? row[6] ?? "",
    new Date().toISOString(),
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: `${config.GOOGLE_SHEET_TAB}!C${rowNumber}:J${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [next] },
  });
}
