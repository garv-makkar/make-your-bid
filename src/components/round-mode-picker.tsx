import { roundDurations, roundModes, roundRules, type RoundMode } from '@/lib/round-modes';

export function RoundModePicker({ mode, duration, disabled, onChange, onDurationChange, title }: {
  mode: string; duration: number; disabled: boolean; onChange: (mode: RoundMode) => void;
  onDurationChange: (seconds: number) => void; title: string;
}) {
  return <section className="round-picker" aria-label={title}>
    <div className="round-picker-heading"><h3>{title}</h3><span>{disabled ? 'Mode locked after the first bid' : 'Choose before bids are placed'}</span></div>
    <div className="round-mode-options">{roundModes.map(option => <button key={option.id} type="button" className={`round-mode-option${mode === option.id ? ' selected' : ''}`} aria-pressed={mode === option.id} disabled={disabled || mode === option.id} onClick={() => onChange(option.id)}><strong>{option.name}</strong><span>{option.rules}</span></button>)}</div>
    {mode === 'TIMED' && <label className="round-duration">Round length<select value={duration} disabled={disabled} onChange={e => onDurationChange(Number(e.target.value))}>{roundDurations.map(seconds => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>}
    <div className="round-rules"><strong>Rules for this round</strong><p>{roundRules(mode).rules}</p></div>
  </section>;
}
