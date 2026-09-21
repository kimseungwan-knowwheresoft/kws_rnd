"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  assignMember,
  removeProjectAssignment,
  updateAssignmentInfo,
  upsertMonthlyParticipation,
  updateAssignmentFundingType,
  batchSaveMonthlyParticipations,
  updateProjectAssignmentRole,
} from "@/app/actions";

export const PROJECT_ROLES = [
  { value: "PM", label: "연구책임자 (PM)" },
  { value: "참여연구원", label: "참여연구원" },
  { value: "선임연구원", label: "선임연구원" },
  { value: "책임연구원", label: "책임연구원" },
  { value: "전임연구원", label: "전임연구원" },
  { value: "연구원", label: "연구원" },
  { value: "연구보조원", label: "연구보조원" },
  { value: "위탁연구책임자", label: "위탁연구책임자" },
];

export function formatRole(role: string | null | undefined): string {
  if (!role) return "참여연구원";
  if (role === "PM") return "연구책임자 (PM)";
  if (role === "MEMBER") return "참여연구원";
  return role;
}

export interface AssignmentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  grossSalary: number;
  fourInsurances: number;
  nationality: string | null;
  affiliation: string | null;
  birthDateAndGender: string | null;
  degree: string | null;
  major: string | null;
  degreeYear: string | null;
  researcherNumber: string | null;
}

export interface Assignment {
  id: string;
  userId: string;
  projectId: string;
  roleInProject: string;
  researchRole: string | null;
  participationPeriod: string | null;
  newHireType: string | null;
  flexibleWork: string | null;
  thisProjectRate: number | null;
  nationalRndRate: number | null;
  totalRndProjects: number | null;
  fundingType: string | null; // "현금" | "현물"
  user: AssignmentUser;
}

export interface MonthlyParticipation {
  id: string;
  userId: string;
  yearMonth: string;
  rate: number;
  fundingType: string | null; // "현금" | "현물"
  user: AssignmentUser;
}

