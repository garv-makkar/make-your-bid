import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeAuction } from '../src/lib/auction-summary';

test('summary counts unsold entries and includes every final reverse bid in collected units', () => {
  const summary = summarizeAuction([
    { id: 'normal', name: 'Painting', status: 'SOLD', winner: 'Ada', soldPriceCents: 1200, saleMode: 'NORMAL' },
    { id: 'reverse', name: 'Sculpture', status: 'SOLD', winner: 'Ben', soldPriceCents: 300, saleMode: 'REVERSE' },
    { id: 'unsold', name: 'Vase', status: 'UNSOLD', winner: null, soldPriceCents: null, saleMode: 'NORMAL' },
  ], [{ chargedCents: 300 }, { chargedCents: 500 }, { chargedCents: 0 }]);

  assert.deepEqual(summary, { soldCount: 2, unsoldCount: 1, collectedCents: 2000 });
});
