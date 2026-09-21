import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server Component/Route Handler에서 kws-auth SSO 세션 쿠키를 읽기 위한 클라이언트.
 * service_role 키는 쓰지 않는다 — 사용자 세션(Auth) 조회만 하고, 실제 데이터는 Prisma로 접근한다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: process.env.NEXT_PUBLIC_COOKIE_DOMAIN
        ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
        : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서는 쿠키 쓰기가 막혀있음 — 다음 요청(미들웨어/Route Handler)에서 갱신됨
          }
        },
      },
    },
  );
}
