import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { deleteUser } from '@/app/actions';
import HRTable from '@/components/HRTable';

export default async function HRPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const users = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' }
    },
    include: {
      monthlyParticipations: {
        where: { yearMonth: { startsWith: new Date().getFullYear().toString() } }
      }
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });

  const isHR = session?.user?.role === 'HR' || session?.user?.role === 'ADMIN';

  const formatCurrency = (amount: number | null | undefined) => {
    if (!isHR) return '***,***,***'; // Masked
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString() + ' 원';
  };

  // KPI Calculations
  const totalUsers = users.length;
  const regularCount = users.filter((u) => u.affiliation !== '프리랜서' && !u.affiliation?.includes('프리랜서')).length;
  const freelanceCount = users.filter((u) => u.affiliation === '프리랜서' || u.affiliation?.includes('프리랜서')).length;
  const totalGrossSalary = users.reduce((sum, u) => sum + (u.grossSalary || 0), 0);
  const totalInsurances = users.reduce((sum, u) => sum + (u.fourInsurances || 0), 0);
  const totalCompensation = totalGrossSalary + totalInsurances;
  const avgParticipationRate = totalUsers > 0
    ? users.reduce((sum, u) => sum + (u.monthlyParticipations.reduce((pSum, p) => pSum + p.rate, 0) / 12), 0) / totalUsers
    : 0;
  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">인력 관리</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            연구과제에 참여 가능한 인력(당사 직원 및 프리랜서) 리스트 및 급여·참여율 종합 현황입니다.
          </p>
        </div>

        {isHR && (
          <Link href="/hr/new" className="btn btn-primary text-[13px] px-5 py-2.5 flex items-center gap-2 self-start sm:self-auto">
            <i className="fa-solid fa-user-plus text-[12px]"></i>
            <span>+ 신규 인력 등록</span>
          </Link>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">총 연구 인력</div>
          <div className="text-[26px] font-extrabold text-primary mt-2 font-mono">
            {totalUsers} <span className="text-[14px] font-normal text-gray-500">명</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1 font-medium">
            당사 직원 {regularCount}명 · 프리랜서 {freelanceCount}명
          </div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">총 세전 연봉 합계</div>
          <div className="text-[22px] font-bold text-primary mt-2 font-mono">
            {formatCurrency(totalGrossSalary)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">기본 세전 연봉 합산액</div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">4대보험 포함 총 인건비</div>
          <div className="text-[22px] font-bold text-secondary mt-2 font-mono">
            {formatCurrency(totalCompensation)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">세전연봉 + 4대보험 부담금</div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">연간 평균 참여율</div>
          <div className="text-[26px] font-extrabold text-secondary mt-2 font-mono">
            {avgParticipationRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-400 mt-1">{currentYear}년 기준 합산 평균 (1/12)</div>
        </div>
      </div>

      {/* Personnel List Table with Pagination & Rows per page */}
      <HRTable
        users={users}
        isHR={isHR}
        currentUserId={session.user.id}
        onDeleteUser={deleteUser}
      />
    </div>
  );
}
