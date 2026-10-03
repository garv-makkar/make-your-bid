import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { api, checkOrigin, HttpError, jsonBody } from '@/lib/http';
import { priceSchema } from '@/lib/validation';
import { activeBids, closeEntry, remainingBudget } from '@/lib/rounds';
import { summarizeAuction } from '@/lib/auction-summary';

type Context = { params: Promise<{ id: string }> };

type ExpirableEvent = { id: string; status: string; timerEndsAt: Date | null; version: number; roundMode: string };

async function settleExpired(event: ExpirableEvent) {
  if (event.status !== 'LIVE' || !event.timerEndsAt || event.timerEndsAt > new Date()) return;
  await db.$transaction(async tx => {
    const locked = await tx.event.updateMany({ where: { id: event.id, version: event.version, status: 'LIVE', timerEndsAt: { lte: new Date() } }, data: { version: { increment: 1 }, timerEndsAt: null } });
    if (!locked.count) return;
    const current = await tx.entry.findFirst({ where: { eventId: event.id, status: 'PENDING' }, orderBy: { position: 'asc' } });
    if (!current) return;
    const bids = await activeBids(tx, current.id);
    await closeEntry(tx, event.id, current, event.roundMode, bids.length ? 'award' : 'skip');
  });
}

async function identity() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, 'Please sign in.');
  return { id: session.user.id, name: session.user.name || session.user.email || 'Bidder' };
}

export const GET = (request: Request, context: Context) => api(async () => {
  const user = await identity();
  const { id } = await context.params;
  const loadRoom = () => db.event.findUnique({ where: { id }, include: { entries: { orderBy: { position: 'asc' } }, participants: { orderBy: { createdAt: 'asc' } }, bids: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } });
  const versionParam = new URL(request.url).searchParams.get('version');
  const knownVersion = versionParam && /^\d+$/.test(versionParam) ? Number(versionParam) : null;

  if (knownVersion !== null) {
    let snapshot = await db.event.findUnique({ where: { id }, select: { id: true, mode: true, status: true, version: true, timerEndsAt: true, roundMode: true } });
    if (!snapshot || snapshot.mode !== 'ONLINE') throw new HttpError(404, 'Online room not found.');
    if (snapshot.status === 'LIVE' && snapshot.timerEndsAt && snapshot.timerEndsAt <= new Date()) {
      await settleExpired(snapshot);
      snapshot = await db.event.findUnique({ where: { id }, select: { id: true, mode: true, status: true, version: true, timerEndsAt: true, roundMode: true } });
      if (!snapshot) throw new HttpError(404, 'Online room not found.');
    }
    if (snapshot.version === knownVersion) return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
  }

  let event = await loadRoom();
  if (event?.status === 'LIVE' && event.timerEndsAt && event.timerEndsAt <= new Date()) {
    await settleExpired(event);
    event = await loadRoom();
  }
  if (!event || event.mode !== 'ONLINE') throw new HttpError(404, 'Online room not found.');
  const host = event.ownerId === user.id;
  const me = event.participants.find(participant => participant.userId === user.id);
  const canView = host || me?.status === 'APPROVED';
  const current = canView ? event.entries.find(entry => entry.status === 'PENDING') : undefined;
  const bids = current ? event.bids.filter(bid => bid.entryId === current.id) : [];
  const latest = new Map<string, typeof bids[number]>();
  for (const bid of bids) latest.set(bid.bidderId, bid);
  const offers = [...latest.values()].sort((a, b) => event.roundMode === 'REVERSE' ? a.amountCents - b.amountCents || a.createdAt.getTime() - b.createdAt.getTime() : b.amountCents - a.amountCents || a.createdAt.getTime() - b.createdAt.getTime());
  const leading = offers[0];
  const spent = (userId: string) => event.entries.filter(entry => entry.status === 'SOLD' && entry.saleMode !== 'REVERSE' && entry.winnerId === userId).reduce((sum, entry) => sum + (entry.soldPriceCents || 0), 0) + event.bids.filter(bid => bid.bidderId === userId).reduce((sum, bid) => sum + bid.chargedCents, 0);
  return Response.json({
    id: event.id, name: event.name, category: event.category, status: event.status, version: event.version, startingBudgetCents: event.startingBudgetCents, timerEndsAt: event.timerEndsAt, roundMode: event.roundMode, orderMode: event.orderMode,
    role: host ? 'HOST' : me?.status || 'VISITOR',
    balance: me ? { budgetCents: me.budgetCents, remainingCents: me.budgetCents - spent(user.id), won: event.entries.filter(entry => entry.winnerId === user.id).map(entry => ({ name: entry.name, priceCents: entry.soldPriceCents })) } : null,
    current: current ? { id: current.id, name: current.name, basePriceCents: current.basePriceCents, imageUrl: current.imageUrl } : null,
    leading: leading ? { amountCents: leading.amountCents, bidderName: leading.bidderName, mine: leading.bidderId === user.id } : null,
    myOfferCents: canView ? latest.get(user.id)?.amountCents ?? null : null,
    offerCount: canView ? offers.length : 0,
    entries: canView ? event.entries.map(entry => ({ id: entry.id, name: event.orderMode === 'HIDDEN' && event.status !== 'COMPLETED' && entry.status === 'PENDING' && entry.id !== current?.id ? null : entry.name, status: entry.status, winner: entry.winner, soldPriceCents: entry.soldPriceCents, saleMode: entry.saleMode })) : [],
    summary: canView && event.status === 'COMPLETED' ? summarizeAuction(event.entries, event.bids) : null,
    participants: host ? event.participants.map(participant => ({ id: participant.id, name: participant.name, status: participant.status, budgetCents: participant.budgetCents, remainingCents: participant.budgetCents - spent(participant.userId), won: event.entries.filter(entry => entry.winnerId === participant.userId).map(entry => ({ name: entry.name, priceCents: entry.soldPriceCents })) })) : [],
  }, { headers: { 'Cache-Control': 'private, no-store' } });
});

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('join') }),
  z.object({ action: z.literal('decide'), participantId: z.string(), approve: z.boolean() }),
  z.object({ action: z.literal('startingBudget'), amount: priceSchema }),
  z.object({ action: z.literal('budget'), participantId: z.string(), amount: priceSchema }),
  z.object({ action: z.literal('roundMode'), version: z.number().int().nonnegative(), mode: z.enum(['NORMAL', 'REVERSE']) }),
  z.object({ action: z.literal('timer'), version: z.number().int().nonnegative(), seconds: z.union([z.literal(10), z.literal(15), z.literal(30)]) }),
  z.object({ action: z.literal('cancelTimer'), version: z.number().int().nonnegative() }),
  z.object({ action: z.literal('bid'), version: z.number().int().nonnegative(), entryId: z.string(), amount: priceSchema }),
  z.object({ action: z.literal('award'), version: z.number().int().nonnegative(), entryId: z.string() }),
  z.object({ action: z.literal('unsold'), version: z.number().int().nonnegative(), entryId: z.string() }),
  z.object({ action: z.literal('skip'), version: z.number().int().nonnegative(), entryId: z.string() }),
]);

