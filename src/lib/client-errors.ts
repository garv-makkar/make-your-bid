export async function apiError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null);
  const message = typeof body?.error === 'string' ? body.error : '';
  if (response.status === 401) return new Error('Your session has expired. Sign in again to continue.');
  if (response.status === 429) return new Error('Too many requests. Wait a moment and try again.');
  if (response.status >= 500) return new Error('The server could not complete this request. Please try again.');
  if (message === 'Request origin is not allowed.') return new Error('This request could not be verified. Refresh the page and try again.');
  if (message) return new Error(message);
  return new Error(fallback);
}

export function displayError(caught: unknown, fallback: string): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'You are offline. Connect to the internet and try again.';
  if (caught instanceof TypeError && /fetch|network/i.test(caught.message)) return 'Could not connect. Check your connection and try again.';
  if (caught instanceof SyntaxError) return fallback;
  return caught instanceof Error && caught.message ? caught.message : fallback;
}
