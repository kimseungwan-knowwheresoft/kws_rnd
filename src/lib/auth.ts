import { cache } from 'react';
import prisma from './prisma';
import { createClient } from './supabase/server';

/**
 * kws-auth(Supabase Auth) SSO로 전환 — NextAuth Credentials는 더 이상 쓰지 않는다.
 * 로그인/비밀번호 검증은 전부 kws-auth가 담당하고, 여기서는 그 세션 쿠키를 읽어
 * 이메일로 이 서비스(rnd)의 User 레코드를 찾아 업무 role(ADMIN/PM/HR/RESEARCHER)을 부여한다.
 *
 * 최초 접근 시 kws_rnd에 User 레코드가 아직 없으면, kws-auth `/admin/services`에서
 * 이 사용자에게 "rnd" 서비스 역할이 부여되어 있는지 확인해서 있으면 자동으로 만든다 —
 * 그래야 "서비스 접근 관리는 kws-auth 관리자 화면에서" 라는 기대와 실제 동작이 일치한다.
 * 세부 업무 role(특히 HR)은 자동 생성 이후 이 앱의 인력 관리 화면에서 조정하면 된다.
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

// iam.service_role(admin/manager/editor/viewer/member) -> kws_rnd 업무 role
function toAppRole(serviceRole: string): string {
  switch (serviceRole) {
    case 'admin':
      return 'ADMIN';
    case 'manager':
    case 'editor':
      return 'PM';
    default:
      return 'RESEARCHER';
  }
}

export const getServerSession = cache(async (_authOptions?: unknown): Promise<RndSession | null> => {
  const supabase = await createClient();
  const { data: { user: supaUser } } = await supabase.auth.getUser();
  if (!supaUser?.email) return null;

  let dbUser = await prisma.user.findUnique({ where: { email: supaUser.email } });

  if (!dbUser) {
    // kws_rnd에 아직 계정이 없음 — kws-auth "서비스 관리"에서 rnd 서비스 역할이 부여되어 있으면 자동 등록
    const { data: serviceRole } = await supabase
      .schema('iam')
      .from('user_service_roles')
      .select('role, service:services!inner(slug)')
      .eq('user_id', supaUser.id)
      .eq('service.slug', 'rnd')
      .maybeSingle();

    if (!serviceRole) return null; // 정말 권한 없음

    dbUser = await prisma.user.create({
      data: {
        email: supaUser.email,
        name: (supaUser.user_metadata?.full_name as string | undefined) ?? supaUser.email.split('@')[0],
        role: toAppRole(serviceRole.role as string),
        authUserId: supaUser.id,
      },
    });
  }

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
