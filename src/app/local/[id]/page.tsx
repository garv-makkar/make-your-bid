import { GuestEventPage } from '@/components/guest-event';
export default async function LocalEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuestEventPage id={id} />;
}
