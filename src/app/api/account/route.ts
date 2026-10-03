import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { api, checkOrigin, jsonBody, owner } from '@/lib/http';

const deleteAccountSchema = z.object({ confirmation: z.literal('DELETE MY ACCOUNT') }).strict();

export const DELETE = (request: Request) => api(async () => {
  checkOrigin(request);
  const userId = await owner();
  deleteAccountSchema.parse(await jsonBody(request));
  const anonymousId = `deleted:${randomUUID()}`;

  const result = await db.$transaction(async tx => {
    const [participating, bidding, winning] = await Promise.all([
      tx.participant.findMany({ where: { userId, event: { ownerId: { not: userId } } }, select: { eventId: true } }),
      tx.bid.findMany({ where: { bidderId: userId, event: { ownerId: { not: userId } } }, distinct: ['eventId'], select: { eventId: true } }),
      tx.entry.findMany({ where: { winnerId: userId, event: { ownerId: { not: userId } } }, distinct: ['eventId'], select: { eventId: true } }),
    ]);
    const affectedEventIds = [...new Set([...participating, ...bidding, ...winning].map(item => item.eventId))];

    await tx.entry.updateMany({ where: { winnerId: userId }, data: { winnerId: anonymousId, winner: 'Deleted bidder' } });
    await tx.bid.updateMany({ where: { bidderId: userId }, data: { bidderId: anonymousId, bidderName: 'Deleted bidder' } });
    await tx.participant.deleteMany({ where: { userId } });
    if (affectedEventIds.length) await tx.event.updateMany({ where: { id: { in: affectedEventIds } }, data: { version: { increment: 1 } } });

    const deletedEvents = await tx.event.deleteMany({ where: { ownerId: userId } });
    const deletedUploads = await tx.upload.deleteMany({ where: { ownerId: userId } });
    return { deletedEvents: deletedEvents.count, deletedUploads: deletedUploads.count, anonymizedEvents: affectedEventIds.length };
  }, { timeout: 15000 });

  return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
});
