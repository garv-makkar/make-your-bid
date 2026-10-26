'use client';

import { isSportsCategory } from '@/lib/validation';
import { StyledSelect } from './styled-select';

export function AuctionTypePicker({ category, onChange }: { category: string; onChange: (category: string) => void }) {
  const sports = isSportsCategory(category);
  return <div className="auction-type-picker">
    <span className="auction-type-label">Auction type</span>
    <div className="auction-type-options">
      <button type="button" className={sports ? 'selected' : ''} aria-pressed={sports} onClick={() => onChange('Football')}><strong>Sports</strong><small>Players, teams, and sporting talent</small></button>
      <button type="button" className={!sports ? 'selected' : ''} aria-pressed={!sports} onClick={() => onChange('Basic')}><strong>Basic</strong><small>Any kind of entry</small></button>
    </div>
    {sports && <StyledSelect label="Sport" value={category} onChange={onChange} options={[{ value: 'Football', label: 'Football' }, { value: 'Cricket', label: 'Cricket' }, { value: 'Other sport', label: 'Other sport' }]} />}
  </div>;
}
