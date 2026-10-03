import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createGuestEvent, getGuestEvent, guestCommand } from '../src/lib/local-events';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
} });
Object.defineProperty(globalThis, 'window', { value: { dispatchEvent: () => {} } });
beforeEach(() => values.clear());

test('local reverse rounds cannot be sold through the normal round action', () => {
  const event = createGuestEvent('Auction', 'Items');
  const added = guestCommand(event.id, { action: 'add', entry: { name: 'Item', basePrice: '1', imageUrl: '' } });
  assert.ok(!('deleted' in added));
  guestCommand(event.id, { action: 'start', order: 'ordered' });
  guestCommand(event.id, { action: 'roundMode', mode: 'REVERSE' });
  assert.throws(() => guestCommand(event.id, { action: 'sell', entryId: added.entries[0].id, winner: 'Ada', price: '5' }), /reverse bids/);
  assert.equal(getGuestEvent(event.id)?.entries[0].status, 'PENDING');
});

test('local pause and resume require the correct event state', () => {
  const event = createGuestEvent('Auction', 'Items');
  assert.throws(() => guestCommand(event.id, { action: 'pause' }), /not live/);
  assert.throws(() => guestCommand(event.id, { action: 'resume' }), /pending entry/);
  guestCommand(event.id, { action: 'add', entry: { name: 'Item', basePrice: '1', imageUrl: '' } });
  guestCommand(event.id, { action: 'start', order: 'ordered' });
  guestCommand(event.id, { action: 'pause' });
  assert.equal(getGuestEvent(event.id)?.status, 'PAUSED');
  guestCommand(event.id, { action: 'resume' });
  assert.equal(getGuestEvent(event.id)?.status, 'LIVE');
});
