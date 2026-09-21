import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SettlementOverviewTable, { SettlementProject } from '@/components/SettlementOverviewTable';

export default async function ProjectSettlementPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Fetch all projects with budgets
  const rawProjects = await prisma.project.findMany({
    include: {
      budgets: {
        orderBy: [{ year: 'asc' }, { category: 'asc' }]
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Extract all distinct budget years
  const yearSet = new Set<number>();
  rawProjects.forEach((p) => {
    p.budgets.forEach((b) => {
      if (b.year) yearSet.add(b.year);
    });
  });

  // If no years recorded in budgets yet, default to current and next year
  if (yearSet.size === 0) {
    yearSet.add(2026);
    yearSet.add(2027);
  }

  const availableYears = Array.from(yearSet).sort((a, b) => a - b);

  // Transform to SettlementProject items
  const projects: SettlementProject[] = rawProjects.map((p) => ({
    id: p.id,
    title: p.title,
    programName: p.programName,
    projectNumber: p.projectNumber,
    status: p.status,
    startDate: p.startDate,
    endDate: p.endDate,
    leadAgency: p.leadAgency,
    piName: p.piName,
    budget: p.budget,
    budgets: p.budgets.map((b) => ({
      id: b.id,
      year: b.year,
      category: b.category,
      govFunding: b.govFunding,
      instCash: b.instCash,
      instGoods: b.instGoods,
      otherFunding: b.otherFunding,
      amount: b.amount,
      spentAmount: b.spentAmount
    }))
  }));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-1">
            <span className="font-medium text-primary">정산 관리</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
            <span className="text-secondary font-semibold">과제별 정산 관리</span>
          </div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">과제별 정산 관리</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            전체 초기 사업비 대비 집행 실적 및 잔여 예산을 프로젝트별로 모니터링하는 총괄표입니다.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/settlement/labor-costs"
            className="btn btn-secondary text-[13px] px-4 py-2.5 flex items-center gap-2"
          >
            <i className="fa-solid fa-file-invoice-dollar text-[13px]"></i>
            <span>월별 인건비 산정 바로가기 &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Main Table with Tabs */}
      <SettlementOverviewTable projects={projects} availableYears={availableYears} />
    </div>
  );
}
