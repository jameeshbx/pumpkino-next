/**
 * CSV export helper. Handles quoting and the formula-injection class of
 * attacks (cells starting with = + - @ are prefixed with a apostrophe so
 * spreadsheet apps don't execute them).
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (value: string | number | null | undefined): string => {
    let s = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function csvResponseInit(filename: string): ResponseInit {
  return {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  };
}
