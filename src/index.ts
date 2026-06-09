import { claimRow, ensureSheet, getReadyRows } from "./providers/sheets.js";
import { processRow } from "./pipeline.js";

await ensureSheet();
const rows = await getReadyRows();

if (!rows.length) {
  console.log("No READY rows found.");
}

for (const row of rows) {
  if (!(await claimRow(row))) continue;
  console.log(`Processing row ${row.rowNumber}: ${row.topic}`);
  try {
    await processRow(row);
    console.log(`Completed row ${row.rowNumber}`);
  } catch (error) {
    console.error(`Failed row ${row.rowNumber}`, error);
  }
}
