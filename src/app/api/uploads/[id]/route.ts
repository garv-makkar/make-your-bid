import { db } from '@/lib/db';
import { api, HttpError, owner } from '@/lib/http';
export const GET = (_request: Request, context: { params: Promise<{ id: string }> }) => api(async () => {
  const userId = await owner(); const { id } = await context.params;
  const upload = await db.upload.findUnique({ where: { id } });
  if (!upload) throw new HttpError(404, 'Image not found.');
  if (upload.ownerId !== userId) {
    const accessible = await db.entry.findFirst({ where: { imageUrl: `/api/uploads/${id}`, event: { mode: 'ONLINE', participants: { some: { userId, status: 'APPROVED' } } } }, select: { id: true } });
    if (!accessible) throw new HttpError(404, 'Image not found.');
  }
  return new Response(new Uint8Array(upload.data), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
});
