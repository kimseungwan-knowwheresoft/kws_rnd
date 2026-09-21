import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createUser } from '@/app/actions';
import HRUserForm from '@/components/HRUserForm';

export default async function NewHRPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const isHR = session.user.role === 'HR' || session.user.role === 'ADMIN';
  if (!isHR) {
    return (
      <div className="glass-panel p-12 text-center max-w-2xl mx-auto mt-12">
        <h2 className="text-[28px] font-bold text-primary">접근 권한 없음</h2>
        <p className="text-[14px] text-gray-500 mt-2">
          인력 관리자(HR) 및 시스템 관리자(Admin)만 신규 인력을 등록할 수 있습니다.
        </p>
        <Link href="/hr" className="btn btn-primary mt-6 inline-flex">
          인력 관리로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-gray-500">
        <Link href="/hr" className="hover:text-primary transition-colors flex items-center gap-1.5">
          <i className="fa-solid fa-users text-[12px]"></i>
          <span>인력 관리</span>
        </Link>
        <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
        <span className="font-semibold text-primary">신규 인력 등록</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">신규 인력 등록</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            회사에 새로 합류한 연구원 또는 관리자의 계정 및 급여/인력 정보를 등록합니다.
          </p>
        </div>
      </div>

      {/* Form */}
      <HRUserForm formAction={createUser} isEdit={false} />
    </div>
  );
}
