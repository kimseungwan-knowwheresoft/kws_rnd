import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { updateUser, updatePassword, deleteUser } from '@/app/actions';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import HRUserForm from '@/components/HRUserForm';

export default async function EditHRPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const isHR = session.user.role === 'HR' || session.user.role === 'ADMIN';
  if (!isHR) {
    return (
      <div className="glass-panel p-12 text-center max-w-2xl mx-auto mt-12">
        <h2 className="text-[28px] font-bold text-primary">접근 권한 없음</h2>
        <p className="text-[14px] text-gray-500 mt-2">
          인력 관리자(HR) 및 시스템 관리자(Admin)만 인력 정보를 수정할 수 있습니다.
        </p>
        <Link href="/hr" className="btn btn-primary mt-6 inline-flex">
          인력 관리로 돌아가기
        </Link>
      </div>
    );
  }

  const resolvedParams = await params;
  const user = await prisma.user.findUnique({
    where: { id: resolvedParams.id }
  });

  if (!user) return notFound();

  const isSelf = session.user.id === user.id;

  const handleUpdate = async (formData: FormData) => {
    'use server';
    await updateUser(user.id, formData);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-gray-500">
        <Link href="/hr" className="hover:text-primary transition-colors flex items-center gap-1.5">
          <i className="fa-solid fa-users text-[12px]"></i>
          <span>인력 관리</span>
        </Link>
        <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
        <span className="font-semibold text-primary">{user.name} 님 정보 수정</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[30px] font-bold text-primary tracking-tight">인력 정보 수정</h1>
            <span className="badge bg-surface-container text-primary font-bold">
              {user.role}
            </span>
          </div>
          <p className="text-[14px] text-gray-500 mt-1 font-mono">
            {user.email} (ID: {user.id})
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <HRUserForm
        initialData={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          joinDate: user.joinDate ? user.joinDate.toISOString() : null,
          grossSalary: user.grossSalary,
          fourInsurances: user.fourInsurances,
          nationality: user.nationality,
          affiliation: user.affiliation,
          birthDateAndGender: user.birthDateAndGender,
          degree: user.degree,
          major: user.major,
          degreeYear: user.degreeYear,
          researcherNumber: user.researcherNumber,
        }}
        formAction={handleUpdate}
        isEdit={true}
      />

      {/* Danger Zone: User Deletion */}
      <div className="bg-[#ffe9ee] rounded-xl border border-tertiary/40 p-6 mt-8 space-y-4">
        <div className="flex items-center gap-2 text-tertiary font-bold text-[18px]">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>위험 관리: 인력 데이터 영구 삭제</span>
        </div>
        <p className="text-[14px] text-tertiary leading-relaxed">
          해당 인력을 삭제하면 시스템 계정과 과제 배정 정보가 영구적으로 삭제되며 복구할 수 없습니다.
        </p>

        {isSelf ? (
          <div className="p-3 bg-white/70 rounded-lg text-gray-600 text-[13px] font-medium border border-tertiary/30">
            ⚠️ 현재 로그인 중인 본인의 계정은 직접 삭제할 수 없습니다.
          </div>
        ) : (
          <ConfirmDeleteButton
            action={async () => {
              'use server';
              await deleteUser(user.id);
            }}
            message="해당 직원을 영구 삭제하시겠습니까?"
            label="직원 영구 삭제"
            className="btn bg-tertiary hover:bg-tertiary/90 text-white text-[13px] font-bold px-6"
          />
        )}
      </div>
    </div>
  );
}
