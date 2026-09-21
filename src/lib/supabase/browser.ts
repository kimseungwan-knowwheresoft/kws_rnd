'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * kws-auth/그룹웨어와 같은 kws-brand Supabase 프로젝트를 그대로 사용 — 계정을 공유한다(SSO).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: process.env.NEXT_PUBLIC_COOKIE_DOMAIN
        ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
        : undefined,
    },
  );
}
