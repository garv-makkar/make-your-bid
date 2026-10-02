import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { db } from '@/lib/db';
import { api, checkOrigin, HttpError, owner } from '@/lib/http';

export const POST = (request: Request) => api(async () => {
  checkOrigin(request); const ownerId = await owner();
  const type = request.headers.get('content-type') || '';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new HttpError(400, 'Choose a PNG, JPEG or WebP image.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing image.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 3 * 1024 * 1024) { await reader.cancel(); throw new HttpError(413, 'Image must be 3 MB or smaller.'); }
    chunks.push(value);
  }
  let data: Buffer;
  try { data = await sharp(Buffer.concat(chunks), { limitInputPixels: 20000000 }).rotate().resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(); }
  catch { throw new HttpError(400, 'Invalid image. Use a PNG, JPEG or WebP up to 20 megapixels.'); }
  const id = randomUUID();
  await db.upload.create({ data: { id, ownerId, data: new Uint8Array(data) } });
  return Response.json({ url: `/api/uploads/${id}` }, { status: 201 });
});
