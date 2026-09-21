import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginRedirect from './LoginRedirect';

/**
 * kws_rnd는 자체 로그인 폼을 두지 않고 kws-auth로 위임한다(SSO).
 * kws-auth 로그인 성공 후 공유 세션 쿠키를 타고 여기로 돌아온다.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email) {
    const session = await getServerSession();
    if (session) redirect(resolvedSearchParams.redirect || '/');

    // kws-auth SSO로 로그인은 됐지만 이 서비스(rnd)엔 접근 권한이 없는 경우
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-lowest py-12 px-4 absolute inset-0 z-50">
        <div className="max-w-md w-full text-center space-y-3 bg-surface p-8 rounded-lg shadow-card border border-border">
          <h2 className="text-[20px] font-bold text-primary">RND 과제 관리 접근 권한이 없습니다</h2>
          <p className="text-[14px] text-gray-500">{user.email} 계정에는 아직 접근 권한이 없습니다.</p>
          <p className="text-[13px] text-gray-400">
            kws-auth 관리자 화면(/admin/services)에서 &quot;RND 과제 관리&quot; 서비스에 역할을 배정받은 뒤 다시 접속해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-lowest py-12 px-4 absolute inset-0 z-50">
      <div className="text-center space-y-3">
        <p className="text-[14px] text-gray-500">로그인 페이지로 이동 중...</p>
      </div>
      <LoginRedirect redirectTo={resolvedSearchParams.redirect} />
    </div>
  );
}