export const POST = (request: Request, context: Context) => api(async () => {
  checkOrigin(request);
  const user = await identity();
  const { id } = await context.params;
  const action = actionSchema.parse(await jsonBody(request));
  const event = await db.event.findUnique({ where: { id } });
  if (!event || event.mode !== 'ONLINE') throw new HttpError(404, 'Online room not found.');
  if (event.status === 'LIVE' && event.timerEndsAt && event.timerEndsAt <= new Date()) {
    await settleExpired(event);
    throw new HttpError(409, 'The timer ended. Refresh the room to continue.');
  }
  const host = event.ownerId === user.id;
  if (action.action === 'join') {
    if (host) throw new HttpError(400, 'You are the host.');
    await db.$transaction([
      db.participant.upsert({ where: { eventId_userId: { eventId: id, userId: user.id } }, create: { eventId: id, userId: user.id, name: user.name, budgetCents: event.startingBudgetCents }, update: {} }),
      db.event.update({ where: { id }, data: { version: { increment: 1 } } }),
    ]);
    return Response.json({ ok: true });
  }
  if (action.action === 'decide') {
    if (!host) throw new HttpError(403, 'Only the host can approve bidders.');
    await db.$transaction(async tx => {
      const changed = await tx.participant.updateMany({ where: { id: action.participantId, eventId: id }, data: { status: action.approve ? 'APPROVED' : 'REJECTED' } });
      if (!changed.count) throw new HttpError(404, 'Join request not found.');
      await tx.event.update({ where: { id }, data: { version: { increment: 1 } } });
    });
    return Response.json({ ok: true });
  }
  if (action.action === 'startingBudget') {
    if (!host) throw new HttpError(403, 'Only the host can set the starting balance.');
    if (event.status !== 'DRAFT') throw new HttpError(409, 'Starting balance can only change before the first round.');
    await db.$transaction([db.event.update({ where: { id }, data: { startingBudgetCents: action.amount, version: { increment: 1 } } }), db.participant.updateMany({ where: { eventId: id }, data: { budgetCents: action.amount } })]);
    return Response.json({ ok: true });
  }
  if (action.action === 'budget') {
    if (!host) throw new HttpError(403, 'Only the host can set budgets.');
    if (event.status !== 'DRAFT' && event.status !== 'PAUSED') throw new HttpError(409, 'Pause bidding to change budgets.');
    const participant = await db.participant.findFirst({ where: { id: action.participantId, eventId: id } });
    if (!participant) throw new HttpError(404, 'Bidder not found.');
    const spent = await db.$transaction(tx => remainingBudget(tx, id, participant.userId, participant.budgetCents));
    if (action.amount < participant.budgetCents - spent) throw new HttpError(400, 'Budget cannot be less than the bidder has already spent.');
    await db.$transaction([
      db.participant.update({ where: { id: participant.id }, data: { budgetCents: action.amount } }),
      db.event.update({ where: { id }, data: { version: { increment: 1 } } }),
    ]);
    return Response.json({ ok: true });
  }
  if (action.action === 'timer' || action.action === 'cancelTimer') {
    if (!host || event.status !== 'LIVE') throw new HttpError(403, 'Only the host can control the live timer.');
    const changed = await db.event.updateMany({ where: { id, version: action.version, status: 'LIVE', OR: [{ timerEndsAt: null }, { timerEndsAt: { gt: new Date() } }] }, data: { version: { increment: 1 }, timerEndsAt: action.action === 'timer' ? new Date(Date.now() + action.seconds * 1000) : null } });
    if (!changed.count) throw new HttpError(409, 'Room changed. Refresh and try again.');
    return Response.json({ ok: true });
  }
  if (action.action === 'roundMode') {
    if (!host || !['LIVE', 'PAUSED'].includes(event.status)) throw new HttpError(403, 'Only the host can change the current round.');
    await db.$transaction(async tx => {
      const locked = await tx.event.updateMany({ where: { id, version: action.version, status: event.status, OR: [{ timerEndsAt: null }, { timerEndsAt: { gt: new Date() } }] }, data: { version: { increment: 1 } } });
      if (!locked.count) throw new HttpError(409, 'Room changed. Refresh and try again.');
      const current = await tx.entry.findFirst({ where: { eventId: id, status: 'PENDING' }, orderBy: { position: 'asc' } });
      if (!current || await tx.bid.count({ where: { entryId: current.id } })) throw new HttpError(409, 'Change mode before anyone bids on this entry.');
      await tx.event.update({ where: { id }, data: { roundMode: action.mode, timerEndsAt: null } });
    });
    return Response.json({ ok: true });
  }
  const result = await db.$transaction(async tx => {
    const locked = await tx.event.updateMany({ where: { id, version: action.version, status: 'LIVE', OR: [{ timerEndsAt: null }, { timerEndsAt: { gt: new Date() } }] }, data: { version: { increment: 1 }, ...(action.action !== 'bid' ? { timerEndsAt: null } : {}) } });
    if (!locked.count) throw new HttpError(409, 'Room changed. Refresh and try again.');
    const current = await tx.entry.findFirst({ where: { eventId: id, status: 'PENDING' }, orderBy: { position: 'asc' } });
    if (!current || current.id !== action.entryId) throw new HttpError(409, 'This entry is no longer open.');
    if (action.action === 'bid') {
      const participant = await tx.participant.findUnique({ where: { eventId_userId: { eventId: id, userId: user.id } } });
      if (!participant || participant.status !== 'APPROVED') throw new HttpError(403, 'Host approval is required to bid.');
      const bids = await activeBids(tx, current.id);
      const leading = [...bids].sort((a, b) => event.roundMode === 'REVERSE' ? a.amountCents - b.amountCents : b.amountCents - a.amountCents)[0];
      const previous = bids.find(bid => bid.bidderId === user.id);
      if (action.amount < current.basePriceCents) throw new HttpError(400, 'Bid must meet the base price.');
      if (event.roundMode === 'NORMAL' && leading && action.amount <= leading.amountCents) throw new HttpError(400, 'Bid must exceed the current offer.');
      if (event.roundMode === 'REVERSE' && previous && action.amount >= previous.amountCents) throw new HttpError(400, 'A revised reverse bid must be lower than your previous bid.');
      if (action.amount > await remainingBudget(tx, id, user.id, participant.budgetCents)) throw new HttpError(400, 'Bid exceeds your remaining units.');
      await tx.bid.create({ data: { eventId: id, entryId: current.id, bidderId: user.id, bidderName: participant.name, amountCents: action.amount } });
    } else {
      if (!host) throw new HttpError(403, 'Only the host can close bidding.');
      await closeEntry(tx, id, current, event.roundMode, action.action === 'award' ? 'award' : action.action === 'skip' ? 'skip' : 'pass');
    }
    return { ok: true };
  }, { timeout: 15000 });
  return Response.json(result);
});
