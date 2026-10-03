import type { Entry, Prisma } from '@prisma/client';
import { HttpError } from './http';

type Tx = Prisma.TransactionClient;

export async function remainingBudget(tx: Tx, eventId: string, userId: string, budgetCents: number) {
  const normal = await tx.entry.aggregate({ where: { eventId, winnerId: userId, status: 'SOLD', OR: [{ saleMode: { in: ['NORMAL', 'SEALED', 'TIMED'] } }, { saleMode: null }] }, _sum: { soldPriceCents: true } });
  const reverse = await tx.bid.aggregate({ where: { eventId, bidderId: userId }, _sum: { chargedCents: true } });
  return budgetCents - (normal._sum.soldPriceCents || 0) - (reverse._sum.chargedCents || 0);
}

export async function activeBids(tx: Tx, entryId: string) {
  const bids = await tx.bid.findMany({ where: { entryId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  const latest = new Map<string, typeof bids[number]>();
  for (const bid of bids) latest.set(bid.bidderId, bid);
  return [...latest.values()];
}

export async function closeEntry(tx: Tx, eventId: string, entry: Entry, mode: string, action: 'award' | 'pass' | 'skip') {
  if (action === 'skip') {
    const last = await tx.entry.aggregate({ where: { eventId }, _max: { position: true } });
    await tx.bid.deleteMany({ where: { entryId: entry.id } });
    await tx.entry.update({ where: { id: entry.id }, data: { position: (last._max.position ?? 0) + 1 } });
    await tx.event.update({ where: { id: eventId }, data: { roundMode: 'NORMAL', timerEndsAt: null } });
    return;
  }
  await tx.event.update({ where: { id: eventId }, data: { roundMode: 'NORMAL', timerEndsAt: null } });
  if (action === 'pass') {
    await tx.entry.update({ where: { id: entry.id }, data: { status: 'UNSOLD', winner: null, winnerId: null, soldPriceCents: null, saleMode: mode } });
  } else {
    const bids = await activeBids(tx, entry.id);
    if (!bids.length) throw new HttpError(400, 'No bids yet. Skip this entry or mark it unsold.');
    bids.sort((a, b) => mode === 'REVERSE' ? a.amountCents - b.amountCents || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id) : b.amountCents - a.amountCents || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    const winner = bids[0];
    if (mode === 'REVERSE') {
      for (const bid of bids) await tx.bid.update({ where: { id: bid.id }, data: { chargedCents: bid.amountCents } });
    }
    await tx.entry.update({ where: { id: entry.id }, data: { status: 'SOLD', winner: winner.bidderName, winnerId: winner.bidderId, soldPriceCents: winner.amountCents, saleMode: mode } });
  }
  if (!await tx.entry.count({ where: { eventId, status: 'PENDING' } })) await tx.event.update({ where: { id: eventId }, data: { status: 'COMPLETED' } });
}
