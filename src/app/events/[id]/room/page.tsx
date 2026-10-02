import { getServerSession } from 'next-auth';
import { authOptions, googleEnabled } from '@/lib/auth';
import { Room } from '@/components/room';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  return <Room id={id} signedIn={Boolean(session?.user?.id)} googleEnabled={googleEnabled} />;
}
