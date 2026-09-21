import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginButton from './LoginButton';

/**
 * kws_rnd는 자체 로그인 폼을 두지 않고 kws-auth로 위임한다(SSO).
 * kws-auth 로그인 성공 후 공유 세션 쿠키를 타고 여기로 돌아온다.
 * 로그아웃 직후 등 미인증 상태에서 곧바로 다른 도메인으로 튕기면 어색해 보여서,
 * 이 페이지 자체에서 버튼을 눌러야 kws-auth로 이동하도록 한다(자동 리다이렉트 아님).
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
      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-lg shadow-card border border-border">
        <div>
          <div className="flex justify-center">
            <Image src="/logo.png" alt="KnowWhereSoft Logo" width={180} height={50} className="object-contain" priority />
          </div>
          <h2 className="mt-6 text-center text-[32px] font-bold text-primary">시스템 로그인</h2>
          <p className="mt-2 text-center text-[14px] text-gray-500">사내 R&D 및 인력 통합 관리 시스템</p>
        </div>
        <LoginButton redirectTo={resolvedSearchParams.redirect} />
      </div>
    </div>
  );
}
