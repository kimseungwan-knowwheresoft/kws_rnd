import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { createProjectBudget, deleteProjectBudget } from '@/app/actions';
import AnnualStandardBudgetTable from '@/components/AnnualStandardBudgetTable';
import CategoryStandardBudgetTable from '@/components/CategoryStandardBudgetTable';

export default async function ProjectAnnualBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id },
    include: {
      assignments: true,
      budgets: { orderBy: [{ year: 'asc' }, { category: 'asc' }] }
    }
  });

  if (!project) return notFound();

  const isPM = project.assignments.some((a: any) => a.userId === session?.user?.id && (a.roleInProject === 'PM' || a.roleInProject?.includes('PM') || a.roleInProject?.includes('연구책임자')));
  const isAdmin = session?.user?.role === 'ADMIN';
  const isHR = session?.user?.role === 'HR';
  const canEdit = isAdmin || isPM || isHR;

  // Compute summary totals
  const totalAmount = project.budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalGovFunding = project.budgets.reduce((sum, b) => sum + b.govFunding, 0);
  const totalInstCash = project.budgets.reduce((sum, b) => sum + b.instCash, 0);
  const totalInstGoods = project.budgets.reduce((sum, b) => sum + b.instGoods, 0);
  const totalOther = project.budgets.reduce((sum, b) => sum + b.otherFunding, 0);

  const startYear = project.startDate 
    ? new Date(project.startDate).getFullYear() 
    : (project.budgets.length > 0 ? Math.min(...project.budgets.map((bd) => bd.year)) : new Date().getFullYear());

  return (
    <div className="space-y-8">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">총 연구개발비 합계</div>
          <div className="text-[22px] font-extrabold text-primary mt-2 font-mono">
            {totalAmount.toLocaleString()} <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">정부지원 연구개발비</div>
          <div className="text-[20px] font-bold text-secondary mt-2 font-mono">
            {totalGovFunding.toLocaleString()} <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">기관부담금 (현금)</div>
          <div className="text-[20px] font-bold text-primary mt-2 font-mono">
            {totalInstCash.toLocaleString()} <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">기관부담금 (현물)</div>
          <div className="text-[20px] font-bold text-primary mt-2 font-mono">
            {totalInstGoods.toLocaleString()} <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
        </div>

        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">기타 / 지자체 지원금</div>
          <div className="text-[20px] font-bold text-gray-700 mt-2 font-mono">
            {totalOther.toLocaleString()} <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
        </div>
      </div>

      {/* 2. Standard Annual Budget Table (첨부 이미지 서식 100% 일치) */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-primary flex items-center gap-2.5">
              <i className="fa-solid fa-calculator text-secondary text-[18px]"></i>
              기본 연차별 예산 상세 내역
            </h2>
            <p className="text-[13px] text-gray-500 mt-1">
              국가연구개발사업 표준 서식에 따른 단계 및 연차별 연구개발비(정부지원금, 기관부담금, 지자체/기타 지원금) 배정 현황입니다.
            </p>
          </div>
          <span className="badge bg-surface-container text-primary font-bold">
            협약 예산표
          </span>
        </div>

        <AnnualStandardBudgetTable
          projectId={project.id}
          canEdit={canEdit}
          initialBudgets={project.budgets}
          startYear={startYear}
        />
      </div>

      {/* 3. Category Breakdown Details (비목별 세부 배정 내역 - 첨부 이미지 서식 100% 일치) */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
          <div>
            <h3 className="text-[20px] font-bold text-primary flex items-center gap-2.5">
              <i className="fa-solid fa-list-check text-secondary text-[18px]"></i>
              비목별 세부 배정 내역
            </h3>
            <p className="text-[13px] text-gray-500 mt-1">
              인건비, 운영비, 여비, 업무추진비, 연구용역비, 유형자산 등 세부 비목별 정부지원금 및 민간부담금(현금/현물) 배정 현황과 구성비입니다.
            </p>
          </div>
          <span className="badge bg-surface-container text-primary font-bold">
            세부 비목표
          </span>
        </div>

        <CategoryStandardBudgetTable
          projectId={project.id}
          canEdit={canEdit}
          initialBudgets={project.budgets}
          startYear={startYear}
        />
      </div>
    </div>
  );
}
