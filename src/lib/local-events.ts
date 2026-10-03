import { parseCsv, priceSchema } from './validation';

const KEY = 'make-your-bid:guest-events:v1';

export type GuestEntry = {
  id: string; name: string; basePriceCents: number; imageUrl: string | null;
  position: number; status: string; soldPriceCents: number | null;
  winner: string | null; winnerId?: string | null; saleMode: string | null;
};
export type GuestParticipant = { id: string; userId: string; name: string; status: string; budgetCents: number };
export type GuestBid = {
  id: string; entryId: string; bidderId: string; bidderName: string;
  amountCents: number; chargedCents: number;
};
export type GuestEvent = {
  id: string; name: string; category: string; mode: 'LOCAL'; status: string;
  roundMode: string; orderMode: string; version: number; updatedAt: string;
  startingBudgetCents: number; participants: GuestParticipant[];
  entries: GuestEntry[]; bids: GuestBid[];
};

function all(): GuestEvent[] {
  try { return (JSON.parse(localStorage.getItem(KEY) || '[]') as GuestEvent[]).map(event => ({ ...event, orderMode: event.orderMode ?? 'ORDERED', startingBudgetCents: event.startingBudgetCents ?? 10000, participants: event.participants ?? [] })); }
  catch { return []; }
}

function save(events: GuestEvent[]) {
  try { localStorage.setItem(KEY, JSON.stringify(events)); }
  catch { throw new Error('This browser has run out of local storage. Remove an image or an old event and try again.'); }
  window.dispatchEvent(new Event('make-your-bid:local-change'));
}

