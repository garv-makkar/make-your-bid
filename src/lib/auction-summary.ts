export type SummaryEntry = {
  id: string;
  name: string | null;
  status: string;
  winner: string | null;
  winnerId?: string | null;
  soldPriceCents: number | null;
  saleMode: string | null;
};

export type SummaryBid = { chargedCents: number };

export function summarizeAuction(entries: SummaryEntry[], bids: SummaryBid[]) {
  const sold = entries.filter(entry => entry.status === 'SOLD');
  return {
    soldCount: sold.length,
    unsoldCount: entries.filter(entry => entry.status === 'UNSOLD').length,
    collectedCents: sold.filter(entry => entry.saleMode !== 'REVERSE').reduce((sum, entry) => sum + (entry.soldPriceCents ?? 0), 0)
      + bids.reduce((sum, bid) => sum + bid.chargedCents, 0),
  };
}
