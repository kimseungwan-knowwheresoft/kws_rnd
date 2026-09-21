import { cache } from 'react';
import prisma from './prisma';
import { createClient } from './supabase/server';

/**
 * kws-auth(Supabase Auth) SSO로 전환 — NextAuth Credentials는 더 이상 쓰지 않는다.
 * 로그인/비밀번호 검증은 전부 kws-auth가 담당하고, 여기서는 그 세션 쿠키를 읽어
 * 이메일로 이 서비스(rnd)의 User 레코드를 찾아 업무 role(ADMIN/PM/HR/RESEARCHER)을 부여한다.
 *
 * 기존 코드 전역이 `getServerSession(authOptions)` 형태를 쓰고 있어서, 호출부 수정 없이
 * import만 next-auth → 이 파일로 바꾸도록 같은 이름/시그니처의 드롭인 함수를 제공한다.
 */
export const authOptions = {} as const; // 호환용 — 실제로는 사용되지 않음

export interface RndSessionUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface RndSession {
  user: RndSessionUser;
}

export const getServerSession = cache(async (_authOptions?: unknown): Promise<RndSession | null> => {
  const supabase = await createClient();
  const { data: { user: supaUser } } = await supabase.auth.getUser();
  if (!supaUser?.email) return null;

  let dbUser = await prisma.user.findUnique({ where: { email: supaUser.email } });
  // rnd 서비스에 등록되지 않은 사용자(kws-auth 로그인은 됐지만 이 서비스엔 계정이 없음) — 접근 불가
  if (!dbUser) return null;

  if (!dbUser.authUserId) {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { authUserId: supaUser.id },
    });
  }

  return {
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email!,
      role: dbUser.role,
    },
  };
});
