import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardProjectsTable, { DashboardProjectItem } from '@/components/DashboardProjectsTable';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  const currentYear = 2026; // or new Date().getFullYear();

  // Fetch only currently IN_PROGRESS projects with all related data
  const rawProjects = await prisma.project.findMany({
    where: {
      status: { in: ['진행중', '진행 중', 'IN_PROGRESS'] }
    },
    include: {
      assignments: {
        include: {
          user: true
        }
      },
      monthlyParticipations: {
        where: {
          yearMonth: '2026-09'
        }
      },
      budgets: true,
      evaluations: true,
      intellectualProperties: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate project participation rate for all in-progress projects in the company
  const projectRateMap = new Map<string, number>();
  rawProjects.forEach((p) => {
    const monthlySum = p.monthlyParticipations.reduce((sum, m) => sum + m.rate, 0);
    const assignedSum = p.assignments.reduce((sum, a) => sum + (a.thisProjectRate || 0), 0);
    const projectParticipationRate = monthlySum > 0 ? monthlySum : assignedSum;
    projectRateMap.set(p.id, projectParticipationRate);
  });

  // Total participation sum across all active in-progress projects in the company
  const totalCompanyParticipationSum = Array.from(projectRateMap.values()).reduce(
    (sum, rate) => sum + rate,
    0
  );

  // Transform data for the Dashboard table
  const dashboardProjects: DashboardProjectItem[] = rawProjects.map((p) => {
    // 1. Members count & names
    const membersCount = p.assignments.length;
    const membersList = p.assignments.map((a) => a.user?.name || '').filter(Boolean);

    // 2. Project participation rate & Company-wide share percentage
    const projectParticipationRate = projectRateMap.get(p.id) || 0;

    // 사내 과제 참여율: 전체 회사에서 진행하는 과제의 백분율 계산
    const companyShareRate =
      totalCompanyParticipationSum > 0
        ? (projectParticipationRate / totalCompanyParticipationSum) * 100
        : 0;

    // 3. Current year budget & remaining
    const currentYearBudgets = p.budgets.filter((b) => b.year === currentYear);
    const currentYearBudget =
      currentYearBudgets.length > 0
        ? currentYearBudgets.reduce((sum, b) => sum + b.amount, 0)
        : p.budget || 0;
    const spentBudget = currentYearBudgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
    const remainingBudget = currentYearBudget - spentBudget;

    // 4. Qualitative evaluation items (특허, 논문, 기술문서, 기술료)
    const evalList = p.evaluations;
    const ipList = p.intellectualProperties;

    const countMatches = (keyword: string) => {
      const fromEvals = evalList.filter((e) => e.type && e.type.includes(keyword)).length;
      const fromIPs = ipList.filter((ip) => ip.type && ip.type.includes(keyword)).length;
      return fromEvals + fromIPs;
    };

    const patents = countMatches('특허');
    const papers = countMatches('논문');
    const techDocs = countMatches('기술문서') + countMatches('SW') + countMatches('문서');
    const techFees = countMatches('기술료');

    return {
      id: p.id,
      title: p.title,
      programName: p.programName,
      projectNumber: p.projectNumber,
      startDate: p.startDate,
      endDate: p.endDate,
      membersCount,
      membersList,
      projectParticipationRate,
      companyShareRate,
      totalCompanyParticipationSum,
      currentYearBudget,
      spentBudget,
      remainingBudget,
      pendingEvaluations: {
        patents,
        papers,
        techDocs,
        techFees
      }
    };
  });

  // Calculate totals for KPI Cards
  const totalInProgressCount = dashboardProjects.length;
  const totalCurrentYearBudget = dashboardProjects.reduce((sum, p) => sum + p.currentYearBudget, 0);
  const totalRemainingBudget = dashboardProjects.reduce((sum, p) => sum + p.remainingBudget, 0);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">R&D 종합 대시보드</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            회사에서 현재 진행 중인 핵심 연구개발과제의 예산, 인력 및 정성적 성과를 모니터링합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link href="/projects/new" className="btn btn-primary text-[13px] px-5 py-2.5 flex items-center gap-2">
            <i className="fa-solid fa-plus text-[12px]"></i>
            <span>신규 과제 등록</span>
          </Link>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-between bg-surface-lowest">
          <div>
            <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              현재 진행 중인 과제
            </h3>
            <div className="text-[32px] font-black text-primary font-mono">
              {totalInProgressCount} <span className="text-[18px] font-medium text-gray-500">개 과제</span>
            </div>
          </div>
          <Link href="/projects" className="mt-4 text-[13px] text-secondary font-bold hover:underline flex items-center gap-1.5">
            <span>과제 관리 전체 목록 바로가기</span>
            <i className="fa-solid fa-arrow-right text-[11px]"></i>
          </Link>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-between bg-surface-lowest">
          <div>
            <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              당해년 총 예산 규모
            </h3>
            <div className="text-[32px] font-black text-secondary font-mono">
              {(totalCurrentYearBudget / 100000000).toFixed(1)} <span className="text-[18px] font-medium text-gray-500">억 원</span>
            </div>
          </div>
          <div className="mt-4 text-[13px] text-gray-500">
            총 잔여 예산: <strong className="font-mono text-primary font-bold">{totalRemainingBudget.toLocaleString()}원</strong>
          </div>
        </div>

        <div className="bg-primary rounded-xl shadow-card p-6 flex flex-col justify-between text-white">
          <div>
            <h3 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              빠른 과제 개시
            </h3>
            <p className="text-gray-200 text-[13px] leading-relaxed">
              신규 국책 연구개발과제를 등록하고 연차별 예산 배정 및 투입인력 참여율을 즉시 설정하세요.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="mt-5 inline-flex justify-center items-center py-2 px-4 bg-white text-primary rounded-xl font-bold text-[13px] hover:bg-surface-hover transition-colors"
          >
            + 새 과제 등록하기
          </Link>
        </div>
      </div>

      {/* Main Table: In-Progress Projects Information Table */}
      <DashboardProjectsTable projects={dashboardProjects} />
    </div>
  );
}
