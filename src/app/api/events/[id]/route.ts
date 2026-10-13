import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { api, checkOrigin, HttpError, jsonBody, owner } from '@/lib/http';
import { entrySchema, eventSchema, MAX_ENTRIES, parseCsv, priceSchema } from '@/lib/validation';
import { activeBids, closeEntry, remainingBudget } from '@/lib/rounds';

type Context = { params: Promise<{ id: string }> };
export const GET = (_request: Request, context: Context) => api(async () => {
  const ownerId = await owner(); const { id } = await context.params;
  const event = await db.event.findFirst({ where: { id, ownerId }, include: { entries: { orderBy: { position: 'asc' } }, bids: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, participants: { orderBy: { createdAt: 'asc' } } } });
  if (!event) throw new HttpError(404, 'Event not found.');
  return Response.json(event);
});

const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), ...eventSchema.shape }),
  z.object({ action: z.literal('openRoom') }),
  z.object({ action: z.literal('add'), entry: entrySchema }),
  z.object({ action: z.literal('addMany'), entries: z.array(entrySchema).min(1).max(MAX_ENTRIES) }),
  z.object({ action: z.literal('startingBudget'), amount: priceSchema }),
  z.object({ action: z.literal('addBidders'), names: z.array(z.string().trim().min(1).max(120)).min(1).max(200) }),
  z.object({ action: z.literal('updateBidder'), bidderId: z.string(), name: z.string().trim().min(1).max(120), amount: priceSchema }),
  z.object({ action: z.literal('removeBidder'), bidderId: z.string() }),
  z.object({ action: z.literal('edit'), entryId: z.string(), entry: entrySchema }),
  z.object({ action: z.literal('remove'), entryId: z.string() }),
  z.object({ action: z.literal('import'), csv: z.string().max(1100000) }),
  z.object({ action: z.literal('reorder'), ids: z.array(z.string()).max(MAX_ENTRIES) }),
  z.object({ action: z.literal('start'), order: z.enum(['ordered', 'shuffle', 'hidden']) }),
  z.object({ action: z.literal('pause') }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('sell'), entryId: z.string(), winner: z.string().trim().min(1).max(120), winnerId: z.string().optional(), price: priceSchema }),
  z.object({ action: z.literal('unsold'), entryId: z.string() }),
  z.object({ action: z.literal('skip'), entryId: z.string() }),
  z.object({ action: z.literal('roundMode'), mode: z.enum(['NORMAL', 'REVERSE', 'SEALED', 'TIMED']) }),
  z.object({ action: z.literal('roundDuration'), seconds: z.union([z.literal(15), z.literal(30), z.literal(60)]) }),
  z.object({ action: z.literal('reverseBid'), entryId: z.string(), bidder: z.string().trim().min(1).max(120), bidderId: z.string().optional(), amount: priceSchema }),
  z.object({ action: z.literal('reverseAward'), entryId: z.string() }),
  z.object({ action: z.literal('recordBid'), entryId: z.string(), bidder: z.string().trim().min(1).max(120), bidderId: z.string().optional(), amount: priceSchema }),
  z.object({ action: z.literal('awardBids'), entryId: z.string() }),
  z.object({ action: z.literal('settleTimed'), entryId: z.string() }),
  z.object({ action: z.literal('reset') }),
  z.object({ action: z.literal('delete') }),
]);

