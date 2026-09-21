import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { updateBudgetExecution } from '@/app/actions';

export default async function ProjectBudgetManagementPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Compute metrics
  const totalAllocated = project.budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = project.budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const totalBalance = totalAllocated - totalSpent;
  const overallRate = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* 1. Overall Execution KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">총 배정 예산</div>
          <div className="text-[24px] font-extrabold text-primary mt-2 font-mono">
            {totalAllocated.toLocaleString()} <span className="text-[14px] font-normal text-gray-500">원</span>
          </div>
          <div className="text-[12px] text-gray-400 mt-1">등록된 모든 연차/비목 합계</div>
        </div>

        <div className="glass-panel p-6 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">총 집행 완료액</div>
          <div className="text-[24px] font-extrabold text-secondary mt-2 font-mono">
            {totalSpent.toLocaleString()} <span className="text-[14px] font-normal text-gray-500">원</span>
          </div>
          <div className="text-[12px] text-gray-400 mt-1">현재까지 실제 소진된 금액</div>
        </div>

        <div className="glass-panel p-6 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">총 남은 예산 잔액</div>
          <div className={`text-[24px] font-extrabold mt-2 font-mono ${totalBalance < 0 ? 'text-tertiary' : 'text-primary'}`}>
            {totalBalance.toLocaleString()} <span className="text-[14px] font-normal text-gray-500">원</span>
          </div>
          <div className="text-[12px] text-gray-400 mt-1">배정 예산 대비 집행 잔여액</div>
        </div>

        <div className="glass-panel p-6 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">전체 집행률</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-[28px] font-black font-mono ${overallRate > 100 ? 'text-tertiary' : 'text-secondary'}`}>
              {overallRate.toFixed(1)}%
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-container rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${overallRate > 100 ? 'bg-tertiary' : 'bg-secondary'}`}
              style={{ width: `${Math.min(overallRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Budget vs. Spent Detailed Table */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-primary flex items-center gap-2.5">
              <i className="fa-solid fa-chart-line text-secondary text-[18px]"></i>
              비목별 예산 집행 관리 및 잔액 모니터링
            </h2>
            <p className="text-[13px] text-gray-500 mt-1">
              비목별 배정 금액에 따른 실제 지출 집행액과 잔액, 소진율을 관리합니다.
            </p>
          </div>
          <span className="badge bg-surface-container text-primary font-bold">
            {project.budgets.length}개 비목 관리
          </span>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full min-w-[950px] text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase">연도</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase">비목 카테고리</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase text-right">배정 예산액 (원)</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase text-right">현재 집행액 (원)</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase text-right">집행 잔액 (원)</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase text-center w-36">집행률 (%)</th>
                {canEdit && <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase text-center w-48">집행액 갱신</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {project.budgets.map((b: any) => {
                const spent = b.spentAmount || 0;
                const balance = b.amount - spent;
                const rate = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                const isOver = rate > 100;

                return (
                  <tr key={b.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-4 text-[14px] font-bold text-primary font-mono">{b.year}년</td>
                    <td className="px-4 py-4 text-[14px] font-semibold text-gray-800">{b.category}</td>
                    <td className="px-4 py-4 text-[14px] text-right font-mono font-medium text-gray-700">
                      {b.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-[14px] text-right font-mono font-bold text-secondary">
                      {spent.toLocaleString()}
                    </td>
                    <td className={`px-4 py-4 text-[14px] text-right font-mono font-bold ${balance < 0 ? 'text-tertiary' : 'text-gray-900'}`}>
                      {balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center">
                        <span className={`text-[12px] font-bold font-mono ${isOver ? 'text-tertiary' : 'text-primary'}`}>
                          {rate.toFixed(1)}%
                        </span>
                        <div className="w-24 bg-surface-container rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${isOver ? 'bg-tertiary' : 'bg-secondary'}`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 text-center">
                        <form
                          action={async (formData) => {
                            'use server';
                            const newSpent = parseFloat(formData.get('spentAmount') as string) || 0;
                            await updateBudgetExecution(b.id, project.id, newSpent);
                          }}
                          className="flex items-center gap-1.5 justify-center"
                        >
                          <input
                            type="number"
                            name="spentAmount"
                            defaultValue={spent}
                            step="1000"
                            min="0"
                            className="w-28 text-[12px] py-1 px-2 font-mono text-right"
                          />
                          <button
                            type="submit"
                            className="btn btn-secondary text-[11px] py-1 px-2.5 whitespace-nowrap font-medium"
                          >
                            저장
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })}
              {project.budgets.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-[13px] text-gray-400">
                    관리할 비목별 예산 정보가 없습니다. &apos;기본 연차별 예산&apos; 탭에서 예산 비목을 먼저 등록해주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
