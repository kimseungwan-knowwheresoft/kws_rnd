'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export interface ProjectMemberData {
  id: string;
  name: string;
  role: string;
  roleInProject: string;
  joinDate?: string | Date | null;
  grossSalary: number;
  fourInsurances: number;
  researcherNumber?: string | null;
  birthDateAndGender?: string | null;
  affiliation?: string | null;
  degree?: string | null;
  thisProjectRate: number;
  monthlyRate?: number; // Rate for the specific month
}

export interface ProjectBudgetSummary {
  year: number;
  category: string;
  govFunding: number;
  amount: number;
  spentAmount: number;
}

export interface LaborCostProject {
  id: string;
  title: string;
  programName?: string | null;
  projectNumber?: string | null;
  status: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  leadAgency?: string | null;
  piName?: string | null;
  specializedAgency?: string | null;
  members: ProjectMemberData[];
  budgets: ProjectBudgetSummary[];
  monthlyParticipations: {
    userId: string;
    yearMonth: string;
    rate: number;
  }[];
}

interface Props {
  projects: LaborCostProject[];
  defaultProjectId?: string;
  defaultYearMonth?: string;
}

export default function MonthlyLaborCostStatement({
  projects,
  defaultProjectId,
  defaultYearMonth = '2026-09'
}: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || (projects[0]?.id ?? '')
  );
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(defaultYearMonth);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);

  // Active Project
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Year from selectedYearMonth (e.g. "2026-09" -> 2026)
  const currentYear = useMemo(() => {
    const parts = selectedYearMonth.split('-');
    return parts[0] ? Number(parts[0]) : 2026;
  }, [selectedYearMonth]);

  // Compute labor cost budget for the current year
  const currentYearLaborBudget = useMemo(() => {
    if (!activeProject) return { allocatedGov: 0, totalAllocated: 0, spent: 0 };
    const laborBudgets = activeProject.budgets.filter(
      (b) => b.year === currentYear && (b.category.includes('인건비') || b.category === '인건비')
    );
    const allocatedGov = laborBudgets.reduce((sum, b) => sum + (b.govFunding || 0), 0);
    const totalAllocated = laborBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const spent = laborBudgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
    return { allocatedGov, totalAllocated, spent };
  }, [activeProject, currentYear]);

  // Compute member statements for the selected month
  const memberStatements = useMemo(() => {
    if (!activeProject) return [];

    return activeProject.members.map((m, idx) => {
      // Find monthly participation rate for the selected month
      const monthlyRecord = activeProject.monthlyParticipations.find(
        (mp) => mp.userId === m.id && mp.yearMonth === selectedYearMonth
      );
      // If recorded, use it; otherwise fallback to assigned rate or 0
      const participationRate = monthlyRecord ? monthlyRecord.rate : (m.thisProjectRate || 0);

      // Monthly Salary calculation
      const monthlyGross = m.grossSalary > 0 ? Math.round(m.grossSalary / 12) : 0;
      const monthlyInsurance = m.fourInsurances > 0 ? Math.round(m.fourInsurances / 12) : 0;
      const monthlyTotalComp = monthlyGross + monthlyInsurance;

      // Withdrawal requested from Government Funding
      const requestedSalary = Math.round(monthlyGross * (participationRate / 100));
      const requestedInsurance = Math.round(monthlyInsurance * (participationRate / 100));
      const requestedTotal = includeInsurance
        ? requestedSalary + requestedInsurance
        : requestedSalary;

      return {
        idx: idx + 1,
        id: m.id,
        name: m.name,
        role: m.role,
        roleInProject: m.roleInProject,
        researcherNumber: m.researcherNumber || '-',
        birthDateAndGender: m.birthDateAndGender || '-',
        affiliation: m.affiliation || activeProject.leadAgency || '(주)노웨어소프트',
        grossSalary: m.grossSalary,
        fourInsurances: m.fourInsurances,
        monthlyGross,
        monthlyInsurance,
        monthlyTotalComp,
        participationRate,
        requestedSalary,
        requestedInsurance,
        requestedTotal
      };
    });
  }, [activeProject, selectedYearMonth, includeInsurance]);

  // Totals
  const totalRequestedSalary = memberStatements.reduce((sum, m) => sum + m.requestedSalary, 0);
  const totalRequestedInsurance = memberStatements.reduce((sum, m) => sum + m.requestedInsurance, 0);
  const totalRequestedAmount = includeInsurance
    ? totalRequestedSalary + totalRequestedInsurance
    : totalRequestedSalary;
  const avgParticipationRate =
    memberStatements.length > 0
      ? memberStatements.reduce((sum, m) => sum + m.participationRate, 0) / memberStatements.length
      : 0;

  // Remaining budget simulation
  const remainingLaborGovBudget = currentYearLaborBudget.allocatedGov - currentYearLaborBudget.spent;
  const simulatedRemainingGov = remainingLaborGovBudget - totalRequestedAmount;

  // Month shift helper
  const changeMonth = (delta: number) => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedYearMonth(`${newY}-${newM}`);
  };

  // CSV Export
  const exportToCSV = () => {
    if (!activeProject) return;
    const headers = [
      '순번',
      '성명',
      '직급/역할',
      '과학기술인등록번호',
      '소속기관',
      '연간세전연봉(원)',
      '월환산급여(원)',
      '월기관부담4대보험(원)',
      '참여율(%)',
      '출금요청급여(원)',
      '출금요청4대보험(원)',
      '정부지원금총출금요청액(원)'
    ];

    const rows = memberStatements.map((m) => [
      m.idx,
      m.name,
      m.roleInProject === 'PM' ? '과제책임자 (PM)' : (m.roleInProject === 'MEMBER' ? '참여연구원' : (m.roleInProject || '참여연구원')),
      m.researcherNumber,
      m.affiliation,
      m.grossSalary,
      m.monthlyGross,
      m.monthlyInsurance,
      m.participationRate,
      m.requestedSalary,
      m.requestedInsurance,
      m.requestedTotal
    ]);

    const csvContent =
      '\uFEFF' +
      [
        `연구개발비(정부지원금) 인건비 출금요청 명세서`,
        `과제명: ${activeProject.title}`,
        `산정연월: ${selectedYearMonth}`,
        `총 출금요청액: ${totalRequestedAmount}원`,
        '',
        headers.join(','),
        ...rows.map((r) => r.map((c) => `"${c}"`).join(','))
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `인건비출금요청명세서_${activeProject.title.replace(/\s+/g, '_')}_${selectedYearMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Control & Filter Panel (Hidden in Print) */}
      <div className="glass-panel p-6 bg-surface-container/30 border border-border print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Project & Month Selectors */}
          <div className="flex flex-wrap items-center gap-4 flex-1">
            {/* Project Dropdown */}
            <div className="min-w-[280px] sm:min-w-[340px]">
              <label className="text-[12px] font-semibold text-gray-500 block mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-folder-tree text-secondary text-[12px]"></i>
                <span>산정 대상 R&D 과제 선택</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-lowest border border-border rounded-md text-[14px] font-bold text-primary focus:outline-none focus:border-secondary shadow-xs transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.status}] {p.title} ({p.programName || '국책연구개발'})
                  </option>
                ))}
              </select>
            </div>

            {/* Year-Month Selector */}
            <div>
              <label className="text-[12px] font-semibold text-gray-500 block mb-1.5 flex items-center gap-1.5">
                <i className="fa-regular fa-calendar text-secondary text-[12px]"></i>
                <span>출금 산정 연월 (Year-Month)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="px-2.5 py-2 bg-surface-lowest border border-border rounded-md text-gray-600 hover:text-primary hover:bg-surface-hover transition-colors"
                  title="이전 달"
                >
                  <i className="fa-solid fa-chevron-left text-[11px]"></i>
                </button>
                <input
                  type="month"
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                  className="px-3.5 py-2 bg-surface-lowest border border-border rounded-md text-[14px] font-bold font-mono text-primary focus:outline-none focus:border-secondary shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="px-2.5 py-2 bg-surface-lowest border border-border rounded-md text-gray-600 hover:text-primary hover:bg-surface-hover transition-colors"
                  title="다음 달"
                >
                  <i className="fa-solid fa-chevron-right text-[11px]"></i>
                </button>
              </div>
            </div>

            {/* Insurance Toggle Option */}
            <div className="self-end pb-1.5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-gray-700 bg-surface-lowest px-3 py-2 rounded-md border border-border">
                <input
                  type="checkbox"
                  checked={includeInsurance}
                  onChange={(e) => setIncludeInsurance(e.target.checked)}
                  className="rounded text-secondary focus:ring-secondary w-4 h-4"
                />
                <span className="font-medium">4대보험 기관부담금 청구 포함</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-end">
            <button
              type="button"
              onClick={exportToCSV}
              className="btn btn-secondary text-[13px] px-4 py-2.5 flex items-center gap-2 font-semibold"
            >
              <i className="fa-solid fa-file-csv text-[14px]"></i>
              <span>CSV 내보내기</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary text-[13px] px-4 py-2.5 flex items-center gap-2 font-bold shadow-sm"
            >
              <i className="fa-solid fa-print text-[14px]"></i>
              <span>명세서 인쇄 / PDF 저장</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Official Document Paper Container (Print-friendly format) */}
      <div className="glass-panel p-8 sm:p-12 bg-white text-gray-900 border border-border shadow-lg print:border-none print:shadow-none print:p-0">
        {/* Document Header & Seal Signatures */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-gray-900 pb-6 mb-8 gap-4">
          <div>
            <span className="text-[12px] font-bold text-secondary uppercase tracking-wider font-mono">
              [국가연구개발사업 표준 서식]
            </span>
            <h2 className="text-[26px] font-black text-gray-900 tracking-tight mt-1">
              연구개발비(정부지원금) 인건비 출금요청 명세서
            </h2>
            <div className="text-[13px] text-gray-600 mt-1 font-mono">
              산정 기준 연월 : <span className="font-bold text-gray-900 text-[14px]">{selectedYearMonth}</span>
            </div>
          </div>

          {/* Approval Signatures Box */}
          <div className="border border-gray-400 text-center text-[12px] self-end md:self-auto bg-gray-50">
            <table className="border-collapse">
              <thead>
                <tr className="border-b border-gray-400 bg-gray-100 font-semibold text-gray-700">
                  <th className="p-1.5 w-16 border-r border-gray-400">작성자</th>
                  <th className="p-1.5 w-16 border-r border-gray-400">실무담당</th>
                  <th className="p-1.5 w-20 border-r border-gray-400">연구책임자</th>
                  <th className="p-1.5 w-20">기관장</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-14">
                  <td className="border-r border-gray-400 align-bottom pb-1 text-[11px] text-gray-400">서명</td>
                  <td className="border-r border-gray-400 align-bottom pb-1 text-[11px] text-gray-400">서명</td>
                  <td className="border-r border-gray-400 align-bottom pb-1 font-bold text-gray-800">
                    {activeProject?.piName || '김프로'}<br/><span className="text-[10px] text-gray-400 font-normal">(인)</span>
                  </td>
                  <td className="align-bottom pb-1 text-[11px] text-gray-400">직인</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Metadata Overview Box */}
        {activeProject && (
          <div className="bg-gray-50 border border-gray-300 rounded-sm p-4 mb-6 text-[13px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2.5 gap-x-6">
              <div>
                <span className="text-gray-500 mr-2 font-semibold">과제명 :</span>
                <strong className="text-gray-900">{activeProject.title}</strong>
              </div>
              <div>
                <span className="text-gray-500 mr-2 font-semibold">과제번호 :</span>
                <span className="font-mono text-gray-900 font-bold">{activeProject.projectNumber || '미지정'}</span>
              </div>
              <div>
                <span className="text-gray-500 mr-2 font-semibold">사업명 :</span>
                <span className="text-gray-900">{activeProject.programName || '산업기술혁신사업'}</span>
              </div>
              <div>
                <span className="text-gray-500 mr-2 font-semibold">주관연구개발기관 :</span>
                <span className="text-gray-900">{activeProject.leadAgency || '(주)노웨어소프트'}</span>
              </div>
              <div>
                <span className="text-gray-500 mr-2 font-semibold">전문기관 :</span>
                <span className="text-gray-900">{activeProject.specializedAgency || '한국산업기술기획평가원(KEIT)'}</span>
              </div>
              <div>
                <span className="text-gray-500 mr-2 font-semibold">연구책임자(PM) :</span>
                <strong className="text-gray-900">{activeProject.piName || '김프로'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Budget & Execution Simulation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 font-mono">
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="text-[11px] text-gray-500 font-sans font-semibold">당해년도 인건비 정부지원금</div>
            <div className="text-[16px] font-bold text-gray-900 mt-1">
              {currentYearLaborBudget.allocatedGov.toLocaleString()} <span className="text-[11px] font-normal">원</span>
            </div>
          </div>
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="text-[11px] text-gray-500 font-sans font-semibold">기 출금 집행 누계액</div>
            <div className="text-[16px] font-bold text-gray-600 mt-1">
              {currentYearLaborBudget.spent.toLocaleString()} <span className="text-[11px] font-normal">원</span>
            </div>
          </div>
          <div className="p-3.5 bg-secondary/10 border border-secondary/30 rounded-sm">
            <div className="text-[11px] text-secondary font-sans font-bold">금월 인건비 출금요청 총액</div>
            <div className="text-[18px] font-black text-secondary mt-1">
              {totalRequestedAmount.toLocaleString()} <span className="text-[12px] font-normal">원</span>
            </div>
          </div>
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="text-[11px] text-gray-500 font-sans font-semibold">금월 출금 후 예상 잔여 예산</div>
            <div
              className={`text-[16px] font-bold mt-1 ${
                simulatedRemainingGov < 0 ? 'text-tertiary' : 'text-gray-900'
              }`}
            >
              {simulatedRemainingGov.toLocaleString()} <span className="text-[11px] font-normal">원</span>
            </div>
          </div>
        </div>

        {/* Detail Table */}
        <div className="overflow-x-auto border border-gray-300 rounded-sm mb-6">
          <table className="w-full text-center border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-semibold">
                <th rowSpan={2} className="p-2 border-r border-gray-300 w-10">순번</th>
                <th rowSpan={2} className="p-2 border-r border-gray-300 min-w-[80px]">성명</th>
                <th rowSpan={2} className="p-2 border-r border-gray-300 w-24">직위/구분</th>
                <th rowSpan={2} className="p-2 border-r border-gray-300 w-28">과학기술인<br/>등록번호</th>
                <th colSpan={3} className="p-1.5 border-r border-gray-300 bg-gray-200 text-[11px]">
                  개인별 기준 인건비 (월 환산)
                </th>
                <th rowSpan={2} className="p-2 border-r border-gray-300 w-20 text-secondary font-bold">
                  본 과제<br/>참여율(%)
                </th>
                <th colSpan={3} className="p-1.5 border-gray-300 bg-secondary/15 text-secondary font-bold text-[11px]">
                  정부지원금 출금 요청액 (원)
                </th>
                <th rowSpan={2} className="p-2 w-16 text-gray-500">확인/서명</th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-300 text-[11px] text-gray-600 font-semibold">
                <th className="p-1.5 border-r border-gray-300 text-right">월 세전급여</th>
                <th className="p-1.5 border-r border-gray-300 text-right">기관부담(4대)</th>
                <th className="p-1.5 border-r border-gray-300 text-right font-bold text-gray-800">월 총인건비</th>
                <th className="p-1.5 border-r border-gray-300 text-right">급여 청구분</th>
                <th className="p-1.5 border-r border-gray-300 text-right">4대보험 청구분</th>
                <th className="p-1.5 border-r border-gray-300 text-right font-bold text-secondary bg-secondary/10">
                  출금요청 합계
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {memberStatements.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-400">
                    등록된 참여 연구원 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                memberStatements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    {/* 순번 */}
                    <td className="p-2.5 border-r border-gray-200 font-mono text-gray-500">{m.idx}</td>

                    {/* 성명 */}
                    <td className="p-2.5 border-r border-gray-200 font-bold text-gray-900 whitespace-nowrap">
                      {m.name}
                    </td>

                    {/* 직위/구분 */}
                    <td className="p-2.5 border-r border-gray-200 text-gray-600 whitespace-nowrap text-[11px]">
                      {m.roleInProject === 'PM' || m.roleInProject?.includes('PM') || m.roleInProject?.includes('연구책임자') ? (
                        <span className="font-bold text-secondary">{m.roleInProject === 'PM' ? '연구책임자 (PM)' : m.roleInProject}</span>
                      ) : (
                        <span>{m.roleInProject === 'MEMBER' ? '참여연구원' : (m.roleInProject || '참여연구원')}</span>
                      )}
                    </td>

                    {/* 과학기술인 등록번호 */}
                    <td className="p-2.5 border-r border-gray-200 font-mono text-gray-500 text-[11px]">
                      {m.researcherNumber}
                    </td>

                    {/* 월 세전급여 */}
                    <td className="p-2.5 border-r border-gray-200 text-right font-mono text-gray-700">
                      {m.monthlyGross.toLocaleString()}
                    </td>

                    {/* 기관부담 4대보험 */}
                    <td className="p-2.5 border-r border-gray-200 text-right font-mono text-gray-500">
                      {m.monthlyInsurance.toLocaleString()}
                    </td>

                    {/* 월 총인건비 */}
                    <td className="p-2.5 border-r border-gray-200 text-right font-mono font-bold text-gray-800 bg-gray-50/50">
                      {m.monthlyTotalComp.toLocaleString()}
                    </td>

                    {/* 참여율 (%) */}
                    <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-secondary text-[13px]">
                      {m.participationRate.toFixed(1)}%
                    </td>

                    {/* 급여 청구분 */}
                    <td className="p-2.5 border-r border-gray-200 text-right font-mono text-gray-800">
                      {m.requestedSalary.toLocaleString()}
                    </td>

                    {/* 4대보험 청구분 */}
                    <td className="p-2.5 border-r border-gray-200 text-right font-mono text-gray-600">
                      {includeInsurance ? m.requestedInsurance.toLocaleString() : '0'}
                    </td>

                    {/* 출금요청 합계 */}
                    <td className="p-2.5 border-r border-gray-200 text-right font-mono font-bold text-secondary bg-secondary/5 text-[13px]">
                      {m.requestedTotal.toLocaleString()}
                    </td>

                    {/* 확인/서명 */}
                    <td className="p-2.5 text-center text-gray-300 font-mono text-[10px]">
                      (인)
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer Summary */}
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-gray-900 text-[12px]">
                <td colSpan={4} className="p-3 text-center border-r border-gray-300">
                  합 계 (총 {memberStatements.length}명)
                </td>
                <td className="p-3 text-right font-mono border-r border-gray-300">
                  {memberStatements.reduce((s, m) => s + m.monthlyGross, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono border-r border-gray-300 text-gray-600">
                  {memberStatements.reduce((s, m) => s + m.monthlyInsurance, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono border-r border-gray-300">
                  {memberStatements.reduce((s, m) => s + m.monthlyTotalComp, 0).toLocaleString()}
                </td>
                <td className="p-3 text-center font-mono border-r border-gray-300 text-secondary">
                  {avgParticipationRate.toFixed(1)}%
                </td>
                <td className="p-3 text-right font-mono border-r border-gray-300">
                  {totalRequestedSalary.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono border-r border-gray-300 text-gray-600">
                  {includeInsurance ? totalRequestedInsurance.toLocaleString() : '0'}
                </td>
                <td className="p-3 text-right font-mono text-secondary bg-secondary/10 border-r border-gray-300 text-[14px]">
                  {totalRequestedAmount.toLocaleString()} 원
                </td>
                <td className="p-3 text-center text-gray-400 text-[11px]">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Official Notes / Statutory Guidelines */}
        <div className="text-[11px] text-gray-500 space-y-1 border-t border-gray-200 pt-4 leading-relaxed font-sans">
          <div>
            1. 본 명세서는 <strong>「국가연구개발혁신법 연구개발비 사용 기준」</strong>에 의거하여 참여연구원별 실제 근로계약 기준급여 및 해당 월 연구개발과제 참여율을 적용하여 산출한 정부지원금 출금 요청 내역서입니다.
          </div>
          <div>
            2. 참여연구원의 당월 타 과제 포함 전체 국가연구개발사업 참여율의 합은 100%를 초과할 수 없습니다.
          </div>
          <div>
            3. 출금된 연구개발비는 연구개발비 전용계좌(RCMS 또는 Ezbaro 연계)를 통해 실 참여연구원 개인 계좌로 실지급되어야 합니다.
          </div>
        </div>

        {/* Signatures Date */}
        <div className="mt-8 text-center text-[13px] font-semibold text-gray-700">
          <div>위와 같이 연구개발비(정부지원금) 인건비 출금을 요청합니다.</div>
          <div className="font-mono mt-2 text-gray-900 font-bold">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="mt-3 text-[14px] font-bold text-gray-900">
            {activeProject?.leadAgency || '(주)노웨어소프트'} 연구책임자 : {activeProject?.piName || '김프로'} (인)
          </div>
        </div>
      </div>
    </div>
  );
}
