'use client';

import { useState } from 'react';
import Link from 'next/link';
import PaginationControls from './PaginationControls';

export interface DashboardProjectItem {
  id: string;
  title: string;
  programName?: string | null;
  projectNumber?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  membersCount: number;
  membersList?: string[];
  projectParticipationRate: number;
  companyShareRate: number;
  totalCompanyParticipationSum: number;
  currentYearBudget: number;
  remainingBudget: number;
  spentBudget: number;
  pendingEvaluations: {
    patents: number;
    papers: number;
    techDocs: number;
    techFees: number;
  };
}

interface Props {
  projects: DashboardProjectItem[];
}

export default function DashboardProjectsTable({ projects }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = projects.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = projects.slice(startIndex, startIndex + pageSize);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container/30">
        <div>
          <h2 className="text-[18px] font-bold text-primary flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
            현재 진행 중인 R&D 과제 현황
          </h2>
          <p className="text-[13px] text-gray-500 mt-1">
            진행 중인 과제의 일정, 투입 인력 및 참여율, 당해년 예산 집행 현황, 정성적 평가 목표 항목입니다.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="badge badge-success text-[12px]">
            진행중 {totalItems}개 과제
          </span>
          <Link href="/projects" className="btn btn-secondary text-[12px] px-3 py-1.5 font-semibold">
            전체 과제 목록 &rarr;
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-4 w-72">과제명</th>
              <th className="px-4 py-4 w-28 whitespace-nowrap">시작일</th>
              <th className="px-4 py-4 w-28 whitespace-nowrap">종료일</th>
              <th className="px-4 py-4 w-24 text-center whitespace-nowrap">투입인원</th>
              <th
                className="px-4 py-4 w-44 text-center whitespace-nowrap"
                title="전체 회사에서 진행하는 과제들의 총 참여율 대비 해당 과제가 차지하는 백분율"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>사내 과제 참여율</span>
                  <i className="fa-solid fa-circle-info text-gray-400 text-[11px] cursor-help"></i>
                </div>
              </th>
              <th className="px-4 py-4 w-36 text-right whitespace-nowrap">당해년 예산</th>
              <th className="px-4 py-4 w-36 text-right whitespace-nowrap">잔여 예산</th>
              <th className="px-5 py-4 min-w-[280px]">정성적 평가 잔여항목</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedProjects.map((p) => (
              <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                {/* 1. 과제명 */}
                <td className="px-5 py-4">
                  <div className="font-bold text-[14px] text-primary hover:text-secondary transition-colors">
                    <Link href={`/projects/${p.id}/info`}>
                      {p.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
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
                  </div>
                </td>

                {/* 2. 시작일 */}
                <td className="px-4 py-4 text-[13px] text-gray-600 whitespace-nowrap font-mono">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}
                </td>

                {/* 3. 종료일 */}
                <td className="px-4 py-4 text-[13px] text-gray-600 whitespace-nowrap font-mono">
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'}
                </td>

                {/* 4. 투입인원 */}
                <td className="px-4 py-4 text-center whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-primary font-bold text-[13px]"
                    title={p.membersList?.join(', ') || ''}
                  >
                    <i className="fa-solid fa-user-group text-[11px] text-gray-400"></i>
                    {p.membersCount}명
                  </span>
                </td>

                {/* 5. 사내 R&D 과제 참여율 비율 (전체 회사 과제 대비 백분율) */}
                <td
                  className="px-4 py-4 text-center whitespace-nowrap"
                  title={`전사 진행 과제 총 참여율(${p.totalCompanyParticipationSum.toFixed(1)}%) 대비 본 과제 참여율(${p.projectParticipationRate.toFixed(1)}%)의 백분율`}
                >
                  <div className="flex flex-col items-center">
                    <div className="font-mono font-bold text-[15px] text-secondary">
                      {p.companyShareRate.toFixed(1)}%
                    </div>
                    {/* Micro bar showing share of company's active projects */}
                    <div className="w-24 bg-surface-container rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-secondary transition-all"
                        style={{ width: `${Math.min(p.companyShareRate, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 font-mono">
                      투입 {p.projectParticipationRate.toFixed(1)}% / 전사 {p.totalCompanyParticipationSum.toFixed(1)}%
                    </div>
                  </div>
                </td>

                {/* 6. 당해년 예산 */}
                <td className="px-4 py-4 text-right font-mono whitespace-nowrap">
                  <div className="font-bold text-[14px] text-primary">
                    {p.currentYearBudget.toLocaleString()} <span className="text-[12px] font-normal text-gray-500">원</span>
                  </div>
                  {p.spentBudget > 0 && (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      집행 {p.spentBudget.toLocaleString()}원
                    </div>
                  )}
                </td>

                {/* 7. 잔여 예산 */}
                <td className="px-4 py-4 text-right font-mono whitespace-nowrap">
                  <div className={`font-bold text-[14px] ${p.remainingBudget < 0 ? 'text-tertiary' : 'text-gray-900'}`}>
                    {p.remainingBudget.toLocaleString()} <span className="text-[12px] font-normal text-gray-500">원</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    잔여율 {p.currentYearBudget > 0 ? ((p.remainingBudget / p.currentYearBudget) * 100).toFixed(1) : 0}%
                  </div>
                </td>

                {/* 8. 정성적 평가 잔여항목 (특허, 논문, 기술문서, 기술료) */}
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* 특허 */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        p.pendingEvaluations.patents > 0
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-surface-lowest text-gray-400 border border-border'
                      }`}
                    >
                      <i className="fa-solid fa-stamp text-[10px]"></i>
                      특허: <strong className={p.pendingEvaluations.patents > 0 ? 'text-blue-800' : ''}>{p.pendingEvaluations.patents}건</strong>
                    </span>

                    {/* 논문 */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        p.pendingEvaluations.papers > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-surface-lowest text-gray-400 border border-border'
                      }`}
                    >
                      <i className="fa-solid fa-newspaper text-[10px]"></i>
                      논문: <strong className={p.pendingEvaluations.papers > 0 ? 'text-emerald-800' : ''}>{p.pendingEvaluations.papers}건</strong>
                    </span>

                    {/* 기술문서 */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        p.pendingEvaluations.techDocs > 0
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-surface-lowest text-gray-400 border border-border'
                      }`}
                    >
                      <i className="fa-solid fa-file-code text-[10px]"></i>
                      기술문서: <strong className={p.pendingEvaluations.techDocs > 0 ? 'text-purple-800' : ''}>{p.pendingEvaluations.techDocs}건</strong>
                    </span>

                    {/* 기술료 */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        p.pendingEvaluations.techFees > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-surface-lowest text-gray-400 border border-border'
                      }`}
                    >
                      <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
                      기술료: <strong className={p.pendingEvaluations.techFees > 0 ? 'text-amber-800' : ''}>{p.pendingEvaluations.techFees}건</strong>
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {paginatedProjects.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  현재 진행 중인 연구개발과제가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
