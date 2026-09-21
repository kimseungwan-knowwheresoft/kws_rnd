'use client';

import { useState, useMemo, useTransition } from 'react';
import { updateAnnualStandardBudgets } from '@/app/actions';

export interface BudgetEntry {
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

interface Props {
  projectId: string;
  canEdit: boolean;
  initialBudgets: BudgetEntry[];
  startYear?: number;
}

export default function AnnualStandardBudgetTable({
  projectId,
  canEdit,
  initialBudgets,
  startYear = 2026
}: Props) {
  // Unit toggle: 'THOUSAND' (천원 - default matching image) or 'WON' (원)
  const [unit, setUnit] = useState<'THOUSAND' | 'WON'>('THOUSAND');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Aggregate by Year
  const yearDataMap = useMemo(() => {
    const map = new Map<
      number,
      {
        govCash: number;
        instCash: number;
        instGoods: number;
        localCash: number;
        localGoods: number;
        otherCash: number;
        otherGoods: number;
      }
    >();

    initialBudgets.forEach((b) => {
      const existing = map.get(b.year) || {
        govCash: 0,
        instCash: 0,
        instGoods: 0,
        localCash: 0,
        localGoods: 0,
        otherCash: 0,
        otherGoods: 0
      };

      existing.govCash += b.govFunding || 0;
      existing.instCash += b.instCash || 0;
      existing.instGoods += b.instGoods || 0;
      existing.otherCash += b.otherFunding || 0; // standard other

      map.set(b.year, existing);
    });

    return map;
  }, [initialBudgets]);

  // Extract distinct years or guarantee at least 3 years (1년차, 2년차, 3년차)
  const sortedYears = useMemo(() => {
    const set = new Set<number>(Array.from(yearDataMap.keys()));
    if (set.size === 0) {
      set.add(startYear);
      set.add(startYear + 1);
      set.add(startYear + 2);
    } else if (set.size < 3) {
      const maxYear = Math.max(...Array.from(set));
      while (set.size < 3) {
        set.add(maxYear + (set.size === 1 ? 1 : 2));
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [yearDataMap, startYear]);

  // Format number according to current unit
  const formatVal = (wonAmount: number) => {
    if (unit === 'THOUSAND') {
      const val = Math.round(wonAmount / 1000);
      return val.toLocaleString();
    }
    return Math.round(wonAmount).toLocaleString();
  };

  // Compute calculated rows for each year
  const rows = useMemo(() => {
    return sortedYears.map((year, idx) => {
      const data = yearDataMap.get(year) || {
        govCash: 0,
        instCash: 0,
        instGoods: 0,
        localCash: 0,
        localGoods: 0,
        otherCash: 0,
        otherGoods: 0
      };

      const sumCash = data.govCash + data.instCash + data.localCash + data.otherCash;
      const sumGoods = data.instGoods + data.localGoods + data.otherGoods;
      const totalSum = sumCash + sumGoods;

      return {
        year,
        yearLabel: `${idx + 1}년차`,
        stage: '1단계',
        govCash: data.govCash,
        instCash: data.instCash,
        instGoods: data.instGoods,
        localCash: data.localCash,
        localGoods: data.localGoods,
        otherCash: data.otherCash,
        otherGoods: data.otherGoods,
        sumCash,
        sumGoods,
        totalSum
      };
    });
  }, [sortedYears, yearDataMap]);

  // Grand totals across all years
  const grandTotal = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.govCash += r.govCash;
        acc.instCash += r.instCash;
        acc.instGoods += r.instGoods;
        acc.localCash += r.localCash;
        acc.localGoods += r.localGoods;
        acc.otherCash += r.otherCash;
        acc.otherGoods += r.otherGoods;
        acc.sumCash += r.sumCash;
        acc.sumGoods += r.sumGoods;
        acc.totalSum += r.totalSum;
        return acc;
      },
      {
        govCash: 0,
        instCash: 0,
        instGoods: 0,
        localCash: 0,
        localGoods: 0,
        otherCash: 0,
        otherGoods: 0,
        sumCash: 0,
        sumGoods: 0,
        totalSum: 0
      }
    );
  }, [rows]);

