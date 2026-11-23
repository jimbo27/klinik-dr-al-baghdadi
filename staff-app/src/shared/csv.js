// CSV cell escaping, shared by the server export and the admin page export.
// Cells that start with = + - @ tab or CR are prefixed with ' so spreadsheet
// apps don't run them as formulas (CSV injection).
export function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export const csvRow = (cells) => cells.map(csvCell).join(",");
