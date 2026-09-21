'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PaginationControls from './PaginationControls';

export interface BudgetRecord {
  id: string;
  year: number;
  category: string;
  govFunding: number;
  instCash: number;
  instGoods: number;
  otherFunding: number;
  amount: number;
  spentAmount: number;
}

export interface SettlementProject {
  id: string;
  title: string;
  programName?: string | null;
  projectNumber?: string | null;
  status: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  leadAgency?: string | null;
  piName?: string | null;
  budget?: number | null;
  budgets: BudgetRecord[];
}

interface Props {
  projects: SettlementProject[];
  availableYears: number[];
}

export default function SettlementOverviewTable({ projects, availableYears }: Props) {
  // Tab: 'ALL' or specific year (e.g. 2026, 2027)
  const [selectedTab, setSelectedTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Compute calculated metrics for each project based on selectedTab
  const calculatedProjects = useMemo(() => {
    return projects.map((p) => {
      // Filter budgets by selectedTab
      const relevantBudgets =
        selectedTab === 'ALL'
          ? p.budgets
          : p.budgets.filter((b) => b.year === Number(selectedTab));

      let totalGovFunding = relevantBudgets.reduce((sum, b) => sum + (b.govFunding || 0), 0);
      let totalInstCash = relevantBudgets.reduce((sum, b) => sum + (b.instCash || 0), 0);
      let totalInstGoods = relevantBudgets.reduce((sum, b) => sum + (b.instGoods || 0), 0);
      let totalOther = relevantBudgets.reduce((sum, b) => sum + (b.otherFunding || 0), 0);
      let totalAmount = relevantBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
      let totalSpent = relevantBudgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);

      // Fallback if no specific budget rows exist for the project
      if (relevantBudgets.length === 0 && selectedTab === 'ALL' && (p.budget || 0) > 0) {
        totalAmount = p.budget || 0;
        totalGovFunding = Math.round(totalAmount * 0.7);
        totalInstCash = Math.round(totalAmount * 0.15);
        totalInstGoods = Math.round(totalAmount * 0.15);
      }

      const balance = totalAmount - totalSpent;
      const executionRate = totalAmount > 0 ? (totalSpent / totalAmount) * 100 : 0;

      return {
        ...p,
        totalGovFunding,
        totalInstCash,
        totalInstGoods,
        totalOther,
        totalAmount,
        totalSpent,
        balance,
        executionRate,
        budgetCount: relevantBudgets.length
      };
    });
  }, [projects, selectedTab]);

  // Filter projects by search term and status
  const filteredProjects = useMemo(() => {
    return calculatedProjects.filter((p) => {
      const matchQuery =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.programName && p.programName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.projectNumber && p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.leadAgency && p.leadAgency.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        p.status === statusFilter ||
        (statusFilter === 'IN_PROGRESS' && ['진행중', '진행 중', 'IN_PROGRESS'].includes(p.status));

      return matchQuery && matchStatus;
    });
  }, [calculatedProjects, searchTerm, statusFilter]);

  // Pagination
  const totalItems = filteredProjects.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + pageSize);

  // Overall KPI card metrics for the selected tab
  const overallMetrics = useMemo(() => {
    const totalAllocated = filteredProjects.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalSpent = filteredProjects.reduce((sum, p) => sum + p.totalSpent, 0);
    const totalBalance = totalAllocated - totalSpent;
    const avgExecutionRate = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    const totalGov = filteredProjects.reduce((sum, p) => sum + p.totalGovFunding, 0);

    return {
      totalProjects: filteredProjects.length,
      totalAllocated,
      totalSpent,
      totalBalance,
      avgExecutionRate,
      totalGov
    };
  }, [filteredProjects]);

  return (
    <div className="space-y-6">
      {/* 1. Yearly Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => {
            setSelectedTab('ALL');
            setCurrentPage(1);
          }}
          className={`px-5 py-2.5 rounded-t-lg font-bold text-[14px] transition-all flex items-center gap-2 ${
            selectedTab === 'ALL'
              ? 'bg-surface-lowest text-secondary border-b-2 border-secondary shadow-xs'
              : 'text-gray-500 hover:text-primary hover:bg-surface-hover'
          }`}
        >
          <i className="fa-solid fa-layer-group text-[13px]"></i>
          <span>전체 (총괄)</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-gray-600 font-mono">
            {projects.length}개 과제
          </span>
        </button>

        {availableYears.map((year, idx) => {
          const isSelected = selectedTab === String(year);
          return (
            <button
              key={year}
              type="button"
              onClick={() => {
                setSelectedTab(String(year));
                setCurrentPage(1);
              }}
              className={`px-5 py-2.5 rounded-t-lg font-bold text-[14px] transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-surface-lowest text-secondary border-b-2 border-secondary shadow-xs'
                  : 'text-gray-500 hover:text-primary hover:bg-surface-hover'
              }`}
            >
              <i className="fa-regular fa-calendar-check text-[13px]"></i>
              <span>{idx + 1}차년도 ({year}년)</span>
            </button>
          );
        })}
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className="glass-panel p-5 bg-surface-lowest/70 border border-border/80">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              {selectedTab === 'ALL' ? '전체 초기 협약 사업비' : `${selectedTab}년도 배정 예산`}
            </span>
            <i className="fa-solid fa-vault text-[14px] text-gray-400"></i>
          </div>
          <div className="text-[24px] font-extrabold text-primary mt-2 font-mono">
            {overallMetrics.totalAllocated.toLocaleString()}{' '}
            <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono">
            정부지원금 {overallMetrics.totalGov.toLocaleString()}원 포함
          </div>
        </div>

        {/* Total Spent */}
        <div className="glass-panel p-5 bg-surface-lowest/70 border border-border/80">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              {selectedTab === 'ALL' ? '누적 집행 완료액' : `${selectedTab}년도 집행액`}
            </span>
            <i className="fa-solid fa-receipt text-[14px] text-secondary"></i>
          </div>
          <div className="text-[24px] font-extrabold text-secondary mt-2 font-mono">
            {overallMetrics.totalSpent.toLocaleString()}{' '}
            <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            소진 실적 확정 집행 금액
          </div>
        </div>

        {/* Total Balance */}
        <div className="glass-panel p-5 bg-surface-lowest/70 border border-border/80">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              집행 잔여액 (잔액)
            </span>
            <i className="fa-solid fa-wallet text-[14px] text-gray-400"></i>
          </div>
          <div
            className={`text-[24px] font-extrabold mt-2 font-mono ${
              overallMetrics.totalBalance < 0 ? 'text-tertiary' : 'text-primary'
            }`}
          >
            {overallMetrics.totalBalance.toLocaleString()}{' '}
            <span className="text-[13px] font-normal text-gray-500">원</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            배정 예산 대비 집행 가용액
          </div>
        </div>

        {/* Execution Rate */}
        <div className="glass-panel p-5 bg-surface-lowest/70 border border-border/80">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              평균 예산 집행률
            </span>
            <i className="fa-solid fa-chart-pie text-[14px] text-secondary"></i>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-[26px] font-black font-mono ${
                overallMetrics.avgExecutionRate > 100
                  ? 'text-tertiary'
                  : 'text-secondary'
              }`}
            >
              {overallMetrics.avgExecutionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${
                overallMetrics.avgExecutionRate > 100 ? 'bg-tertiary' : 'bg-secondary'
              }`}
              style={{ width: `${Math.min(overallMetrics.avgExecutionRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container/20">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
            <input
              type="text"
              placeholder="과제명, 사업명, 과제번호, 주관기관 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-surface-lowest border border-border rounded-md text-[13px] text-primary focus:outline-none focus:border-secondary transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-surface-lowest border border-border rounded-md text-[13px] text-gray-700 focus:outline-none focus:border-secondary"
          >
            <option value="ALL">상태 전체</option>
            <option value="IN_PROGRESS">진행중</option>
            <option value="PLANNING">계획/기획중</option>
            <option value="COMPLETED">완료</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto text-[13px] text-gray-500">
          <span>
            총 <strong className="text-primary font-mono">{totalItems}</strong>개 과제
          </span>
        </div>
      </div>

      {/* 4. Settlement Master Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left border-collapse">
            <thead>
              {/* Top Header Group */}
              <tr className="bg-surface border-b border-border text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                <th rowSpan={2} className="px-4 py-3.5 w-12 text-center border-r border-border">번호</th>
                <th rowSpan={2} className="px-5 py-3.5 min-w-[260px] border-r border-border">과제명 및 기본정보</th>
                <th rowSpan={2} className="px-4 py-3.5 w-32 border-r border-border text-center">연구기간</th>
                <th colSpan={4} className="px-4 py-2.5 text-center border-r border-border bg-surface-container/40">
                  초기 협약 사업비 (배정 예산)
                </th>
                <th rowSpan={2} className="px-4 py-3.5 w-36 text-right border-r border-border">집행 누계액 (원)</th>
                <th rowSpan={2} className="px-4 py-3.5 w-36 text-right border-r border-border">집행 잔여액 (원)</th>
                <th rowSpan={2} className="px-4 py-3.5 w-36 text-center border-r border-border">집행률 (%)</th>
                <th rowSpan={2} className="px-4 py-3.5 w-24 text-center">관리</th>
              </tr>
              {/* Sub Header for Budget Splits */}
              <tr className="bg-surface-lowest border-b-2 border-border text-[11px] font-semibold text-gray-500 uppercase">
                <th className="px-3 py-2 text-right border-r border-border text-secondary">정부지원금</th>
                <th className="px-3 py-2 text-right border-r border-border">기관현금</th>
                <th className="px-3 py-2 text-right border-r border-border">기관현물</th>
                <th className="px-3 py-2 text-right border-r border-border font-bold text-primary bg-surface-container/30">합계 (원)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-gray-400">
                    <i className="fa-solid fa-folder-open text-3xl mb-3 block text-gray-300"></i>
                    조건에 해당하는 과제 정산 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p, idx) => {
                  const itemIndex = startIndex + idx + 1;
                  const isOverSpent = p.balance < 0;

                  return (
                    <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                      {/* 1. 번호 */}
                      <td className="px-4 py-4 text-center text-gray-400 font-mono text-[13px] border-r border-border">
                        {itemIndex}
                      </td>

                      {/* 2. 과제명 및 기본정보 */}
                      <td className="px-5 py-4 border-r border-border">
                        <div className="font-bold text-[14px] text-primary hover:text-secondary transition-colors">
                          <Link href={`/projects/${p.id}/budget`}>
                            {p.title}
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {p.programName && (
                            <span className="text-[11px] bg-surface-container text-gray-600 px-2 py-0.5 rounded-sm">
                              {p.programName}
                            </span>
                          )}
                          {p.projectNumber && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              #{p.projectNumber}
                            </span>
                          )}
                          {p.leadAgency && (
                            <span className="text-[11px] text-gray-500">
                              <i className="fa-regular fa-building text-[10px] mr-1"></i>
                              {p.leadAgency}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. 연구기간 */}
                      <td className="px-4 py-4 text-center text-[12px] text-gray-600 border-r border-border font-mono whitespace-nowrap">
                        <div>{p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}</div>
                        <div className="text-[10px] text-gray-400">~</div>
                        <div>{p.endDate ? new Date(p.endDate).toLocaleDateString() : '진행중'}</div>
                      </td>

                      {/* 4. 초기 협약 사업비: 정부지원금 */}
                      <td className="px-3 py-4 text-right font-mono text-[13px] text-secondary border-r border-border whitespace-nowrap">
                        {p.totalGovFunding.toLocaleString()}
                      </td>

                      {/* 5. 기관현금 */}
                      <td className="px-3 py-4 text-right font-mono text-[13px] text-gray-600 border-r border-border whitespace-nowrap">
                        {p.totalInstCash.toLocaleString()}
                      </td>

                      {/* 6. 기관현물 */}
                      <td className="px-3 py-4 text-right font-mono text-[13px] text-gray-600 border-r border-border whitespace-nowrap">
                        {p.totalInstGoods.toLocaleString()}
                      </td>

                      {/* 7. 초기 사업비 합계 */}
                      <td className="px-3 py-4 text-right font-mono text-[14px] font-bold text-primary border-r border-border bg-surface-container/20 whitespace-nowrap">
                        {p.totalAmount.toLocaleString()}
                      </td>

                      {/* 8. 집행 누계액 */}
                      <td className="px-4 py-4 text-right font-mono text-[14px] font-bold text-secondary border-r border-border whitespace-nowrap">
                        {p.totalSpent.toLocaleString()}
                      </td>

                      {/* 9. 집행 잔여액 */}
                      <td
                        className={`px-4 py-4 text-right font-mono text-[14px] font-bold border-r border-border whitespace-nowrap ${
                          isOverSpent ? 'text-tertiary bg-[#ffe9ee]/30' : 'text-primary'
                        }`}
                      >
                        {p.balance.toLocaleString()}
                      </td>

                      {/* 10. 집행률 (%) */}
                      <td className="px-4 py-4 text-center border-r border-border whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-[14px] ${
                              p.executionRate > 100
                                ? 'text-tertiary'
                                : p.executionRate >= 80
                                ? 'text-[#ff9800]'
                                : 'text-secondary'
                            }`}
                          >
                            {p.executionRate.toFixed(1)}%
                          </span>
                          <div className="w-20 bg-surface-container rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                p.executionRate > 100
                                  ? 'bg-tertiary'
                                  : p.executionRate >= 80
                                  ? 'bg-[#ff9800]'
                                  : 'bg-secondary'
                              }`}
                              style={{ width: `${Math.min(p.executionRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* 11. 관리 액션 */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {(() => {
                          let isExpired = false;
                          if (p.endDate) {
                            const limitDate = new Date(p.endDate);
                            limitDate.setMonth(limitDate.getMonth() + 3);
                            isExpired = new Date() > limitDate;
                          }
                          
                          if (isExpired) {
                            return (
                              <button
                                disabled
                                className="btn bg-surface-container text-gray-400 text-[11px] px-2.5 py-1.5 inline-flex items-center gap-1 font-semibold cursor-not-allowed border-none"
                                title="종료 후 3개월이 경과되어 수정할 수 없습니다."
                              >
                                <span>예산관리</span>
                                <i className="fa-solid fa-lock text-[10px]"></i>
                              </button>
                            );
                          }
                          
                          return (
                            <Link
                              href={`/projects/${p.id}/budget`}
                              className="btn btn-secondary text-[11px] px-2.5 py-1.5 inline-flex items-center gap-1 font-semibold"
                              title="예산 집행 상세 관리"
                            >
                              <span>예산관리</span>
                              <i className="fa-solid fa-arrow-right text-[10px]"></i>
                            </Link>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-border bg-surface-container/10">
          <PaginationControls
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
