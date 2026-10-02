import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function owner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, 'Please sign in.');
  return session.user.id;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin;
  if (origin !== expected) throw new HttpError(403, 'Request origin is not allowed.');
}
export async function jsonBody(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Expected JSON.');
  // Stream with a hard cap; do not trust Content-Length supplied by the client.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request body.');
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 1500000) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}
export function api(handler: () => Promise<Response>) {
  return handler().catch(error => {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return Response.json({ error: error.issues[0].message }, { status: 400 });
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please retry.' }, { status: 500 });
  });
}
