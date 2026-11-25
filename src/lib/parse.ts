import type { StatRow } from './types';

export const MAX_ROWS = 5000;
export const MAX_CHARS = 5_000_000;

export interface ParseResult {
  rows: StatRow[];
  errors: string[];
}

const NUMERIC = ['calls', 'total_exec_time', 'mean_exec_time', 'rows', 'shared_blks_hit', 'shared_blks_read'] as const;

/** RFC 4180 style CSV parser: handles quoted fields, escaped quotes and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') out.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') out.push(row);
  return out;
}

function toRecords(text: string): Record<string, unknown>[] | string {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : [data];
      // `SELECT json_agg(t)` can come back wrapped as [[{...}]] from some clients.
      const flat = arr.length === 1 && Array.isArray(arr[0]) ? arr[0] : arr;
      if (!flat.every((r: unknown) => r && typeof r === 'object' && !Array.isArray(r))) {
        return 'JSON must be an array of objects, one object per query.';
      }
      return flat as Record<string, unknown>[];
    } catch {
      return 'Could not read this as JSON. Check for a trailing comma or truncated paste.';
    }
  }
  const table = parseCsv(trimmed);
  if (table.length < 2) return 'CSV needs a header row and at least one data row.';
  const header = table[0].map((h) => h.trim().toLowerCase());
  return table.slice(1).map((cells) => {
    const rec: Record<string, unknown> = {};
    header.forEach((h, i) => (rec[h] = cells[i]));
    return rec;
  });
}

function num(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseInput(text: string): ParseResult {
  if (!text.trim()) return { rows: [], errors: ['Paste a pg_stat_statements export (JSON or CSV) first.'] };
  if (text.length > MAX_CHARS) return { rows: [], errors: ['Input is larger than 5 MB. Export fewer rows (LIMIT 200 is plenty).'] };

  const records = toRecords(text);
  if (typeof records === 'string') return { rows: [], errors: [records] };
  if (records.length > MAX_ROWS) return { rows: [], errors: [`Too many rows (${records.length}). The limit is ${MAX_ROWS}.`] };

  const rows: StatRow[] = [];
  const errors: string[] = [];
  records.forEach((raw, idx) => {
    const rec: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) rec[k.trim().toLowerCase()] = v;
    const line = idx + 1;
    const query = String(rec.query ?? rec.query_text ?? '').trim();
    if (!query) return void errors.push(`Row ${line}: missing "query" column.`);
    const calls = num(rec.calls);
    if (calls === null || calls < 1) return void errors.push(`Row ${line}: "calls" must be a number of at least 1.`);

    const total = num(rec.total_exec_time ?? rec.total_time);
    const meanGiven = num(rec.mean_exec_time ?? rec.mean_time);
    if (total === null && meanGiven === null)
      return void errors.push(`Row ${line}: needs total_exec_time or mean_exec_time (milliseconds).`);
    const total_exec_time = total ?? (meanGiven as number) * calls;
    const mean_exec_time = meanGiven ?? total_exec_time / calls;

    const row: StatRow = {
      queryid: String(rec.queryid ?? `row-${line}`),
      query,
      calls,
      total_exec_time,
      mean_exec_time,
      rows: 0,
      shared_blks_hit: 0,
      shared_blks_read: 0,
    };
    for (const key of NUMERIC) {
      if (key === 'calls' || key === 'total_exec_time' || key === 'mean_exec_time') continue;
      const v = num(rec[key]);
      if (v !== null) row[key] = v;
    }
    rows.push(row);
  });

  if (rows.length === 0 && errors.length === 0) errors.push('No rows found.');
  return { rows, errors: errors.slice(0, 10).concat(errors.length > 10 ? [`...and ${errors.length - 10} more.`] : []) };
}
