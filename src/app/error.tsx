'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main><h1>Something went wrong</h1><p>Check your connection and try again.</p><button onClick={reset}>Try again</button><a href="/">Back to events</a></main>; }