export function listGuestEvents() { return all().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function getGuestEvent(id: string) { return all().find(event => event.id === id) || null; }
export function createGuestEvent(name: string, category: string) {
  const event: GuestEvent = { id: crypto.randomUUID(), name: name.trim(), category, mode: 'LOCAL', status: 'DRAFT', roundMode: 'NORMAL', orderMode: 'ORDERED', version: 0, updatedAt: new Date().toISOString(), startingBudgetCents: 10000, participants: [], entries: [], bids: [] };
  save([event, ...all()]);
  return event;
}

function current(event: GuestEvent, entryId?: string) {
  const entry = event.entries.find(item => item.status === 'PENDING');
  if (!entry || entry.id !== entryId || event.status !== 'LIVE') throw new Error('This is no longer the current entry.');
  return entry;
}

function finish(event: GuestEvent) {
  event.roundMode = 'NORMAL';
  if (!event.entries.some(entry => entry.status === 'PENDING')) event.status = 'COMPLETED';
}

function remaining(event: GuestEvent, userId: string) {
  const person = event.participants.find(item => item.userId === userId);
  if (!person) return 0;
  const normalSpent = event.entries.filter(entry => entry.status === 'SOLD' && entry.saleMode !== 'REVERSE' && entry.winnerId === userId).reduce((sum, entry) => sum + (entry.soldPriceCents || 0), 0);
  const reverseSpent = event.bids.filter(bid => bid.bidderId === userId).reduce((sum, bid) => sum + bid.chargedCents, 0);
  return person.budgetCents - normalSpent - reverseSpent;
}

export function guestCommand(id: string, data: Record<string, unknown>): GuestEvent | { deleted: true } {
  const events = all();
  const event = events.find(item => item.id === id);
  if (!event) throw new Error('Local event not found in this browser.');
  const editable = () => { if (!['DRAFT', 'PAUSED'].includes(event.status)) throw new Error('Pause bidding to edit entries.'); };
  const entryInput = data.entry as { name: string; basePrice: string; imageUrl: string };
  const entryDetails = () => ({ name: entryInput.name.trim(), basePriceCents: priceSchema.parse(entryInput.basePrice), imageUrl: entryInput.imageUrl.trim() || null });
  switch (data.action) {
    case 'startingBudget': {
      if (event.status !== 'DRAFT') throw new Error('Set the default budget before starting.');
      event.startingBudgetCents = priceSchema.parse(data.amount);
      event.participants.forEach(person => { person.budgetCents = event.startingBudgetCents; });
      break;
    }
    case 'addBidders': {
      editable();
      const names = data.names as string[];
      if (event.participants.length + names.length > 200) throw new Error('Maximum 200 bidders per event.');
      const known = new Set(event.participants.map(person => person.name.toLocaleLowerCase()));
      for (const rawName of names) {
        const name = rawName.trim();
        if (!name || known.has(name.toLocaleLowerCase())) throw new Error(`Bidder ${name || '(empty)'} is already listed or empty.`);
        known.add(name.toLocaleLowerCase());
        event.participants.push({ id: crypto.randomUUID(), userId: `local:${crypto.randomUUID()}`, name, status: 'APPROVED', budgetCents: event.startingBudgetCents });
      }
      break;
    }
    case 'updateBidder': {
      editable();
      const person = event.participants.find(item => item.id === data.bidderId);
      if (!person) throw new Error('Bidder not found.');
      const name = String(data.name).trim();
      const amount = priceSchema.parse(data.amount);
      if (event.participants.some(item => item.id !== person.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Another bidder has that name.');
      const currentEntry = event.entries.find(entry => entry.status === 'PENDING');
      const activeBid = event.bids.filter(bid => bid.entryId === currentEntry?.id && bid.bidderId === person.userId).at(-1)?.amountCents || 0;
      if (amount < person.budgetCents - remaining(event, person.userId) + activeBid) throw new Error('Budget cannot be below spent units and the current bid.');
      event.entries.filter(entry => entry.winnerId === person.userId).forEach(entry => { entry.winner = name; });
      event.bids.filter(bid => bid.bidderId === person.userId).forEach(bid => { bid.bidderName = name; });
      person.name = name; person.budgetCents = amount; break;
    }
    case 'removeBidder': {
      editable();
      const person = event.participants.find(item => item.id === data.bidderId);
      if (!person) throw new Error('Bidder not found.');
      if (event.entries.some(entry => entry.winnerId === person.userId) || event.bids.some(bid => bid.bidderId === person.userId)) throw new Error('This bidder already has auction activity. Reset the event to remove them.');
      event.participants = event.participants.filter(item => item.id !== person.id); break;
    }
    case 'add': {
      editable();
      if (event.entries.length >= 500) throw new Error('Maximum 500 entries per event.');
      event.entries.push({ id: crypto.randomUUID(), ...entryDetails(), position: (event.entries.at(-1)?.position ?? -1) + 1, status: 'PENDING', soldPriceCents: null, winner: null, winnerId: null, saleMode: null });
      break;
    }
    case 'addMany': {
      editable();
      const rows = data.entries as { name: string; basePrice: string; imageUrl: string }[];
      if (event.entries.length + rows.length > 500) throw new Error('Maximum 500 entries per event.');
      let position = (event.entries.at(-1)?.position ?? -1) + 1;
      for (const row of rows) event.entries.push({ id: crypto.randomUUID(), name: row.name.trim(), basePriceCents: priceSchema.parse(row.basePrice), imageUrl: row.imageUrl || null, position: position++, status: 'PENDING', soldPriceCents: null, winner: null, winnerId: null, saleMode: null });
      break;
    }
    case 'edit': {
      editable();
      const entry = event.entries.find(item => item.id === data.entryId && item.status === 'PENDING');
      if (!entry) throw new Error('Pending entry not found.');
      Object.assign(entry, entryDetails()); break;
    }
    case 'remove': {
      editable();
      event.entries = event.entries.filter(entry => entry.id !== data.entryId);
      break;
    }
    case 'import': {
      editable();
      const rows = parseCsv(String(data.csv));
      if (event.entries.length + rows.length > 500) throw new Error('Maximum 500 entries per event.');
      let position = (event.entries.at(-1)?.position ?? -1) + 1;
      for (const row of rows) event.entries.push({ id: crypto.randomUUID(), name: row.name, basePriceCents: row.basePrice, imageUrl: row.imageUrl || null, position: position++, status: 'PENDING', soldPriceCents: null, winner: null, winnerId: null, saleMode: null });
      break;
    }
    case 'reorder': {
      editable();
      const ids = data.ids as string[];
      if (ids.length !== event.entries.length || new Set(ids).size !== ids.length || ids.some(entryId => !event.entries.some(entry => entry.id === entryId))) throw new Error('Order must contain every entry.');
      event.entries.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      event.entries.forEach((entry, index) => { entry.position = index; });
      break;
    }
    case 'start': {
      if (event.status !== 'DRAFT' || !event.entries.length) throw new Error('Add entries before starting.');
      if (data.order === 'shuffle' || data.order === 'hidden') for (let i = event.entries.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [event.entries[i], event.entries[j]] = [event.entries[j], event.entries[i]]; }
      event.entries.forEach((entry, index) => { entry.position = index; });
      event.status = 'LIVE'; event.roundMode = 'NORMAL'; event.orderMode = data.order === 'hidden' ? 'HIDDEN' : data.order === 'shuffle' ? 'SHUFFLED' : 'ORDERED'; break;
    }
    case 'pause': {
      if (event.status !== 'LIVE') throw new Error('Event is not live.');
      event.status = 'PAUSED'; break;
    }
    case 'resume': {
      if (event.status !== 'PAUSED' || !event.entries.some(entry => entry.status === 'PENDING')) throw new Error('Add a pending entry before resuming.');
      event.status = 'LIVE'; break;
    }
    case 'roundMode': {
      if (!['LIVE', 'PAUSED'].includes(event.status)) throw new Error('Start the event first.');
      const entry = event.entries.find(item => item.status === 'PENDING');
      if (!entry || event.bids.some(bid => bid.entryId === entry.id)) throw new Error('Change mode before bids are placed.');
      if (data.mode !== 'NORMAL' && data.mode !== 'REVERSE') throw new Error('Invalid round mode.');
      event.roundMode = data.mode; break;
    }
    case 'sell': {
      const entry = current(event, String(data.entryId));
      if (event.roundMode !== 'NORMAL') throw new Error('Use reverse bids for this round.');
      const price = priceSchema.parse(data.price);
      if (price < entry.basePriceCents) throw new Error('Winning bid must meet the base price.');
      const person = event.participants.length ? event.participants.find(item => item.userId === data.winnerId) : undefined;
      if (event.participants.length && !person) throw new Error('Choose a bidder from the roster.');
      if (person && price > remaining(event, person.userId)) throw new Error('Winning price exceeds this bidder’s remaining units.');
      entry.status = 'SOLD'; entry.winner = person?.name || String(data.winner).trim(); entry.winnerId = person?.userId || null; entry.soldPriceCents = price; entry.saleMode = 'NORMAL'; finish(event); break;
    }
    case 'reverseBid': {
      const entry = current(event, String(data.entryId));
      if (event.roundMode !== 'REVERSE') throw new Error('Enable reverse bidding first.');
      const amount = priceSchema.parse(data.amount);
      if (amount < entry.basePriceCents) throw new Error('Bid must meet the base price.');
      const person = event.participants.length ? event.participants.find(item => item.userId === data.bidderId) : undefined;
      if (event.participants.length && !person) throw new Error('Choose a bidder from the roster.');
      const bidderName = person?.name || String(data.bidder).trim();
      const bidderId = person?.userId || `local:${bidderName.toLocaleLowerCase()}`;
      if (person && amount > remaining(event, bidderId)) throw new Error('Bid exceeds this bidder’s remaining units.');
      const previous = event.bids.filter(bid => bid.entryId === entry.id && bid.bidderId === bidderId).at(-1);
      if (previous && amount >= previous.amountCents) throw new Error('A revised reverse bid must be lower.');
      event.bids.push({ id: crypto.randomUUID(), entryId: entry.id, bidderId, bidderName, amountCents: amount, chargedCents: 0 }); break;
    }
    case 'reverseAward': {
      const entry = current(event, String(data.entryId));
      if (event.roundMode !== 'REVERSE') throw new Error('Enable reverse bidding first.');
      const latest = new Map<string, GuestBid>();
      for (const bid of event.bids.filter(bid => bid.entryId === entry.id)) latest.set(bid.bidderId, bid);
      const offers = [...latest.values()].sort((a, b) => a.amountCents - b.amountCents);
      if (!offers.length) throw new Error('Record at least one bid.');
      for (const bid of offers) bid.chargedCents = bid.amountCents;
      entry.status = 'SOLD'; entry.winner = offers[0].bidderName; entry.winnerId = offers[0].bidderId; entry.soldPriceCents = offers[0].amountCents; entry.saleMode = 'REVERSE'; finish(event); break;
    }
    case 'skip': {
      const entry = current(event, String(data.entryId));
      event.bids = event.bids.filter(bid => bid.entryId !== entry.id);
      event.entries = event.entries.filter(item => item.id !== entry.id);
      event.entries.push(entry);
      event.entries.forEach((item, index) => { item.position = index; });
      event.roundMode = 'NORMAL'; break;
    }
    case 'unsold': {
      const entry = current(event, String(data.entryId));
      entry.status = 'UNSOLD'; entry.saleMode = event.roundMode; finish(event); break;
    }
    case 'reset': {
      event.entries.forEach(entry => { entry.status = 'PENDING'; entry.winner = null; entry.winnerId = null; entry.soldPriceCents = null; entry.saleMode = null; });
      event.bids = []; event.status = 'DRAFT'; event.roundMode = 'NORMAL'; event.orderMode = 'ORDERED'; break;
    }
    case 'delete': save(events.filter(item => item.id !== id)); return { deleted: true };
    default: throw new Error('Unknown action.');
  }
  event.version++;
  event.updatedAt = new Date().toISOString();
  save(events);
  return event;
}
