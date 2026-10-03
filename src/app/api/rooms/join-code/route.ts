import { z } from 'zod';
import { db } from '@/lib/db';
import { api, checkOrigin, HttpError, jsonBody, owner } from '@/lib/http';

export const POST = (request: Request) => api(async () => {
  checkOrigin(request);
  await owner();
  const body = await jsonBody(request);
  const code = z.string().transform(value => value.replace(/[-\s]/g, '').toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{12}$/, 'Enter a valid 12-character room code.')).parse(body.code);
  const event = await db.event.findUnique({ where: { joinCode: code }, select: { id: true, mode: true } });
  if (!event || event.mode !== 'ONLINE') throw new HttpError(404, 'No online room matches that code. Check it and try again.');
  return Response.json({ id: event.id });
});