export const POST = (request: Request, context: Context) => api(async () => {
  checkOrigin(request);
  const ownerId = await owner(); const { id } = await context.params;
  const body = await jsonBody(request);
  const version = z.number().int().nonnegative().parse(body.version);
  const command = commandSchema.parse(body);
  const result = await db.$transaction(async tx => {
    // Acquire the write lock and check ownership/version in a single statement.
    // Prevents stale tabs from recording a second result or replacing newer edits.
    const locked = await tx.event.updateMany({ where: { id, ownerId, version }, data: { version: { increment: 1 } } });
    if (!locked.count) {
      const exists = await tx.event.findFirst({ where: { id, ownerId } });
      throw new HttpError(exists ? 409 : 404, exists ? 'This event changed in another tab. Reload and try again.' : 'Event not found.');
    }
    const event = await tx.event.findUniqueOrThrow({ where: { id }, include: { entries: { orderBy: { position: 'asc' } }, participants: { orderBy: { createdAt: 'asc' } } } });
    if (event.mode === 'ONLINE' && event.status === 'LIVE' && event.timerEndsAt && event.timerEndsAt <= new Date()) {
      throw new HttpError(409, 'The timer ended. Open the bidding room to settle this round.');
    }
    if (event.mode === 'LOCAL' && event.status === 'LIVE' && event.roundMode === 'TIMED' && event.timerEndsAt && event.timerEndsAt <= new Date() && command.action !== 'settleTimed') throw new HttpError(409, 'The timer ended. Settle the timed round.');
    const editable = () => { if (!['DRAFT', 'PAUSED'].includes(event.status)) throw new HttpError(409, 'Pause bidding before managing entries. Completed events must be reset first.'); };
    const pendingEntry = (entryId: string) => {
      const entry = event.entries.find(e => e.id === entryId);
      if (!entry) throw new HttpError(404, 'Entry not found.');
      if (entry.status !== 'PENDING') throw new HttpError(409, 'Only pending entries can be changed.');
      return entry;
    };
    const checkImage = async (url: string) => {
      if (url.startsWith('/api/uploads/')) {
        const upload = await tx.upload.findFirst({ where: { id: url.split('/').pop(), ownerId } });
        if (!upload) throw new HttpError(400, 'Image upload not found.');
      }
    };
    if (
      event.mode === 'ONLINE' &&
      event.participants.length > 0 &&
      ['add', 'addMany', 'edit', 'remove', 'import', 'reorder'].includes(command.action)
    ) {
      throw new HttpError(409, 'Entries are locked after bidders join. Finish entry setup before inviting bidders.');
    }

    switch (command.action) {
      case 'openRoom': {
        if (event.mode !== 'ONLINE' || event.status !== 'DRAFT') throw new HttpError(409, 'Only draft online auctions can open a room.');
        if (!event.entries.length) throw new HttpError(409, 'Add entries before opening the bidding room.');
        if (!event.joinCode) await tx.event.update({ where: { id }, data: { joinCode: randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase() } });
        break;
      }
      case 'update':
        await tx.event.update({ where: { id }, data: { name: command.name, category: command.category } }); break;
      case 'startingBudget': {
        if (event.status !== 'DRAFT') throw new HttpError(409, 'Set the default budget before starting.');
        await tx.event.update({ where: { id }, data: { startingBudgetCents: command.amount } });
        await tx.participant.updateMany({ where: { eventId: id }, data: { budgetCents: command.amount } });
        break;
      }
      case 'addBidders': {
        editable();
        if (event.mode !== 'LOCAL') throw new HttpError(409, 'Online bidders join through the room link.');
        if (event.participants.length + command.names.length > 200) throw new HttpError(400, 'Maximum 200 bidders per event.');
        const known = new Set(event.participants.map(person => person.name.toLocaleLowerCase()));
        for (const name of command.names) {
          const key = name.toLocaleLowerCase();
          if (known.has(key)) throw new HttpError(400, `Bidder ${name} is already listed.`);
          known.add(key);
        }
        await tx.participant.createMany({ data: command.names.map(name => ({ eventId: id, userId: `local:${randomUUID()}`, name, status: 'APPROVED', budgetCents: event.startingBudgetCents })) });
        break;
      }
      case 'updateBidder': {
        editable();
        const person = event.participants.find(item => item.id === command.bidderId);
        if (!person) throw new HttpError(404, 'Bidder not found.');
        if (event.mode === 'LOCAL' && event.participants.some(item => item.id !== person.id && item.name.toLocaleLowerCase() === command.name.toLocaleLowerCase())) throw new HttpError(400, 'Another bidder has that name.');
        const remaining = await remainingBudget(tx, id, person.userId, person.budgetCents);
        const committed = event.entries.find(item => item.status === 'PENDING');
        const active = committed ? (await activeBids(tx, committed.id)).find(bid => bid.bidderId === person.userId)?.amountCents || 0 : 0;
        if (command.amount < person.budgetCents - remaining + active) throw new HttpError(400, 'Budget cannot be below spent units and the current bid.');
        await tx.participant.update({ where: { id: person.id }, data: { budgetCents: command.amount, ...(event.mode === 'LOCAL' ? { name: command.name } : {}) } });
        if (event.mode === 'LOCAL' && person.name !== command.name) {
          await tx.entry.updateMany({ where: { eventId: id, winnerId: person.userId }, data: { winner: command.name } });
          await tx.bid.updateMany({ where: { eventId: id, bidderId: person.userId }, data: { bidderName: command.name } });
        }
        break;
      }
      case 'removeBidder': {
        editable();
        if (event.mode !== 'LOCAL') throw new HttpError(409, 'Manage online bidders in the room.');
        const person = event.participants.find(item => item.id === command.bidderId);
        if (!person) throw new HttpError(404, 'Bidder not found.');
        if (event.entries.some(item => item.winnerId === person.userId) || await tx.bid.count({ where: { eventId: id, bidderId: person.userId } })) throw new HttpError(409, 'This bidder already has auction activity. Reset the event to remove them.');
        await tx.participant.delete({ where: { id: person.id } });
        break;
      }
      case 'add': {
        editable();
        if (event.entries.length >= MAX_ENTRIES) throw new HttpError(400, `Maximum ${MAX_ENTRIES} entries per event.`);
        await checkImage(command.entry.imageUrl);
        await tx.entry.create({ data: { eventId: id, name: command.entry.name, basePriceCents: command.entry.basePrice, imageUrl: command.entry.imageUrl || null, position: (event.entries.at(-1)?.position ?? -1) + 1 } }); break;
      }
      case 'addMany': {
        editable();
        if (event.entries.length + command.entries.length > MAX_ENTRIES) throw new HttpError(400, `Maximum ${MAX_ENTRIES} entries per event.`);
        for (const entry of command.entries) await checkImage(entry.imageUrl);
        const start = (event.entries.at(-1)?.position ?? -1) + 1;
        await tx.entry.createMany({ data: command.entries.map((entry, index) => ({ eventId: id, name: entry.name, basePriceCents: entry.basePrice, imageUrl: entry.imageUrl || null, position: start + index })) });
        break;
      }
      case 'edit':
        editable(); pendingEntry(command.entryId); await checkImage(command.entry.imageUrl);
        await tx.entry.update({ where: { id: command.entryId }, data: { name: command.entry.name, basePriceCents: command.entry.basePrice, imageUrl: command.entry.imageUrl || null } }); break;
      case 'remove':
        editable(); pendingEntry(command.entryId);
        await tx.entry.delete({ where: { id: command.entryId } }); break;
      case 'import': {
        editable();
        let entries;
        try { entries = parseCsv(command.csv); } catch (error) { throw new HttpError(400, (error as Error).message); }
        if (event.entries.length + entries.length > MAX_ENTRIES) throw new HttpError(400, `Maximum ${MAX_ENTRIES} entries per event.`);
        const start = (event.entries.at(-1)?.position ?? -1) + 1;
        await tx.entry.createMany({ data: entries.map((e, index) => ({ eventId: id, name: e.name, basePriceCents: e.basePrice, imageUrl: e.imageUrl || null, position: start + index })) }); break;
      }
      case 'reorder': {
        editable();
        if (command.ids.length !== event.entries.length || new Set(command.ids).size !== command.ids.length || command.ids.some(entryId => !event.entries.some(e => e.id === entryId))) throw new HttpError(400, 'Order must contain every entry exactly once.');
        for (const [position, entryId] of command.ids.entries()) await tx.entry.update({ where: { id: entryId }, data: { position } });
        break;
      }
      case 'start': {
        if (event.status !== 'DRAFT' || !event.entries.length) throw new HttpError(409, 'Add entries to a draft event before starting.');
        if (event.mode === 'ONLINE' && !event.joinCode) throw new HttpError(409, 'Open the bidding room before starting the online auction.');
        if (event.mode === 'ONLINE' && !event.participants.some(person => person.status === 'APPROVED')) throw new HttpError(409, 'Approve at least one bidder before starting the online auction.');
        if (command.order === 'shuffle' || command.order === 'hidden') {
          const entries = [...event.entries];
          for (let i = entries.length - 1; i > 0; i--) { const j = randomInt(i + 1); [entries[i], entries[j]] = [entries[j], entries[i]]; }
          for (const [position, entry] of entries.entries()) await tx.entry.update({ where: { id: entry.id }, data: { position } });
        }
        await tx.event.update({ where: { id }, data: { status: 'LIVE', timerEndsAt: event.roundMode === 'TIMED' ? new Date(Date.now() + event.roundDurationSeconds * 1000) : null, orderMode: command.order === 'hidden' ? 'HIDDEN' : command.order === 'shuffle' ? 'SHUFFLED' : 'ORDERED' } }); break;
      }
      case 'pause':
        if (event.status !== 'LIVE') throw new HttpError(409, 'Event is not live.');
        await tx.event.update({ where: { id }, data: { status: 'PAUSED', timerEndsAt: null } }); break;
      case 'resume':
        if (event.status !== 'PAUSED' || !event.entries.some(e => e.status === 'PENDING')) throw new HttpError(409, 'Add a pending entry before resuming.');
        await tx.event.update({ where: { id }, data: { status: 'LIVE', timerEndsAt: event.roundMode === 'TIMED' ? new Date(Date.now() + event.roundDurationSeconds * 1000) : null } }); break;
      case 'sell':
      case 'unsold':
      case 'skip':
      case 'reverseBid':
      case 'reverseAward':
      case 'recordBid':
      case 'awardBids':
      case 'settleTimed': {
        if (event.mode === 'ONLINE') throw new HttpError(409, 'Close online rounds in the bidding room.');
        const current = event.entries.find(e => e.status === 'PENDING');
        if (event.status !== 'LIVE' || current?.id !== command.entryId) throw new HttpError(409, 'This is no longer the current entry. Reload the event.');
        if (command.action === 'recordBid') {
          if (event.roundMode !== 'SEALED' && event.roundMode !== 'TIMED') throw new HttpError(409, 'Select sealed or timed bidding first.');
          if (event.roundMode === 'TIMED' && (!event.timerEndsAt || event.timerEndsAt <= new Date())) throw new HttpError(409, 'The timed round has ended.');
          if (command.amount < current.basePriceCents) throw new HttpError(400, 'Bid must meet the base price.');
          const registered = event.participants.length ? event.participants.find(person => person.userId === command.bidderId) : undefined;
          if (event.participants.length && !registered) throw new HttpError(400, 'Choose a bidder from the roster.');
          const bidderId = registered?.userId || `local:${command.bidder.toLocaleLowerCase()}`;
          if (registered && command.amount > await remainingBudget(tx, id, bidderId, registered.budgetCents)) throw new HttpError(400, 'Bid exceeds this bidder’s remaining units.');
          const previous = (await activeBids(tx, current.id)).find(bid => bid.bidderId === bidderId);
          if (event.roundMode === 'SEALED' && previous && command.amount <= previous.amountCents) throw new HttpError(400, 'A revised sealed bid must be higher.');
          if (event.roundMode === 'TIMED') {
            const leading = (await activeBids(tx, current.id)).sort((a, b) => b.amountCents - a.amountCents)[0];
            if (leading && command.amount <= leading.amountCents) throw new HttpError(400, 'Bid must exceed the leading offer.');
          }
          await tx.bid.create({ data: { eventId: id, entryId: current.id, bidderId, bidderName: registered?.name || command.bidder, amountCents: command.amount } });
        } else if (command.action === 'awardBids' || command.action === 'settleTimed') {
          if (command.action === 'awardBids' && event.roundMode !== 'SEALED') throw new HttpError(409, 'Select sealed bidding first.');
          if (command.action === 'settleTimed' && (event.roundMode !== 'TIMED' || !event.timerEndsAt || event.timerEndsAt > new Date())) throw new HttpError(409, 'The timed round is still open.');
          const bids = await activeBids(tx, current.id);
          if (!bids.length && command.action === 'awardBids') throw new HttpError(400, 'Record a sealed bid or mark the entry unsold.');
          await closeEntry(tx, id, current, event.roundMode, bids.length ? 'award' : 'pass');
        } else if (command.action === 'reverseBid') {
          if (event.roundMode !== 'REVERSE') throw new HttpError(409, 'Enable reverse bidding first.');
          if (command.amount < current.basePriceCents) throw new HttpError(400, 'Bid must meet the base price.');
          const registered = event.participants.length ? event.participants.find(person => person.userId === command.bidderId) : undefined;
          if (event.participants.length && !registered) throw new HttpError(400, 'Choose a bidder from the roster.');
          const bidderId = registered?.userId || `local:${command.bidder.toLocaleLowerCase()}`;
          if (registered && command.amount > await remainingBudget(tx, id, bidderId, registered.budgetCents)) throw new HttpError(400, 'Bid exceeds this bidder’s remaining units.');
          const previous = await tx.bid.findFirst({ where: { entryId: current.id, bidderId }, orderBy: { createdAt: 'desc' } });
          if (previous && command.amount >= previous.amountCents) throw new HttpError(400, 'A revised reverse bid must be lower than your previous bid.');
          await tx.bid.create({ data: { eventId: id, entryId: current.id, bidderId, bidderName: registered?.name || command.bidder, amountCents: command.amount } });
        } else if (command.action === 'reverseAward') {
          if (event.roundMode !== 'REVERSE') throw new HttpError(409, 'Enable reverse bidding first.');
          await closeEntry(tx, id, current, 'REVERSE', 'award');
        } else if (command.action === 'sell') {
          if (event.roundMode !== 'NORMAL') throw new HttpError(409, 'Use the bidding controls for this round mode.');
          if (command.price < current.basePriceCents) throw new HttpError(400, 'Winning price cannot be below base price.');
          const registered = event.participants.length ? event.participants.find(person => person.userId === command.winnerId) : undefined;
          if (event.participants.length && !registered) throw new HttpError(400, 'Choose a bidder from the roster.');
          if (registered && command.price > await remainingBudget(tx, id, registered.userId, registered.budgetCents)) throw new HttpError(400, 'Winning price exceeds this bidder’s remaining units.');
          await tx.entry.update({ where: { id: current.id }, data: { status: 'SOLD', winner: registered?.name || command.winner, winnerId: registered?.userId || null, soldPriceCents: command.price, saleMode: 'NORMAL' } });
          await tx.event.update({ where: { id }, data: { roundMode: 'NORMAL' } });
          if (event.entries.filter(e => e.status === 'PENDING').length === 1) await tx.event.update({ where: { id }, data: { status: 'COMPLETED' } });
        } else await closeEntry(tx, id, current, event.roundMode, command.action === 'skip' ? 'skip' : 'pass');
        break;
      }
      case 'roundMode': {
        if (!['DRAFT', 'LIVE', 'PAUSED'].includes(event.status)) throw new HttpError(409, 'Choose a mode before the auction ends.');
        const current = event.entries.find(e => e.status === 'PENDING');
        if (!current) throw new HttpError(409, 'No pending entry.');
        if (await tx.bid.count({ where: { entryId: current.id } })) throw new HttpError(409, 'This round already has bids. Close or skip it before changing mode.');
        await tx.event.update({ where: { id }, data: { roundMode: command.mode, timerEndsAt: command.mode === 'TIMED' && event.status === 'LIVE' ? new Date(Date.now() + event.roundDurationSeconds * 1000) : null } });
        break;
      }
      case 'roundDuration': {
        if (!['DRAFT', 'LIVE', 'PAUSED'].includes(event.status)) throw new HttpError(409, 'Auction already ended.');
        const current = event.entries.find(e => e.status === 'PENDING');
        if (current && await tx.bid.count({ where: { entryId: current.id } })) throw new HttpError(409, 'Change the timer before anyone bids.');
        await tx.event.update({ where: { id }, data: { roundDurationSeconds: command.seconds, timerEndsAt: event.roundMode === 'TIMED' && event.status === 'LIVE' ? new Date(Date.now() + command.seconds * 1000) : null } });
        break;
      }
      case 'reset':
        await tx.entry.updateMany({ where: { eventId: id }, data: { status: 'PENDING', winner: null, winnerId: null, soldPriceCents: null, saleMode: null } });
        await tx.bid.deleteMany({ where: { eventId: id } });
        await tx.event.update({ where: { id }, data: { status: 'DRAFT', timerEndsAt: null, roundMode: 'NORMAL', orderMode: 'ORDERED' } }); break;
      case 'delete':
        await tx.event.delete({ where: { id } }); return { deleted: true };
    }
    return tx.event.findUniqueOrThrow({ where: { id }, include: { entries: { orderBy: { position: 'asc' } }, bids: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, participants: { orderBy: { createdAt: 'asc' } } } });
  }, { timeout: 15000 });
  return Response.json(result);
});
