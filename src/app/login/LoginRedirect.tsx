'use client';

import { useEffect } from 'react';

export default function LoginRedirect({ redirectTo }: { redirectTo?: string }) {
  useEffect(() => {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3012';
    const back = redirectTo ?? '/';
    const returnTo = `${window.location.origin}${back}`;
    window.location.replace(`${authUrl}/login?redirect=${encodeURIComponent(returnTo)}`);
  }, [redirectTo]);

  return null;
}