  // Form State for editing
  const [formData, setFormData] = useState(
    rows.map((r) => ({
      year: r.year,
      govCash: r.govCash,
      instCash: r.instCash,
      instGoods: r.instGoods,
      localCash: r.localCash,
      localGoods: r.localGoods,
      otherCash: r.otherCash,
      otherGoods: r.otherGoods
    }))
  );

  // Synchronize modal form data when opening
  const openEditModal = () => {
    setFormData(
      rows.map((r) => ({
        year: r.year,
        govCash: r.govCash,
        instCash: r.instCash,
        instGoods: r.instGoods,
        localCash: r.localCash,
        localGoods: r.localGoods,
        otherCash: r.otherCash,
        otherGoods: r.otherGoods
      }))
    );
    setIsEditModalOpen(true);
  };

  // Fill sample template from user's image (총 5,833,067천원)
  const applyImageSampleValues = () => {
    const sampleYears = [startYear, startYear + 1, startYear + 2];
    const template = [
      {
        year: sampleYears[0],
        govCash: 1300000000,
        instCash: 27707000,
        instGoods: 249360000,
        localCash: 0,
        localGoods: 0,
        otherCash: 0,
        otherGoods: 0
      },
      {
        year: sampleYears[1],
        govCash: 1733000000,
        instCash: 39500000,
        instGoods: 355500000,
        localCash: 0,
        localGoods: 0,
        otherCash: 0,
        otherGoods: 0
      },
      {
        year: sampleYears[2],
        govCash: 1733000000,
        instCash: 39500000,
        instGoods: 355500000,
        localCash: 0,
        localGoods: 0,
        otherCash: 0,
        otherGoods: 0
      }
    ];
    setFormData(template);
  };

  // Quick direct apply from toolbar
  const handleQuickApplyImageSample = () => {
    if (!canEdit) return;
    if (confirm('첨부 이미지 예시 데이터(1단계 1~3년차 총 5,833,067천원)를 연차별 예산에 즉시 적용하시겠습니까?')) {
      startTransition(async () => {
        const sampleYears = [startYear, startYear + 1, startYear + 2];
        const template = [
          {
            year: sampleYears[0],
            govFunding: 1300000000,
            instCash: 27707000,
            instGoods: 249360000,
            localCash: 0,
            localGoods: 0,
            otherCash: 0,
            otherGoods: 0
          },
          {
            year: sampleYears[1],
            govFunding: 1733000000,
            instCash: 39500000,
            instGoods: 355500000,
            localCash: 0,
            localGoods: 0,
            otherCash: 0,
            otherGoods: 0
          },
          {
            year: sampleYears[2],
            govFunding: 1733000000,
            instCash: 39500000,
            instGoods: 355500000,
            localCash: 0,
            localGoods: 0,
            otherCash: 0,
            otherGoods: 0
          }
        ];
        await updateAnnualStandardBudgets(projectId, template);
      });
    }
  };

