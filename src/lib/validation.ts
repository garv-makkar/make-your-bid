import { z } from 'zod';
import Papa from 'papaparse';

export const MAX_ENTRIES = 500;
export const priceSchema = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const raw = String(value).trim() || '1';
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0 || Number(raw) > 10000000) {
    ctx.addIssue({ code: 'custom', message: 'Price must be positive, at most 10,000,000 units, with up to 2 decimal places.' });
    return z.NEVER;
  }
  return Math.round(Number(raw) * 100);
});
const imageSchema = z.string().trim().max(2048).default('').refine(value => {
  if (!value || /^\/api\/uploads\/[a-f0-9-]{36}$/.test(value)) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Image must be an HTTP(S) link.');
export const entrySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  basePrice: priceSchema.default(1),
  imageUrl: imageSchema,
});
export const eventSchema = z.object({ name: z.string().trim().min(1).max(120), category: z.enum(['Players', 'Items', 'Other']) });
export type EntryInput = z.input<typeof entrySchema>;

export function parseCsv(text: string) {
  if (new TextEncoder().encode(text).length > 1024 * 1024) throw new Error('CSV must be 1 MB or smaller.');
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { delimiter: ',', skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error(`CSV error: ${parsed.errors[0].message}`);
  const rows = parsed.data;
  if (!rows.length) throw new Error('CSV is empty.');
  const header = rows[0].map(v => v.trim().toLowerCase().replace(/[_-]/g, ' '));
  const hasHeader = header[0] === 'name' && (header.length === 1 || ['base price', 'baseprice', 'price'].includes(header[1]));
  const data = hasHeader ? rows.slice(1) : rows;
  if (!data.length || data.length > MAX_ENTRIES) throw new Error(`CSV must contain 1–${MAX_ENTRIES} entries.`);
  return data.map((row, index) => {
    const rowNumber = index + (hasHeader ? 2 : 1);
    if (row.length < 1 || row.length > 3) throw new Error(`Row ${rowNumber}: expected name, optional base price, optional image link.`);
    const result = entrySchema.safeParse({ name: row[0], basePrice: row[1] ?? '', imageUrl: row[2] ?? '' });
    if (!result.success) throw new Error(`Row ${rowNumber}: ${result.error.issues[0].message}`);
    if (result.data.imageUrl.startsWith('/')) throw new Error(`Row ${rowNumber}: CSV images must use HTTP(S) links.`);
    return result.data;
  });
}

export function formatPrice(cents: number) { return (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
