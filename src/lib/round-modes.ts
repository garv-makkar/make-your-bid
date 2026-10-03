export type RoundMode = 'NORMAL' | 'REVERSE' | 'SEALED' | 'TIMED';

export const roundModes: { id: RoundMode; name: string; rules: string }[] = [
  { id: 'NORMAL', name: 'Open bidding', rules: 'Bidders can see the leading offer. The highest bid wins and only the winner pays.' },
  { id: 'REVERSE', name: 'Reverse bidding', rules: 'The lowest final bid wins. Every participating bidder pays their own final bid.' },
  { id: 'SEALED', name: 'Sealed bids', rules: 'Offers stay private while the round is open. The host closes bidding; the highest bid wins, ties go to the earliest offer, and only the winner pays.' },
  { id: 'TIMED', name: 'Timed bidding', rules: 'Bidders can see the leading offer. When the countdown ends, the highest bid wins; if nobody bids, the entry is unsold.' },
];

export function roundRules(mode: string) { return roundModes.find(item => item.id === mode) ?? roundModes[0]; }
export const roundDurations = [15, 30, 60] as const;