  const handleSaveBudgets = () => {
    startTransition(async () => {
      const payload = formData.map((item) => ({
        year: item.year,
        govFunding: item.govCash,
        instCash: item.instCash,
        instGoods: item.instGoods,
        localCash: item.localCash,
        localGoods: item.localGoods,
        otherCash: item.otherCash,
        otherGoods: item.otherGoods
      }));
      await updateAnnualStandardBudgets(projectId, payload);
      setIsEditModalOpen(false);
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Control Toolbar (통일된 위치 및 규격 정렬) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container/30 p-4 rounded-lg border border-border">
        {/* Left Side Info Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5 bg-surface-lowest px-3 py-1.5 rounded-md border border-border shadow-2xs">
            <i className="fa-regular fa-calendar-check text-secondary"></i>
            연차별 총괄 협약표
          </span>
        </div>

        {/* Right Tools: Unit Toggle & Actions (통일된 컴포넌트 규격 및 정렬) */}
        <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
          {/* Unit Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500 font-semibold">단위:</span>
            <div className="inline-flex rounded-md shadow-2xs bg-surface-lowest border border-border p-0.5">
              <button
                type="button"
                onClick={() => setUnit('THOUSAND')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
                  unit === 'THOUSAND'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                천원 (표준)
              </button>
              <button
                type="button"
                onClick={() => setUnit('WON')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
                  unit === 'WON'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                원
              </button>
            </div>
          </div>

          {/* Quick Apply Image Sample */}
          {canEdit && (
            <button
              type="button"
              onClick={handleQuickApplyImageSample}
              disabled={isPending}
              className="btn btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5 text-secondary border-secondary/40 hover:bg-secondary/10"
              title="첨부 이미지 예시 데이터(총 5,833,067천원)를 연차별 예산에 즉시 적용합니다."
            >
              <i className="fa-solid fa-wand-magic-sparkles text-[11px]"></i>
              <span className="hidden sm:inline">예시 데이터 적용</span>
            </button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <button
              type="button"
              onClick={openEditModal}
              className="btn btn-primary text-[12px] px-3.5 py-1.5 flex items-center gap-1.5 font-bold"
            >
              <i className="fa-solid fa-pen-to-square text-[11px]"></i>
              <span>연차별 예산 편집</span>
            </button>
          )}

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5"
            title="인쇄"
          >
            <i className="fa-solid fa-print text-gray-500 text-[12px]"></i>
            <span className="hidden sm:inline">인쇄</span>
          </button>
        </div>
      </div>

      {/* Official Standard Format Table (첨부 이미지 서식 100% 일치) */}
      <div className="overflow-x-auto bg-white rounded-md border-2 border-black shadow-xs">
        <table className="w-full text-center border-collapse text-[13px] font-sans border-spacing-0 border border-black">
          <thead>
            {/* Header Row 1 */}
            <tr className="bg-[#d9d9d9] text-black font-bold">
              <th
                rowSpan={2}
                className="border border-black p-2.5 w-28 bg-[#d9d9d9] text-center font-bold"
              >
                <div className="text-[14px] font-bold">연구개발비</div>
                <div className="text-[11px] font-normal text-gray-700 mt-0.5">
                  (단위: {unit === 'THOUSAND' ? '천원' : '원'})
                </div>
              </th>
              <th className="border border-black p-2 w-32 bg-[#d9d9d9] text-center font-bold">
                정부지원<br />연구개발비
              </th>
              <th colSpan={2} className="border border-black p-2 w-48 bg-[#d9d9d9] text-center font-bold">
                기관부담<br />연구개발비
              </th>
              <th colSpan={2} className="border border-black p-2 w-48 bg-[#d9d9d9] text-center font-bold">
                그 외 기관 등의 지원금
              </th>
              <th colSpan={3} className="border border-black p-2 w-64 bg-[#d9d9d9] text-center font-bold">
                합계
              </th>
            </tr>

            {/* Header Row 2 (지방자치단체, 기타() raw 삭제 후 2단 복합 헤더로 구성) */}
            <tr
              className="bg-[#d9d9d9] text-black font-bold text-[12px]"
              style={{ borderBottom: '3px double #000' }}
            >
              <th className="border border-black p-1.5 w-32 text-center font-bold">현금</th>
              <th className="border border-black p-1.5 w-24 text-center font-bold">현금</th>
              <th className="border border-black p-1.5 w-24 text-center font-bold">현물</th>
              <th className="border border-black p-1.5 w-24 text-center font-bold">현금</th>
              <th className="border border-black p-1.5 w-24 text-center font-bold">현물</th>
              <th className="border border-black p-1.5 w-28 text-center font-bold">현금</th>
              <th className="border border-black p-1.5 w-28 text-center font-bold">현물</th>
              <th className="border border-black p-1.5 w-32 text-black font-black text-center">합계</th>
            </tr>
          </thead>

          <tbody>
            {/* 1. 총계 Row (Top Summary Row with Gray Tint) */}
            <tr className="bg-[#e9edf3] font-bold text-black border-t-2 border-black">
              <td className="p-2.5 border border-black text-center text-[14px] font-black">
                총계
              </td>
              {/* 정부지원 현금 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] text-black">
                {formatVal(grandTotal.govCash)}
              </td>
              {/* 기관부담 현금 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] text-black">
                {formatVal(grandTotal.instCash)}
              </td>
              {/* 기관부담 현물 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] text-black">
                {formatVal(grandTotal.instGoods)}
              </td>
              {/* 그 외 기관 현금 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] text-gray-700">
                {formatVal(grandTotal.localCash + grandTotal.otherCash)}
              </td>
              {/* 그 외 기관 현물 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] text-gray-700">
                {formatVal(grandTotal.localGoods + grandTotal.otherGoods)}
              </td>
              {/* 합계 현금 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] bg-[#dfe5ee] text-black font-semibold">
                {formatVal(grandTotal.sumCash)}
              </td>
              {/* 합계 현물 */}
              <td className="p-2 border border-black text-right font-mono text-[13px] bg-[#dfe5ee] text-black font-semibold">
                {formatVal(grandTotal.sumGoods)}
              </td>
              {/* 합계 전체 */}
              <td className="p-2 border border-black text-right font-mono text-[14px] font-black bg-[#d5dfea] text-secondary">
                {formatVal(grandTotal.totalSum)}
              </td>
            </tr>

            {/* 2. Annual Rows (1년차, 2년차, 3년차 ...) - 1단계 구분 열 삭제 */}
            {rows.map((row) => (
              <tr key={row.year} className="hover:bg-gray-50/70 transition-colors">
                {/* 년차 Cell (1단계 열 삭제 후 년차 단일 열) */}
                <td className="p-2.5 border border-black text-center font-semibold text-black text-[13px]">
                  {row.yearLabel}
                </td>

                {/* 정부지원 현금 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] text-black">
                  {formatVal(row.govCash)}
                </td>

                {/* 기관부담 현금 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] text-black">
                  {formatVal(row.instCash)}
                </td>

                {/* 기관부담 현물 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] text-black">
                  {formatVal(row.instGoods)}
                </td>

                {/* 그 외 기관 현금 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] text-gray-700">
                  {formatVal(row.localCash + row.otherCash)}
                </td>

                {/* 그 외 기관 현물 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] text-gray-700">
                  {formatVal(row.localGoods + row.otherGoods)}
                </td>

                {/* 합계 현금 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] font-semibold bg-[#f4f7fa] text-black">
                  {formatVal(row.sumCash)}
                </td>

                {/* 합계 현물 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] font-semibold bg-[#f4f7fa] text-black">
                  {formatVal(row.sumGoods)}
                </td>

                {/* 합계 전체 */}
                <td className="p-2 border border-black text-right font-mono text-[13px] font-bold text-black bg-[#eef3f8]">
                  {formatVal(row.totalSum)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-[18px] font-bold text-primary flex items-center gap-2">
                  <i className="fa-solid fa-calculator text-secondary"></i>
                  연차별 예산 기본정보 편집
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  각 연차별 정부지원금 및 기관부담금(현금/현물), 지원금을 입력합니다. (단위: 원)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyImageSampleValues}
                  className="btn btn-secondary text-[12px] px-3 py-1.5 text-secondary border-secondary/30 hover:bg-secondary/10"
                >
                  <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i>
                  첨부 이미지 예시값(58.3억) 채우기
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-primary p-1.5"
                >
                  <i className="fa-solid fa-xmark text-[16px]"></i>
                </button>
              </div>
            </div>

            {/* Years Edit Fields */}
            <div className="space-y-6">
              {formData.map((item, idx) => (
                <div key={item.year} className="bg-surface-container/20 p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[15px] text-primary">
                      1단계 {idx + 1}년차 ({item.year}년)
                    </span>
                    <span className="text-[12px] text-gray-500 font-mono">
                      연차 소계: {(item.govCash + item.instCash + item.instGoods + item.localCash + item.localGoods + item.otherCash + item.otherGoods).toLocaleString()} 원
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        정부지원금 (현금, 원)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={item.govCash}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setFormData((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, govCash: val } : p))
                          );
                        }}
                        className="w-full px-2.5 py-1.5 bg-surface-lowest border border-border rounded text-[13px] font-mono text-right"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        기관부담금 (현금, 원)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={item.instCash}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setFormData((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, instCash: val } : p))
                          );
                        }}
                        className="w-full px-2.5 py-1.5 bg-surface-lowest border border-border rounded text-[13px] font-mono text-right"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        기관부담금 (현물, 원)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={item.instGoods}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setFormData((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, instGoods: val } : p))
                          );
                        }}
                        className="w-full px-2.5 py-1.5 bg-surface-lowest border border-border rounded text-[13px] font-mono text-right"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-secondary text-[13px] px-5"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveBudgets}
                disabled={isPending}
                className="btn btn-primary text-[13px] px-6 font-bold"
              >
                {isPending ? '저장 중...' : '예산 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
