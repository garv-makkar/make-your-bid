import { isSportsCategory } from '@/lib/validation';

export function EntryFacts({ entry, category }: { entry: { role?: string | null; specialty?: string | null; description?: string | null }; category: string }) {
  const role = isSportsCategory(category) ? [entry.role, entry.specialty].filter(Boolean).join(' · ') : '';
  if (!role && !entry.description) return null;
  return <span className="entry-meta">{role && <span>{role}</span>}{entry.description && <span>{entry.description}</span>}</span>;
}
