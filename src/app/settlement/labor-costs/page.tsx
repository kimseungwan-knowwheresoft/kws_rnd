import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MonthlyLaborCostStatement, { LaborCostProject } from '@/components/MonthlyLaborCostStatement';

export default async function MonthlyLaborCostPage({
  searchParams
}: {
  searchParams: Promise<{ projectId?: string; ym?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const resolvedParams = await searchParams;

  // Query all projects with assignments, users, budgets, and monthly participations
  const rawProjects = await prisma.project.findMany({
    include: {
      assignments: {
        include: {
          user: true
        }
      },
      budgets: {
        orderBy: [{ year: 'asc' }, { category: 'asc' }]
      },
      monthlyParticipations: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const projects: LaborCostProject[] = rawProjects.map((p) => ({
    id: p.id,
    title: p.title,
    programName: p.programName,
    projectNumber: p.projectNumber,
    status: p.status,
    startDate: p.startDate,
    endDate: p.endDate,
    leadAgency: p.leadAgency,
    piName: p.piName,
    specializedAgency: p.specializedAgency,
    members: p.assignments.map((a) => ({
      id: a.user.id,
      name: a.user.name || '',
      role: a.user.role || 'RESEARCHER',
      roleInProject: a.roleInProject || 'MEMBER',
      joinDate: a.user.joinDate,
      grossSalary: a.user.grossSalary || 0,
      fourInsurances: a.user.fourInsurances || 0,
      researcherNumber: a.user.researcherNumber,
      birthDateAndGender: a.user.birthDateAndGender,
      affiliation: a.user.affiliation,
      degree: a.user.degree,
      thisProjectRate: a.thisProjectRate || 0
    })),
    budgets: p.budgets.map((b) => ({
      year: b.year,
      category: b.category,
      govFunding: b.govFunding,
      amount: b.amount,
      spentAmount: b.spentAmount
    })),
    monthlyParticipations: p.monthlyParticipations.map((mp) => ({
      userId: mp.userId,
      yearMonth: mp.yearMonth,
      rate: mp.rate
    }))
  }));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-1">
            <Link href="/settlement/projects" className="hover:text-primary transition-colors">
              정산 관리
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
            <span className="text-secondary font-semibold">월별 인건비 산정</span>
          </div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">월별 인건비 산정 및 출금요청</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            프로젝트별 참여연구원의 급여 및 당월 참여율을 기반으로 정부지원금 출금요청 명세서를 생성합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/settlement/projects"
            className="btn btn-secondary text-[13px] px-4 py-2.5 flex items-center gap-2"
          >
            <i className="fa-solid fa-table-list text-[13px]"></i>
            <span>&larr; 과제별 정산 총괄표</span>
          </Link>
        </div>
      </div>

      {/* Monthly Labor Cost Statement Component */}
      <MonthlyLaborCostStatement
        projects={projects}
        defaultProjectId={resolvedParams.projectId}
        defaultYearMonth={resolvedParams.ym || '2026-09'}
      />
    </div>
  );
}