interface Props {
  projectId: string;
  canEdit: boolean;
  assignments: Assignment[];
  monthlyParticipations: MonthlyParticipation[];
  allResearchers: AssignmentUser[];
  distinctYears: number[];
  startYear: number;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function ProjectPersonnelManager({
  projectId,
  canEdit,
  assignments,
  monthlyParticipations,
  allResearchers,
  distinctYears,
  startYear,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedYear, setSelectedYear] = useState<number | "ALL">(
    distinctYears.length > 0 ? distinctYears[0] : startYear
  );
  const [activeTab, setActiveTab] = useState<"list" | "add" | "edit" | "monthly">("monthly");
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Active year for monthly matrix
  const activeMonthlyYear = useMemo(() => {
    if (typeof selectedYear === "number") return selectedYear;
    return distinctYears.length > 0 ? distinctYears[0] : startYear;
  }, [selectedYear, distinctYears, startYear]);

  // View settings in monthly tab
  const [viewMode, setViewMode] = useState<"RATE" | "COST" | "BOTH">("BOTH");
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Unit toggle: 'THOUSAND' (천원 - matching budget management) or 'WON' (원)
  const [unit, setUnit] = useState<"THOUSAND" | "WON">("THOUSAND");

  // Format cost based on unit toggle (천원 or 원)
  const formatCost = (wonAmount: number | null | undefined): string => {
    if (!wonAmount || wonAmount === 0) return "0";
    if (unit === "THOUSAND") {
      const thousandVal = Math.round(wonAmount / 1000);
      return thousandVal.toLocaleString();
    }
    return Math.round(wonAmount).toLocaleString();
  };

  // Batch modal state
  const [batchUser, setBatchUser] = useState<Assignment | null>(null);
  const [batchRate, setBatchRate] = useState<number>(50.0);
  const [batchFundingType, setBatchFundingType] = useState<"현금" | "현물">("현금");

  // Local state for interactive matrix cells (allows 2 decimal places)
  const [cellRates, setCellRates] = useState<Record<string, Record<number, number>>>({});
  const [dirtyUsers, setDirtyUsers] = useState<Set<string>>(new Set());

  // Initialize or update cellRates when monthlyParticipations or activeMonthlyYear changes
  useEffect(() => {
    const initialRates: Record<string, Record<number, number>> = {};
    assignments.forEach((a) => {
      initialRates[a.userId] = {};
      MONTHS.forEach((m) => {
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const ym = `${activeMonthlyYear}-${mStr}`;
        const mp = monthlyParticipations.find(
          (p) => p.userId === a.userId && p.yearMonth === ym
        );
        const rawRate = mp ? mp.rate : (a.thisProjectRate ?? 0);
        initialRates[a.userId][m] = Math.round(rawRate * 100) / 100;
      });
    });
    setCellRates(initialRates);
    setDirtyUsers(new Set());
  }, [assignments, monthlyParticipations, activeMonthlyYear]);

  // Handle cell rate change with 2 decimal places precision
  const handleRateChange = (userId: string, month: number, rawVal: string) => {
    const val = parseFloat(rawVal);
    const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(100, Math.round(val * 100) / 100));
    setCellRates((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [month]: clamped,
      },
    }));
    setDirtyUsers((prev) => new Set(prev).add(userId));
  };

  // Save single user's 1~12 months
  const handleSaveUserMonths = (a: Assignment) => {
    const userRates = cellRates[a.userId] || {};
    const fundingType = a.fundingType || "현금";
    const payload = MONTHS.map((m) => ({
      month: m,
      rate: userRates[m] ?? (a.thisProjectRate ?? 0),
      fundingType,
    }));

    startTransition(async () => {
      await batchSaveMonthlyParticipations(projectId, a.userId, activeMonthlyYear, payload);
      setDirtyUsers((prev) => {
        const next = new Set(prev);
        next.delete(a.userId);
        return next;
      });
      setStatusMessage(`${a.user.name} 연구원의 ${activeMonthlyYear}년 참여율이 저장되었습니다.`);
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  // Switch Cash/In-Kind funding type for a researcher
  const handleToggleFundingType = (a: Assignment, newType: "현금" | "현물") => {
    if (a.fundingType === newType) return;
    startTransition(async () => {
      await updateAssignmentFundingType(projectId, a.userId, newType, activeMonthlyYear);
      setStatusMessage(`${a.user.name} 연구원의 집행구분이 [${newType}]로 설정되었습니다.`);
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  // Local state for free-form role inputs in list tab
  const [roleInputs, setRoleInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setRoleInputs((prev) => {
      const next = { ...prev };
      assignments.forEach((a) => {
        if (next[a.userId] === undefined || next[a.userId] !== a.roleInProject) {
          next[a.userId] = a.roleInProject || "참여연구원";
        }
      });
      return next;
    });
  }, [assignments]);

  // Change project assignment role for a researcher
  const handleRoleChange = (userId: string, newRole: string) => {
    const trimmed = newRole.trim() || "참여연구원";
    setRoleInputs((prev) => ({ ...prev, [userId]: trimmed }));
    startTransition(async () => {
      await updateProjectAssignmentRole(projectId, userId, trimmed);
      setStatusMessage(`과제 내 역할이 [${formatRole(trimmed)}]로 변경되었습니다.`);
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  // Apply batch rate to all 12 months for a user
  const handleApplyBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchUser) return;
    const cleanRate = Math.round(batchRate * 100) / 100;
    const payload = MONTHS.map((m) => ({
      month: m,
      rate: cleanRate,
      fundingType: batchFundingType,
    }));

    startTransition(async () => {
      await batchSaveMonthlyParticipations(projectId, batchUser.userId, activeMonthlyYear, payload);
      await updateAssignmentFundingType(projectId, batchUser.userId, batchFundingType, activeMonthlyYear);
      setBatchUser(null);
      setStatusMessage(
        `${batchUser.user.name} 연구원의 1~12월 참여율(${cleanRate.toFixed(2)}%, ${batchFundingType})이 일괄 적용되었습니다.`
      );
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  // Remove member
  const handleRemove = (userId: string) => setConfirmDeleteId(userId);
  const handleConfirmRemove = (userId: string) => {
    startTransition(async () => {
      await removeProjectAssignment(projectId, userId);
      setConfirmDeleteId(null);
    });
  };

  // Add member form submit
  const handleAddMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = fd.get("userId") as string;
    const roleInProject = fd.get("roleInProject") as string;
    startTransition(async () => {
      await assignMember(projectId, userId, roleInProject);
    });
  };

  // Update assignment info submit
  const handleUpdateAssignment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const assignmentId = fd.get("assignmentId") as string;
    startTransition(async () => {
      await updateAssignmentInfo(assignmentId, projectId, fd);
      setActiveTab("list");
      setEditingAssignment(null);
    });
  };

  // Single monthly participation submit (secondary sub-form)
  const handleMonthlySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = fd.get("userId") as string;
    const yearMonth = fd.get("yearMonth") as string;
    const rawRate = parseFloat(fd.get("rate") as string);
    const rate = Math.round(rawRate * 100) / 100;
    const fundingType = (fd.get("fundingType") as string) || "현금";
    startTransition(async () => {
      await upsertMonthlyParticipation(userId, projectId, yearMonth, rate, fundingType);
      setStatusMessage("월별 참여율이 저장되었습니다.");
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  const assignedUserIds = new Set(assignments.map((a) => a.userId));
  const unassignedResearchers = allResearchers.filter((r) => !assignedUserIds.has(r.id));

  // Matrix calculations
  const matrixData = useMemo(() => {
    return assignments.map((a) => {
      const grossSalary = a.user.grossSalary || 0;
      const fourInsurances = a.user.fourInsurances || 0;
      const monthlyGross = grossSalary > 0 ? Math.round(grossSalary / 12) : 0;
      const monthlyInsurance = fourInsurances > 0 ? Math.round(fourInsurances / 12) : 0;
      const monthlyBase = includeInsurance ? monthlyGross + monthlyInsurance : monthlyGross;
      const fundingType = (a.fundingType as "현금" | "현물") || "현금";

      const months = MONTHS.map((m) => {
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const ym = `${activeMonthlyYear}-${mStr}`;
        const mp = monthlyParticipations.find((p) => p.userId === a.userId && p.yearMonth === ym);
        const rate =
          cellRates[a.userId]?.[m] !== undefined
            ? cellRates[a.userId][m]
            : mp
            ? mp.rate
            : (a.thisProjectRate ?? 0);
        const cost = Math.round(monthlyBase * (rate / 100));
        return { month: m, rate, cost, fundingType: mp?.fundingType || fundingType };
      });

      const totalMonthsRate = months.reduce((sum, m) => sum + m.rate, 0);
      const avgRate = months.length > 0 ? totalMonthsRate / months.length : 0;
      const totalCost = months.reduce((sum, m) => sum + m.cost, 0);
      const isOver100 = months.some((m) => m.rate > 100);

      return {
        assignment: a,
        monthlyGross,
        monthlyInsurance,
        monthlyBase,
        fundingType,
        months,
        avgRate,
        totalCost,
        isOver100,
      };
    });
  }, [assignments, monthlyParticipations, activeMonthlyYear, cellRates, includeInsurance]);

  // Summary Totals
  const summaryTotals = useMemo(() => {
    let totalCashCost = 0;
    let totalGoodsCost = 0;
    let totalAllCost = 0;

    const monthlyTotals = MONTHS.map((m) => {
      let monthCash = 0;
      let monthGoods = 0;
      let monthRateSum = 0;

      matrixData.forEach((row) => {
        const mData = row.months.find((item) => item.month === m);
        if (mData) {
          monthRateSum += mData.rate;
          if (row.fundingType === "현물") {
            monthGoods += mData.cost;
          } else {
            monthCash += mData.cost;
          }
        }
      });

      return {
        month: m,
        cashCost: monthCash,
        goodsCost: monthGoods,
        totalCost: monthCash + monthGoods,
        avgRate: matrixData.length > 0 ? monthRateSum / matrixData.length : 0,
      };
    });

    monthlyTotals.forEach((mt) => {
      totalCashCost += mt.cashCost;
      totalGoodsCost += mt.goodsCost;
      totalAllCost += mt.totalCost;
    });

    const overallAvgRate =
      matrixData.length > 0
        ? matrixData.reduce((sum, r) => sum + r.avgRate, 0) / matrixData.length
        : 0;

    return {
      totalCashCost,
      totalGoodsCost,
      totalAllCost,
      overallAvgRate,
      monthlyTotals,
    };
  }, [matrixData]);

  return (
    <div className="space-y-6 font-sans">
      {/* Year Tabs + Inner Tab Nav */}
      <div className="flex flex-col gap-3">
        {/* Year Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <i className="fa-solid fa-calendar-days text-secondary text-[12px]"></i>
            연차별 조회:
          </span>
          {distinctYears.map((yr, idx) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all shadow-xs ${
                selectedYear === yr
                  ? "bg-secondary text-white shadow-secondary/20"
                  : "bg-surface-lowest text-gray-600 hover:bg-surface-hover border border-border"
              }`}
            >
              {idx + 1}차년도 ({yr}년)
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedYear("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all shadow-xs ${
              selectedYear === "ALL"
                ? "bg-secondary text-white shadow-secondary/20"
                : "bg-surface-lowest text-gray-600 hover:bg-surface-hover border border-border"
            }`}
          >
            전체 연차
          </button>
        </div>

        {/* Inner Tab Nav */}
        <div className="flex items-center gap-1 border-b border-border">
          {(
            [
              { key: "monthly", label: "월별 참여율 & 인건비 집행", icon: "fa-calendar-check" },
              { key: "list", label: "인력 명부", icon: "fa-users" },
              ...(canEdit
                ? [
                    { key: "add", label: "인력 추가", icon: "fa-user-plus" },
                    { key: "edit", label: "정보 수정", icon: "fa-pen-to-square" },
                  ]
                : []),
            ] as { key: string; label: string; icon: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as "list" | "add" | "edit" | "monthly")}
              className={`flex items-center gap-2 px-4 py-3 text-[13.5px] font-bold border-b-2 transition-all -mb-px ${
                activeTab === t.key
                  ? "border-secondary text-secondary"
                  : "border-transparent text-gray-500 hover:text-primary hover:border-border"
              }`}
            >
              <i className={`fa-solid ${t.icon} text-[12px]`}></i>
              {t.label}
            </button>
          ))}
          <div className="ml-auto pb-1 flex items-center gap-2">
            <span className="badge bg-surface-container text-primary font-bold text-[12px]">
              {activeMonthlyYear}년 기준 · 참여 인력 {assignments.length}명
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="flex items-center gap-2 bg-secondary/10 text-primary border border-secondary/30 px-4 py-2.5 rounded-lg text-[13px] font-semibold animate-fade-in">
          <i className="fa-solid fa-circle-check text-secondary text-[14px]"></i>
          {statusMessage}
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-[13px] text-secondary font-semibold py-1">
          <i className="fa-solid fa-spinner fa-spin text-[14px]"></i>
          저장 및 재계산 중...
        </div>
      )}

      {/* TAB 1: 월별 참여율 & 인건비 집행 */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {/* Top KPI Cards (디자인 시스템 규칙과 동일한 서식) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="glass-panel p-5 bg-surface-lowest">
              <div className="text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-users text-primary text-[12px]"></i>
                {activeMonthlyYear}년 참여 인력
              </div>
              <div className="text-[22px] font-extrabold text-primary mt-2 font-mono">
                {assignments.length}{" "}
                <span className="text-[13px] font-normal text-gray-500">명</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">과제 참여 연구인력</div>
            </div>

            <div className="glass-panel p-5 bg-surface-lowest">
              <div className="text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-coins text-secondary text-[12px]"></i>
                연간 현금 인건비
              </div>
              <div className="text-[22px] font-extrabold text-secondary mt-2 font-mono">
                {summaryTotals.totalCashCost.toLocaleString()}{" "}
                <span className="text-[13px] font-normal text-gray-500">원</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">현금 집행 연구원 합산</div>
            </div>

            <div className="glass-panel p-5 bg-surface-lowest">
              <div className="text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-box-archive text-gray-500 text-[12px]"></i>
                연간 현물 인건비
              </div>
              <div className="text-[22px] font-extrabold text-gray-800 mt-2 font-mono">
                {summaryTotals.totalGoodsCost.toLocaleString()}{" "}
                <span className="text-[13px] font-normal text-gray-500">원</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">현물 매칭 연구원 합산</div>
            </div>

            <div className="glass-panel p-5 bg-surface-lowest">
              <div className="text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-calculator text-primary text-[12px]"></i>
                연간 총 인건비 합계
              </div>
              <div className="text-[22px] font-extrabold text-primary mt-2 font-mono">
                {summaryTotals.totalAllCost.toLocaleString()}{" "}
                <span className="text-[13px] font-normal text-gray-500">원</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">현금 + 현물 총소요 예산</div>
            </div>

            <div className="glass-panel p-5 bg-surface-lowest">
              <div className="text-[12px] font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-chart-pie text-secondary text-[12px]"></i>
                연간 평균 참여율
              </div>
              <div className="text-[22px] font-extrabold text-secondary mt-2 font-mono">
                {summaryTotals.overallAvgRate.toFixed(2)}{" "}
                <span className="text-[13px] font-normal text-gray-500">%</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">전체 참여율 산술평균</div>
            </div>
          </div>

          {/* Controls Bar: View Mode, Insurance Toggle, Unit Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container/30 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-gray-600 mr-1">표시 방식:</span>
              <div className="inline-flex rounded-md shadow-2xs bg-surface-lowest border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("RATE")}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                    viewMode === "RATE"
                      ? "bg-secondary text-white shadow-xs"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  % 참여율만
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("COST")}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                    viewMode === "COST"
                      ? "bg-secondary text-white shadow-xs"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  ₩ 인건비만
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("BOTH")}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                    viewMode === "BOTH"
                      ? "bg-secondary text-white shadow-xs"
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  참여율 + 인건비 함께
                </button>
              </div>

              <label className="flex items-center gap-2 ml-3 cursor-pointer select-none text-[12.5px] font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={includeInsurance}
                  onChange={(e) => setIncludeInsurance(e.target.checked)}
                  className="rounded border-gray-300 text-secondary focus:ring-secondary/40 h-4 w-4"
                />
                4대보험(기관부담금) 포함 계산
              </label>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              {/* Unit Toggle: 천원 (표준) / 원 */}
              <div className="flex items-center gap-1.5 bg-surface-lowest px-2.5 py-1 rounded-md border border-border shadow-2xs">
                <span className="text-[11px] text-gray-500 font-medium">단위:</span>
                <div className="flex rounded overflow-hidden text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUnit("THOUSAND")}
                    className={`px-2.5 py-0.5 transition-colors ${
                      unit === "THOUSAND"
                        ? "bg-secondary text-white shadow-xs"
                        : "text-gray-600 hover:text-primary"
                    }`}
                  >
                    천원
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit("WON")}
                    className={`px-2.5 py-0.5 transition-colors ${
                      unit === "WON"
                        ? "bg-secondary text-white shadow-xs"
                        : "text-gray-600 hover:text-primary"
                    }`}
                  >
                    원
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 1~12월 참여율 및 월별 인건비 매트릭스 그리드 */}
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-[14px] bg-surface-lowest rounded-xl border border-border">
              <i className="fa-solid fa-user-slash text-[32px] text-gray-300 mb-3 block"></i>
              등록된 참여 인력이 없습니다.
              {canEdit && (
                <div className="mt-2 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("add")}
                    className="text-secondary hover:underline font-semibold"
                  >
                    + 인력 추가하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border shadow-xs bg-surface-lowest">
              <table className="w-full border-collapse text-[13px] font-sans min-w-[1300px]">
                <thead>
                  <tr className="bg-surface-container/50 border-b border-border text-gray-600 font-bold text-[12px]">
                    <th className="p-3 text-left w-48 sticky left-0 bg-surface-container/90 backdrop-blur-sm z-10 border-r border-border font-bold">
                      연구원 / 직위
                    </th>
                    <th className="p-3 text-center w-28 border-r border-border font-bold">
                      월 기준급여
                      <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                        ({unit === "THOUSAND" ? "단위: 천원" : "단위: 원"})
                      </span>
                    </th>
                    <th className="p-3 text-center w-28 border-r border-border font-bold">
                      인건비 구분
                      <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                        클릭 전환
                      </span>
                    </th>
                    {MONTHS.map((m) => (
                      <th key={m} className="p-2.5 text-center min-w-[76px] border-r border-border/60 font-bold">
                        {m}월
                      </th>
                    ))}
                    <th className="p-3 text-center w-24 border-r border-border font-bold">평균 참여율</th>
                    <th className="p-3 text-right w-36 border-r border-border font-bold">
                      연간 총 인건비
                      <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                        ({unit === "THOUSAND" ? "단위: 천원" : "단위: 원"})
                      </span>
                    </th>
                    {canEdit && <th className="p-3 text-center w-24 font-bold">관리</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {matrixData.map((row, idx) => {
                    const a = row.assignment;
                    const isDirty = dirtyUsers.has(a.userId);
                    const isCash = row.fundingType === "현금";

                    return (
                      <tr
                        key={a.id}
                        className={`transition-colors hover:bg-surface-hover/30 ${
                          idx % 2 === 0 ? "bg-white" : "bg-surface-lowest/40"
                        }`}
                      >
                        {/* 1. Researcher Info */}
                        <td className="p-3 sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-border">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-surface-container text-gray-700 border border-border">
                              {a.user.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-primary text-[13.5px] flex items-center gap-1.5">
                                {a.user.name}
                                {(a.roleInProject === "PM" || a.roleInProject.includes("PM") || a.roleInProject.includes("연구책임자")) && (
                                  <span className="px-1.5 py-0.2 bg-secondary/15 text-secondary text-[10px] font-bold rounded">
                                    PM
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                  a.user.affiliation?.includes("프리랜서")
                                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {a.user.affiliation?.includes("프리랜서") ? "프리랜서" : "당사 직원"}
                                </span>
                                <span>{formatRole(a.roleInProject)} · {a.user.affiliation || "소속미입력"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Monthly Base Salary */}
                        <td className="p-3 text-center font-mono text-[12px] border-r border-border">
                          <div className="font-bold text-gray-800">
                            {formatCost(row.monthlyBase)}
                            <span className="text-[10px] text-gray-400 font-sans ml-0.5">
                              {unit === "THOUSAND" ? "천원" : "원"}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-sans">
                            연 {formatCost(a.user.grossSalary || 0)}
                            {unit === "THOUSAND" ? "천원" : "원"}
                          </div>
                        </td>

                        {/* 3. Funding Type Selector (현금 / 현물) */}
                        <td className="p-3 text-center border-r border-border">
                          {canEdit ? (
                            <div className="inline-flex rounded-md border border-border p-0.5 bg-surface-container/30 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleToggleFundingType(a, "현금")}
                                disabled={isPending}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all flex items-center gap-1 ${
                                  isCash
                                    ? "bg-secondary text-white shadow-xs"
                                    : "text-gray-500 hover:text-primary"
                                }`}
                                title="현금으로 인건비 집행"
                              >
                                현금
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFundingType(a, "현물")}
                                disabled={isPending}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all flex items-center gap-1 ${
                                  !isCash
                                    ? "bg-primary text-white shadow-xs"
                                    : "text-gray-500 hover:text-primary"
                                }`}
                                title="현물(사내매칭)로 인건비 집행"
                              >
                                현물
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`badge font-bold text-[11px] ${
                                isCash
                                  ? "bg-secondary/15 text-secondary"
                                  : "bg-surface-container text-gray-700 border border-border"
                              }`}
                            >
                              <i className={`fa-solid ${isCash ? "fa-coins text-secondary" : "fa-box-archive text-gray-500"} mr-1 text-[10px]`}></i>
                              {isCash ? "현금" : "현물"}
                            </span>
                          )}
                        </td>

                        {/* 4. 1~12 Months Cells */}
                        {row.months.map((m) => (
                          <td
                            key={m.month}
                            className={`p-1.5 text-center border-r border-border/60 ${
                              m.rate > 0 ? "bg-secondary/[0.02]" : ""
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-1">
                              {/* Rate Input or Display (allows 2 decimal places) */}
                              {canEdit ? (
                                <div className="relative inline-flex items-center justify-center w-full">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={m.rate}
                                    onChange={(e) =>
                                      handleRateChange(a.userId, m.month, e.target.value)
                                    }
                                    className={`w-16 text-center font-mono text-[12px] font-bold py-1 px-1 rounded border transition-colors ${
                                      m.rate > 0
                                        ? "border-secondary/40 bg-secondary/5 text-secondary"
                                        : "border-border text-gray-400 bg-white"
                                    } focus:border-secondary focus:ring-1 focus:ring-secondary/30`}
                                  />
                                  <span className="text-[10px] text-gray-400 ml-0.5">%</span>
                                </div>
                              ) : (
                                <span
                                  className={`font-mono text-[12px] font-bold ${
                                    m.rate > 0 ? "text-secondary" : "text-gray-300"
                                  }`}
                                >
                                  {m.rate.toFixed(2)}%
                                </span>
                              )}

                              {/* Calculated Cost Display (if COST or BOTH) */}
                              {viewMode !== "RATE" && (
                                <span
                                  className={`font-mono text-[10.5px] tracking-tight block ${
                                    isCash ? "text-secondary font-semibold" : "text-gray-600 font-medium"
                                  } ${m.cost === 0 ? "opacity-30" : ""}`}
                                  title={`${m.month}월 인건비: ${m.cost.toLocaleString()}원 (${row.fundingType})`}
                                >
                                  {m.cost > 0 ? formatCost(m.cost) : "0"}
                                </span>
                              )}
                            </div>
                          </td>
                        ))}

                        {/* 5. Average Rate (Formatted with 2 decimal places) */}
                        <td className="p-3 text-center border-r border-border">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-bold font-mono ${
                              row.isOver100
                                ? "bg-tertiary/10 text-tertiary"
                                : row.avgRate > 80
                                ? "bg-amber-100 text-amber-700"
                                : row.avgRate > 0
                                ? "bg-secondary/15 text-secondary"
                                : "text-gray-300"
                            }`}
                          >
                            {row.avgRate.toFixed(2)}%
                          </span>
                        </td>

                        {/* 6. Total Annual Cost */}
                        <td className="p-3 text-right border-r border-border font-mono">
                          <div
                            className={`font-bold text-[13px] ${
                              isCash ? "text-secondary" : "text-primary"
                            }`}
                          >
                            {formatCost(row.totalCost)}
                            <span className="text-[11px] font-normal text-gray-500 ml-0.5">
                              {unit === "THOUSAND" ? "천원" : "원"}
                            </span>
                          </div>
                          <span
                            className={`badge text-[10px] font-bold mt-0.5 ${
                              isCash
                                ? "bg-secondary/15 text-secondary"
                                : "bg-surface-container text-gray-700 border border-border"
                            }`}
                          >
                            <i className={`fa-solid ${isCash ? "fa-coins text-secondary" : "fa-box-archive text-gray-500"} mr-1 text-[9px]`}></i>
                            {row.fundingType}
                          </span>
                        </td>

                        {/* 7. Action / Quick Batch Button */}
                        {canEdit && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isDirty ? (
                                <button
                                  type="button"
                                  onClick={() => handleSaveUserMonths(a)}
                                  disabled={isPending}
                                  className="btn btn-primary text-[11px] py-1 px-2.5 font-bold shadow-xs h-7"
                                  title="변경된 1~12월 참여율 저장"
                                >
                                  <i className="fa-solid fa-check mr-1 text-[10px]"></i>
                                  저장
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBatchUser(a);
                                    setBatchRate(a.thisProjectRate ?? 50.0);
                                    setBatchFundingType(
                                      (a.fundingType as "현금" | "현물") || "현금"
                                    );
                                  }}
                                  className="px-2.5 py-1 text-[11px] text-gray-600 hover:text-secondary hover:bg-surface-container rounded-md border border-border transition-colors font-medium flex items-center gap-1"
                                  title="1~12월 참여율 일괄 적용"
                                >
                                  <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                                  일괄
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer Totals Rows (컬럼 1:1 완벽 정렬) */}
                <tfoot>
                  {/* Row 1: Monthly Average Rates */}
                  <tr className="bg-surface-container/40 border-t-2 border-border font-bold text-gray-700">
                    <td className="p-2.5 px-3 sticky left-0 bg-surface-container/90 backdrop-blur-sm z-10 border-r border-border text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-chart-line text-secondary text-[11px]"></i>
                        <span>월별 평균 참여율</span>
                      </div>
                    </td>
                    <td className="p-2 text-center text-gray-400 font-mono text-[11px] border-r border-border">-</td>
                    <td className="p-2 text-center text-gray-400 font-mono text-[11px] border-r border-border">-</td>
                    {summaryTotals.monthlyTotals.map((mt) => (
                      <td
                        key={mt.month}
                        className="p-2 text-center font-mono text-[12px] font-bold text-secondary border-r border-border/60"
                      >
                        {mt.avgRate.toFixed(2)}%
                      </td>
                    ))}
                    <td className="p-2 text-center font-mono text-[12px] font-extrabold text-secondary border-r border-border">
                      {summaryTotals.overallAvgRate.toFixed(2)}%
                    </td>
                    <td className="p-2 text-center font-mono text-[12px] text-gray-400 border-r border-border">
                      -
                    </td>
                    {canEdit && <td className="p-2 border-r border-border"></td>}
                  </tr>

                  {/* Row 2: Monthly Cash Labor Cost */}
                  <tr className="bg-surface-lowest border-t border-border font-bold text-gray-800">
                    <td className="p-2.5 px-3 sticky left-0 bg-surface-lowest/90 backdrop-blur-sm z-10 border-r border-border text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-coins text-secondary text-[11px]"></i>
                        <span>월별 현금 인건비 소계</span>
                      </div>
                    </td>
                    <td className="p-2 text-center text-gray-400 font-mono text-[11px] border-r border-border">-</td>
                    <td className="p-2 text-center border-r border-border">
                      <span className="badge bg-secondary/15 text-secondary font-bold text-[10px]">현금</span>
                    </td>
                    {summaryTotals.monthlyTotals.map((mt) => (
                      <td
                        key={mt.month}
                        className="p-2 text-center font-mono text-[11.5px] font-bold text-secondary border-r border-border/60"
                      >
                        {mt.cashCost > 0 ? formatCost(mt.cashCost) : "0"}
                      </td>
                    ))}
                    <td className="p-2 text-center border-r border-border text-[11px] text-gray-500 font-medium">
                      현금 소계
                    </td>
                    <td className="p-2 text-right font-mono text-[12.5px] font-bold text-secondary border-r border-border">
                      {formatCost(summaryTotals.totalCashCost)}
                      <span className="text-[10px] ml-0.5 font-normal">
                        {unit === "THOUSAND" ? "천원" : "원"}
                      </span>
                    </td>
                    {canEdit && <td className="p-2 border-r border-border"></td>}
                  </tr>

                  {/* Row 3: Monthly Goods Labor Cost */}
                  <tr className="bg-surface-lowest border-t border-border font-bold text-gray-800">
                    <td className="p-2.5 px-3 sticky left-0 bg-surface-lowest/90 backdrop-blur-sm z-10 border-r border-border text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-box-archive text-gray-500 text-[11px]"></i>
                        <span>월별 현물 인건비 소계</span>
                      </div>
                    </td>
                    <td className="p-2 text-center text-gray-400 font-mono text-[11px] border-r border-border">-</td>
                    <td className="p-2 text-center border-r border-border">
                      <span className="badge bg-surface-container text-gray-700 border border-border font-bold text-[10px]">현물</span>
                    </td>
                    {summaryTotals.monthlyTotals.map((mt) => (
                      <td
                        key={mt.month}
                        className="p-2 text-center font-mono text-[11.5px] font-bold text-gray-700 border-r border-border/60"
                      >
                        {mt.goodsCost > 0 ? formatCost(mt.goodsCost) : "0"}
                      </td>
                    ))}
                    <td className="p-2 text-center border-r border-border text-[11px] text-gray-500 font-medium">
                      현물 소계
                    </td>
                    <td className="p-2 text-right font-mono text-[12.5px] font-bold text-gray-800 border-r border-border">
                      {formatCost(summaryTotals.totalGoodsCost)}
                      <span className="text-[10px] ml-0.5 font-normal">
                        {unit === "THOUSAND" ? "천원" : "원"}
                      </span>
                    </td>
                    {canEdit && <td className="p-2 border-r border-border"></td>}
                  </tr>

                  {/* Row 4: Total Labor Cost (Cash + Goods) */}
                  <tr className="bg-surface-container/60 border-t-2 border-border text-primary font-black">
                    <td className="p-3 px-3 sticky left-0 bg-surface-container/90 backdrop-blur-sm z-10 border-r border-border text-[12.5px]">
                      <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-calculator text-primary text-[12px]"></i>
                        <span>월별 총 인건비 합계</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center text-gray-400 font-mono text-[11px] border-r border-border">-</td>
                    <td className="p-2.5 text-center border-r border-border">
                      <span className="badge bg-primary text-white font-bold text-[10px]">전체</span>
                    </td>
                    {summaryTotals.monthlyTotals.map((mt) => (
                      <td
                        key={mt.month}
                        className="p-2.5 text-center font-mono text-[12px] font-black text-primary border-r border-border/60"
                      >
                        {mt.totalCost > 0 ? formatCost(mt.totalCost) : "0"}
                      </td>
                    ))}
                    <td className="p-2.5 text-center border-r border-border text-[11px] text-primary font-bold">
                      총합계
                    </td>
                    <td className="p-2.5 text-right font-mono text-[13.5px] font-black text-primary border-r border-border">
                      {formatCost(summaryTotals.totalAllCost)}
                      <span className="text-[11px] ml-0.5 font-normal">
                        {unit === "THOUSAND" ? "천원" : "원"}
                      </span>
                    </td>
                    {canEdit && <td className="p-2.5 border-r border-border"></td>}
                  </tr>
                </tfoot>
              </table>
              <div className="p-3 bg-surface-container/20 border-t border-border flex flex-wrap items-center justify-between text-[11.5px] text-gray-500 gap-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-secondary text-[11px]"></i>
                  <span>
                    * 인건비 표시 단위: <strong className="text-gray-800">{unit === "THOUSAND" ? "천원 (1,000원)" : "원 (1원)"}</strong> (상단 단위 토글로 변경 가능)
                  </span>
                </div>
                <div>
                  <span>월별 인건비 = (월 기준급여 × 참여율) {includeInsurance ? "· 4대보험 포함" : "· 4대보험 제외"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Batch Apply Modal */}
          {batchUser && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-2xl w-full max-w-md space-y-5 animate-scale-in">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h4 className="text-[16px] font-bold text-primary flex items-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles text-secondary"></i>
                    1~12월 참여율 일괄 설정
                  </h4>
                  <button
                    type="button"
                    onClick={() => setBatchUser(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <i className="fa-solid fa-xmark text-[16px]"></i>
                  </button>
                </div>

                <form onSubmit={handleApplyBatch} className="space-y-4">
                  <div className="bg-surface-lowest p-3.5 rounded-xl border border-border">
                    <div className="text-[12px] text-gray-500">대상 연구원:</div>
                    <div className="text-[15px] font-bold text-primary mt-0.5">
                      {batchUser.user.name} ({formatRole(batchUser.roleInProject)})
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      기준 연차: {activeMonthlyYear}년 (1월 ~ 12월 전체 12개월 일괄 적용)
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                      참여율 (%) (0.00 ~ 100.00, 소수점 2자리 가능)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      value={batchRate}
                      onChange={(e) => setBatchRate(parseFloat(e.target.value) || 0)}
                      className="w-full text-[14px] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                      인건비 집행 구분
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBatchFundingType("현금")}
                        className={`p-3 rounded-lg border font-bold text-[13px] flex items-center justify-center gap-2 transition-all ${
                          batchFundingType === "현금"
                            ? "border-secondary bg-secondary/10 text-secondary shadow-xs"
                            : "border-border text-gray-600 hover:bg-surface-container"
                        }`}
                      >
                        <i className="fa-solid fa-coins text-secondary"></i>
                        현금 (Cash)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchFundingType("현물")}
                        className={`p-3 rounded-lg border font-bold text-[13px] flex items-center justify-center gap-2 transition-all ${
                          batchFundingType === "현물"
                            ? "border-primary bg-surface-container text-primary shadow-xs"
                            : "border-border text-gray-600 hover:bg-surface-container"
                        }`}
                      >
                        <i className="fa-solid fa-box-archive text-gray-500"></i>
                        현물 (In-kind)
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setBatchUser(null)}
                      className="btn btn-secondary text-[13px] px-5"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn btn-primary text-[13px] px-6 font-bold"
                    >
                      <i className="fa-solid fa-check mr-1.5"></i>
                      12개월 전체 적용하기
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 단일 월 추가/수정용 서브 폼 (하단 접이식 보조 도구) */}
          {canEdit && (
            <details className="bg-surface-lowest border border-border p-4 rounded-xl group font-sans">
              <summary className="cursor-pointer text-[13px] font-bold text-gray-600 flex items-center justify-between select-none">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-calendar-plus text-secondary text-[12px]"></i>
                  특정 단일 월 직접 지정 등록 (보조 입력)
                </span>
                <i className="fa-solid fa-chevron-down text-[11px] text-gray-400 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div className="pt-4 mt-3 border-t border-border">
                <form onSubmit={handleMonthlySubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label>연구원 선택</label>
                      <select name="userId" required>
                        {assignments.map((a) => (
                          <option key={a.userId} value={a.userId}>
                            {a.user.name} ({formatRole(a.roleInProject)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>연월 (YYYY-MM)</label>
                      <input
                        type="month"
                        name="yearMonth"
                        required
                        defaultValue={`${activeMonthlyYear}-01`}
                      />
                    </div>
                    <div>
                      <label>참여율 % (최대 100, 소수점 2자리)</label>
                      <input
                        type="number"
                        name="rate"
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        defaultValue="50.00"
                      />
                    </div>
                    <div>
                      <label>인건비 집행 구분</label>
                      <select name="fundingType" defaultValue="현금">
                        <option value="현금">현금 (Cash)</option>
                        <option value="현물">현물 (In-kind)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn btn-primary text-[13px] px-7"
                    >
                      참여율 저장
                    </button>
                  </div>
                </form>
              </div>
            </details>
          )}
        </div>
      )}

      {/* TAB 2: 인력 명부 */}
      {activeTab === "list" && (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-[14px]">
              <i className="fa-solid fa-user-slash text-[32px] text-gray-300 mb-3 block"></i>
              등록된 참여 인력이 없습니다.
              {canEdit && (
                <div className="mt-2 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("add")}
                    className="text-secondary hover:underline font-semibold"
                  >
                    + 인력 추가하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[960px] border-collapse text-[13px] font-sans">
                <thead>
                  <tr className="bg-surface-container/50 border-b border-border text-gray-600 font-bold text-[12px] uppercase">
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3 text-left">성명 / 직위</th>
                    <th className="p-3 text-left">소속 / 국적</th>
                    <th className="p-3 text-left">연구담당분야</th>
                    <th className="p-3 text-left">과제참여기간</th>
                    <th className="p-3 text-center">인건비 구분</th>
                    <th className="p-3 text-center">본과제[A]</th>
                    <th className="p-3 text-center">국가R&D[B]</th>
                    <th className="p-3 text-center">합계[A+B]</th>
                    {canEdit && <th className="p-3 text-center w-24">관리</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {assignments.map((a, idx) => {
                    const totalRate = (a.thisProjectRate || 0) + (a.nationalRndRate || 0);
                    const isOver = totalRate > 100;
                    const isCash = (a.fundingType || "현금") === "현금";

                    return (
                      <tr
                        key={a.id}
                        className={`transition-colors hover:bg-surface-container/20 ${
                          idx % 2 === 0 ? "bg-white" : "bg-surface-lowest/40"
                        }`}
                      >
                        <td className="p-3 text-center text-gray-400 font-mono text-[12px]">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-primary text-[14px] flex items-center gap-1.5">
                            {a.user.name}
                            {(a.roleInProject === "PM" || a.roleInProject.includes("PM") || a.roleInProject.includes("연구책임자")) && (
                              <span className="px-1.5 py-0.2 bg-secondary/15 text-secondary text-[10px] font-bold rounded">
                                PM
                              </span>
                            )}
                          </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {canEdit ? (
                                <input
                                  type="text"
                                  value={roleInputs[a.userId] ?? a.roleInProject ?? "참여연구원"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setRoleInputs((prev) => ({ ...prev, [a.userId]: val }));
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim() || "참여연구원";
                                    if (val !== a.roleInProject) {
                                      handleRoleChange(a.userId, val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  disabled={isPending}
                                  placeholder="역할/직위 입력"
                                  className="text-[11.5px] font-medium py-0.5 px-2 rounded-md border border-border bg-surface hover:border-secondary focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary/30 text-gray-800 transition-all w-28 sm:w-32 shadow-2xs font-sans"
                                  title="과제 내 역할/직위 직접 입력 (Enter 또는 다른 곳 클릭 시 저장)"
                                />
                              ) : (
                                <span className="text-[11.5px] font-semibold text-secondary">
                                  {formatRole(a.roleInProject)}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-300">·</span>
                              <span className="text-[11px] text-gray-500">{a.user.degree || "학위정보 없음"}</span>
                            </div>
                        </td>
                        <td className="p-3">
                          <div className="text-[13px] text-gray-700 flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              a.user.affiliation === "프리랜서" || a.user.affiliation?.includes("프리랜서")
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {a.user.affiliation === "프리랜서" || a.user.affiliation?.includes("프리랜서") ? "프리랜서" : "당사 직원"}
                            </span>
                            <span>{a.user.affiliation || "-"}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {a.user.nationality || "-"}
                          </div>
                        </td>
                        <td className="p-3 text-[13px] text-gray-700">{a.researchRole ?? "-"}</td>
                        <td className="p-3 text-[12px] text-gray-600 font-mono">
                          {a.participationPeriod ?? "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`badge font-bold text-[11px] ${
                              isCash
                                ? "bg-secondary/15 text-secondary"
                                : "bg-surface-container text-gray-700 border border-border"
                            }`}
                          >
                            <i className={`fa-solid ${isCash ? "fa-coins text-secondary" : "fa-box-archive text-gray-500"} mr-1 text-[10px]`}></i>
                            {isCash ? "현금" : "현물"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-secondary text-[14px]">
                          {Number((a.thisProjectRate ?? 0).toFixed(2))}%
                        </td>
                        <td className="p-3 text-center font-mono text-[13px] text-gray-600">
                          {Number((a.nationalRndRate ?? 0).toFixed(2))}%
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-bold font-mono ${
                              isOver
                                ? "bg-tertiary/10 text-tertiary"
                                : totalRate > 80
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {totalRate.toFixed(2)}%{isOver && " ⚠"}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAssignment(a);
                                  setActiveTab("edit");
                                }}
                                className="p-1.5 text-gray-400 hover:text-secondary transition-colors"
                                title="정보 수정"
                              >
                                <i className="fa-solid fa-pen text-[12px]"></i>
                              </button>
                              {confirmDeleteId === a.userId ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmRemove(a.userId)}
                                    disabled={isPending}
                                    className="text-[11px] font-bold text-tertiary hover:text-tertiary px-1.5 py-0.5 bg-tertiary/10 rounded"
                                  >
                                    확인
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[11px] text-gray-500 px-1.5 py-0.5"
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemove(a.userId)}
                                  className="p-1.5 text-gray-400 hover:text-tertiary transition-colors"
                                  title="인력 제거"
                                >
                                  <i className="fa-solid fa-user-minus text-[12px]"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 인력 추가 */}
      {activeTab === "add" && canEdit && (
        <div className="space-y-4">
          <div className="bg-surface-lowest border border-border p-5 rounded-xl">
            <h4 className="text-[14px] font-bold text-primary mb-1.5 flex items-center gap-2">
              <i className="fa-solid fa-user-plus text-secondary text-[13px]"></i>
              과제 참여 인력 추가
            </h4>
            <p className="text-[12px] text-gray-400 mb-5">
              시스템에 등록된 연구원을 이 과제에 배정합니다. 배정 후 &apos;월별 참여율&apos; 탭에서
              참여율과 현금/현물 구분을 설정하세요.
            </p>
            <form onSubmit={handleAddMember}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label>연구원 선택 (미배정 인력)</label>
                  {unassignedResearchers.length === 0 ? (
                    <div className="p-3 bg-surface-container/30 border border-border rounded-lg text-[13px] text-gray-400 text-center">
                      추가 가능한 미배정 연구원이 없습니다.
                    </div>
                  ) : (
                    <select name="userId" required>
                      {unassignedResearchers.map((r) => {
                        const isFreelance = r.affiliation === "프리랜서" || r.affiliation?.includes("프리랜서");
                        return (
                          <option key={r.id} value={r.id}>
                            [{isFreelance ? "프리랜서" : "당사 직원"}] {r.name} ({r.affiliation || "소속없음"} · {r.degree || "학위없음"})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
                <div>
                  <label>과제 내 역할 / 직위</label>
                  <input
                    type="text"
                    name="roleInProject"
                    defaultValue="참여연구원"
                    placeholder="역할/직위 직접 입력 (예: 연구책임자, 선임연구원 등)"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPending || unassignedResearchers.length === 0}
                  className="btn btn-primary text-[13px] px-8 font-bold"
                >
                  <i className="fa-solid fa-user-plus mr-2 text-[12px]"></i>
                  과제 인력으로 배정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: 정보 수정 */}
      {activeTab === "edit" && canEdit && (
        <div className="bg-surface-lowest border border-border p-5 rounded-xl">
          <h4 className="text-[14px] font-bold text-primary mb-1.5 flex items-center gap-2">
            <i className="fa-solid fa-pen-to-square text-secondary text-[13px]"></i>
            참여인력 상세 정보 수정
          </h4>
          <p className="text-[12px] text-gray-400 mb-5">
            연구원을 선택하면 해당 정보를 입력할 수 있습니다. 저장 후 인력 명부에 바로 반영됩니다.
          </p>
          <form onSubmit={handleUpdateAssignment}>
            <div className="mb-5">
              <label>수정할 연구원 선택</label>
              <select name="assignmentId" required defaultValue={editingAssignment?.id ?? ""}>
                <option value="">-- 연구원 선택 --</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.user.name} ({formatRole(a.roleInProject)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label>연구담당분야</label>
                <input
                  type="text"
                  name="researchRole"
                  defaultValue={editingAssignment?.researchRole ?? ""}
                  placeholder="예: 연구 총괄, AI 알고리즘 개발"
                />
              </div>
              <div>
                <label>과제참여기간</label>
                <input
                  type="text"
                  name="participationPeriod"
                  defaultValue={editingAssignment?.participationPeriod ?? ""}
                  placeholder="예: 2026.03 ~ 2029.02"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label>과제 내 역할 / 직위</label>
                <input
                  type="text"
                  name="roleInProject"
                  defaultValue={
                    editingAssignment?.roleInProject === "MEMBER"
                      ? "참여연구원"
                      : (editingAssignment?.roleInProject ?? "참여연구원")
                  }
                  placeholder="역할/직위 직접 입력 (예: 연구책임자, 선임연구원 등)"
                  required
                />
              </div>
              <div>
                <label>신규채용구분</label>
                <select name="newHireType" defaultValue={editingAssignment?.newHireType ?? ""}>
                  <option value="">선택...</option>
                  <option value="기존인력">기존인력</option>
                  <option value="신규채용">신규채용</option>
                  <option value="해당없음">해당없음</option>
                </select>
              </div>
              <div>
                <label>시간선택제 근무구분</label>
                <select name="flexibleWork" defaultValue={editingAssignment?.flexibleWork ?? ""}>
                  <option value="">선택...</option>
                  <option value="해당없음">해당없음</option>
                  <option value="시간선택제">시간선택제</option>
                </select>
              </div>
              <div>
                <label>기본 인건비 구분</label>
                <select name="fundingType" defaultValue={editingAssignment?.fundingType ?? "현금"}>
                  <option value="현금">현금 (Cash)</option>
                  <option value="현물">현물 (In-kind)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label>본 과제 참여율 [A] (%)</label>
                <input
                  type="number"
                  name="thisProjectRate"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={editingAssignment?.thisProjectRate ?? ""}
                  placeholder="예: 50.00"
                />
              </div>
              <div>
                <label>국가연구개발 참여율 [B] (%)</label>
                <input
                  type="number"
                  name="nationalRndRate"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={editingAssignment?.nationalRndRate ?? ""}
                  placeholder="예: 20.00"
                />
              </div>
              <div>
                <label>참여 과제 수 (건)</label>
                <input
                  type="number"
                  name="totalRndProjects"
                  min="0"
                  defaultValue={editingAssignment?.totalRndProjects ?? ""}
                  placeholder="예: 2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingAssignment(null);
                  setActiveTab("list");
                }}
                className="btn btn-secondary text-[13px] px-6"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary text-[13px] px-8 font-bold"
              >
                <i className="fa-solid fa-floppy-disk mr-2 text-[12px]"></i>
                정보 저장
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}