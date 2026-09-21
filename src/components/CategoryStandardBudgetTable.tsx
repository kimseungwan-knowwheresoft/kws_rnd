'use client';

import { useState, useMemo, useTransition } from 'react';
import { saveCategoryBudgets } from '@/app/actions';

export interface SubItem {
  id: string;
  date: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  fundingType: 'GOV' | 'CASH' | 'GOODS'; // 정부지원금 / 민간부담(현금) / 민간부담(현물)
  note: string;
}

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
  itemsDetail?: string | null;
}

interface CategoryEditRow {
  category: string;
  govFunding: number;
  instCash: number;
  instGoods: number;
  otherFunding: number;
  subItems: SubItem[];
  isExpanded: boolean;
}

interface Props {
  projectId: string;
  canEdit: boolean;
  initialBudgets: BudgetEntry[];
  startYear?: number;
}

// 6 standard categories from the user's reference image
const STANDARD_CATEGORIES = [
  '1. 인건비',
  '2. 운영비',
  '3. 여비',
  '4. 업무추진비',
  '5. 연구용역비',
  '6. 유형자산'
];

// Rich sample sub-items matching the 556,985천원 template from the user's reference image
const SAMPLE_SUB_ITEMS: Record<string, SubItem[]> = {
  '1. 인건비': [
    {
      id: 'sub-labor-1',
      date: '2026-03-01',
      itemName: '선임급 참여연구원 3인 인건비',
      unitPrice: 3500000,
      quantity: 36,
      amount: 126000000,
      fundingType: 'GOV',
      note: '3인 x 12개월 (월 350만원)'
    },
    {
      id: 'sub-labor-2',
      date: '2026-03-01',
      itemName: '연구책임자(PM) 인건비',
      unitPrice: 5500000,
      quantity: 12,
      amount: 66000000,
      fundingType: 'GOV',
      note: '1인 x 12개월 (책임연구원 급여)'
    },
    {
      id: 'sub-labor-3',
      date: '2026-03-01',
      itemName: '전임/초빙 연구원 4인 인건비',
      unitPrice: 3202083,
      quantity: 48,
      amount: 153700000,
      fundingType: 'GOV',
      note: '핵심 알고리즘 및 시스템 구축'
    },
    {
      id: 'sub-labor-4',
      date: '2026-03-01',
      itemName: '참여인력 4대보험 및 법정부담금',
      unitPrice: 16748000,
      quantity: 1,
      amount: 16748000,
      fundingType: 'CASH',
      note: '기관부담 현금 납입분'
    },
    {
      id: 'sub-labor-5',
      date: '2026-03-01',
      itemName: '기업보유 핵심연구인력 현물참여',
      unitPrice: 150737000,
      quantity: 1,
      amount: 150737000,
      fundingType: 'GOODS',
      note: '기업보유 전문연구인력 현물매칭'
    }
  ],
  '2. 운영비': [
    {
      id: 'sub-op-1',
      date: '2026-04-10',
      itemName: '클라우드 AI GPU 연산인프라 사용료',
      unitPrice: 1200000,
      quantity: 12,
      amount: 14400000,
      fundingType: 'GOV',
      note: '월 120만원 x 12개월 (클라우드 인스턴스)'
    },
    {
      id: 'sub-op-2',
      date: '2026-05-20',
      itemName: '연구개발용 전산소모품 및 시약재료비',
      unitPrice: 3100000,
      quantity: 1,
      amount: 3100000,
      fundingType: 'GOV',
      note: '시험검증용 전산소모품 일체'
    }
  ],
  '3. 여비': [],
  '4. 업무추진비': [
    {
      id: 'sub-work-1',
      date: '2026-06-15',
      itemName: '산학연 전문가 정기 기술자문회의비',
      unitPrice: 1250000,
      quantity: 12,
      amount: 15000000,
      fundingType: 'GOV',
      note: '월 1회 정기 기술자문위원회'
    }
  ],
  '5. 연구용역비': [],
  '6. 유형자산': [
    {
      id: 'sub-asset-1',
      date: '2026-03-25',
      itemName: 'AI 딥러닝 워크스테이션 시험장비 도입',
      unitPrice: 11300000,
      quantity: 1,
      amount: 11300000,
      fundingType: 'GOV',
      note: '성능검증용 고성능 GPU 서버 1대'
    }
  ]
};

// Compute category sums from sub-items
function recalculateCategoryFromSubItems(
  catName: string,
  items: SubItem[],
  existingGov = 0,
  existingCash = 0,
  existingGoods = 0
) {
  if (!items || items.length === 0) {
    return {
      govFunding: existingGov,
      instCash: existingCash,
      instGoods: existingGoods
    };
  }

  let govFunding = 0;
  let instCash = 0;
  let instGoods = 0;

  items.forEach((it) => {
    const amt = it.amount || 0;
    if (it.fundingType === 'GOV') govFunding += amt;
    else if (it.fundingType === 'CASH') instCash += amt;
    else if (it.fundingType === 'GOODS') instGoods += amt;
  });

  return { govFunding, instCash, instGoods };
}

export default function CategoryStandardBudgetTable({
  projectId,
  canEdit,
  initialBudgets,
  startYear = 2026
}: Props) {
  // Unit toggle: 'THOUSAND' (천원 - default matching attached image) or 'WON' (원)
  const [unit, setUnit] = useState<'THOUSAND' | 'WON'>('THOUSAND');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Accordion state for main view table (to expand/view sub-items)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Extract distinct years or guarantee at least 3 years (1년차, 2년차, 3년차)
  const distinctYears = useMemo(() => {
    const set = new Set<number>(initialBudgets.map((b) => b.year));
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
  }, [initialBudgets, startYear]);

  // Selected year tab: can be a specific year (e.g. 2026) or 'ALL'
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(distinctYears[0] || startYear);

  // Filter budgets for the selected view
  const currentYearBudgets = useMemo(() => {
    if (selectedYear === 'ALL') {
      return initialBudgets;
    }
    return initialBudgets.filter((b) => b.year === selectedYear);
  }, [initialBudgets, selectedYear]);

  // Normalize and build category rows for the main table
  const categoryRows = useMemo(() => {
    const catMap = new Map<
      string,
      {
        govFunding: number;
        instCash: number;
        instGoods: number;
        otherFunding: number;
        subItems: SubItem[];
      }
    >();

    currentYearBudgets.forEach((b) => {
      let matchedKey = b.category;
      for (const std of STANDARD_CATEGORIES) {
        const stdClean = std.replace(/^\d+\.\s*/, '').trim();
        if (b.category.trim() === std || b.category.trim() === stdClean) {
          matchedKey = std;
          break;
        }
      }

      const existing = catMap.get(matchedKey) || {
        govFunding: 0,
        instCash: 0,
        instGoods: 0,
        otherFunding: 0,
        subItems: []
      };

      existing.govFunding += b.govFunding || 0;
      existing.instCash += b.instCash || 0;
      existing.instGoods += b.instGoods || 0;
      existing.otherFunding += b.otherFunding || 0;

      if (b.itemsDetail) {
        try {
          const parsed = JSON.parse(b.itemsDetail);
          if (Array.isArray(parsed)) {
            existing.subItems.push(...parsed);
          }
        } catch {
          // ignore
        }
      }

      catMap.set(matchedKey, existing);
    });

    // Ensure all 6 standard categories exist in order
    const rows = STANDARD_CATEGORIES.map((catName) => {
      const data = catMap.get(catName) || {
        govFunding: 0,
        instCash: 0,
        instGoods: 0,
        otherFunding: 0,
        subItems: []
      };

      const instSubtotal = data.instCash + data.instGoods;
      const total = data.govFunding + instSubtotal + data.otherFunding;

      return {
        category: catName,
        govFunding: data.govFunding,
        instCash: data.instCash,
        instGoods: data.instGoods,
        instSubtotal,
        total,
        subItems: data.subItems,
        isStandard: true
      };
    });

    // Append any custom categories that were entered but aren't in STANDARD_CATEGORIES
    catMap.forEach((data, catName) => {
      if (!STANDARD_CATEGORIES.includes(catName) && catName !== '연구개발비 총괄') {
        const instSubtotal = data.instCash + data.instGoods;
        const total = data.govFunding + instSubtotal + data.otherFunding;
        rows.push({
          category: catName,
          govFunding: data.govFunding,
          instCash: data.instCash,
          instGoods: data.instGoods,
          instSubtotal,
          total,
          subItems: data.subItems,
          isStandard: false
        });
      }
    });

    return rows;
  }, [currentYearBudgets]);

  // Grand totals across all categories
  const grandTotal = useMemo(() => {
    return categoryRows.reduce(
      (acc, r) => {
        acc.govFunding += r.govFunding;
        acc.instCash += r.instCash;
        acc.instGoods += r.instGoods;
        acc.instSubtotal += r.instSubtotal;
        acc.total += r.total;
        return acc;
      },
      {
        govFunding: 0,
        instCash: 0,
        instGoods: 0,
        instSubtotal: 0,
        total: 0
      }
    );
  }, [categoryRows]);

  // Format number according to unit (0 is formatted as '-' matching reference image)
  const formatVal = (wonAmount: number) => {
    if (!wonAmount || wonAmount === 0) return '-';
    if (unit === 'THOUSAND') {
      const val = Math.round(wonAmount / 1000);
      return val.toLocaleString();
    }
    return Math.round(wonAmount).toLocaleString();
  };

  // Format percentage with 1 decimal place
  const formatPercent = (numerator: number, denominator: number) => {
    if (!denominator || denominator === 0 || !numerator || numerator === 0) {
      return '0.0%';
    }
    const ratio = (numerator / denominator) * 100;
    return `${ratio.toFixed(1)}%`;
  };

  // Modal Editing State
  const [editYear, setEditYear] = useState<number>(
    selectedYear === 'ALL' ? distinctYears[0] : selectedYear
  );

  const [editRows, setEditRows] = useState<CategoryEditRow[]>([]);

  // Load rows for a specific year into the modal
  const loadYearDataIntoModal = (targetYear: number) => {
    const yearEntries = initialBudgets.filter((b) => b.year === targetYear);
    const catMap = new Map<
      string,
      {
        govFunding: number;
        instCash: number;
        instGoods: number;
        otherFunding: number;
        subItems: SubItem[];
      }
    >();

    yearEntries.forEach((b) => {
      let matched = b.category;
      for (const std of STANDARD_CATEGORIES) {
        const stdClean = std.replace(/^\d+\.\s*/, '').trim();
        if (b.category.trim() === std || b.category.trim() === stdClean) {
          matched = std;
          break;
        }
      }

      let subItems: SubItem[] = [];
      if (b.itemsDetail) {
        try {
          const parsed = JSON.parse(b.itemsDetail);
          if (Array.isArray(parsed)) {
            subItems = parsed;
          }
        } catch {
          subItems = [];
        }
      }

      catMap.set(matched, {
        govFunding: b.govFunding || 0,
        instCash: b.instCash || 0,
        instGoods: b.instGoods || 0,
        otherFunding: b.otherFunding || 0,
        subItems
      });
    });

    const rows: CategoryEditRow[] = STANDARD_CATEGORIES.map((stdCat) => {
      const data = catMap.get(stdCat) || {
        govFunding: 0,
        instCash: 0,
        instGoods: 0,
        otherFunding: 0,
        subItems: []
      };

      // If sub-items exist, calculate amounts from them
      const sums = recalculateCategoryFromSubItems(
        stdCat,
        data.subItems,
        data.govFunding,
        data.instCash,
        data.instGoods
      );

      return {
        category: stdCat,
        govFunding: sums.govFunding,
        instCash: sums.instCash,
        instGoods: sums.instGoods,
        otherFunding: data.otherFunding,
        subItems: data.subItems,
        isExpanded: data.subItems.length > 0
      };
    });

    setEditRows(rows);
  };

  const openModal = () => {
    const targetYear = selectedYear === 'ALL' ? distinctYears[0] : selectedYear;
    setEditYear(targetYear);
    loadYearDataIntoModal(targetYear);
    setIsEditModalOpen(true);
  };

  // Switch year inside modal
  const handleModalYearChange = (year: number) => {
    setEditYear(year);
    loadYearDataIntoModal(year);
  };

  // Toggle category card expand in modal
  const handleToggleCategoryCard = (idx: number) => {
    setEditRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, isExpanded: !r.isExpanded } : r))
    );
  };

  // Add a sub-item (세목) to a category
  const handleAddSubItem = (catIdx: number) => {
    const newSubItem: SubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString().slice(0, 10),
      itemName: '',
      unitPrice: 0,
      quantity: 1,
      amount: 0,
      fundingType: 'GOV',
      note: ''
    };

    setEditRows((prev) => {
      const next = [...prev];
      const row = { ...next[catIdx] };
      const nextSubItems = [...row.subItems, newSubItem];
      const sums = recalculateCategoryFromSubItems(
        row.category,
        nextSubItems,
        row.govFunding,
        row.instCash,
        row.instGoods
      );

      next[catIdx] = {
        ...row,
        subItems: nextSubItems,
        govFunding: sums.govFunding,
        instCash: sums.instCash,
        instGoods: sums.instGoods,
        isExpanded: true
      };
      return next;
    });
  };

  // Delete a sub-item
  const handleDeleteSubItem = (catIdx: number, itemIdx: number) => {
    setEditRows((prev) => {
      const next = [...prev];
      const row = { ...next[catIdx] };
      const nextSubItems = row.subItems.filter((_, i) => i !== itemIdx);
      const sums = recalculateCategoryFromSubItems(row.category, nextSubItems, 0, 0, 0);

      next[catIdx] = {
        ...row,
        subItems: nextSubItems,
        govFunding: sums.govFunding,
        instCash: sums.instCash,
        instGoods: sums.instGoods
      };
      return next;
    });
  };

  // Update text / select fields of a sub-item
  const handleSubItemFieldChange = (
    catIdx: number,
    itemIdx: number,
    field: 'date' | 'itemName' | 'fundingType' | 'note',
    value: string
  ) => {
    setEditRows((prev) => {
      const next = [...prev];
      const row = { ...next[catIdx] };
      const nextSubItems = [...row.subItems];
      nextSubItems[itemIdx] = {
        ...nextSubItems[itemIdx],
        [field]: value
      };

      // If funding type changed, recalculate sums
      const sums = recalculateCategoryFromSubItems(
        row.category,
        nextSubItems,
        row.govFunding,
        row.instCash,
        row.instGoods
      );

      next[catIdx] = {
        ...row,
        subItems: nextSubItems,
        govFunding: sums.govFunding,
        instCash: sums.instCash,
        instGoods: sums.instGoods
      };
      return next;
    });
  };

  // Update numeric fields (단가, 수량, 금액) with comma support
  const handleSubItemNumberChange = (
    catIdx: number,
    itemIdx: number,
    field: 'unitPrice' | 'quantity' | 'amount',
    rawStr: string
  ) => {
    const cleanDigits = rawStr.replace(/[^0-9]/g, '');
    const numVal = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);

    setEditRows((prev) => {
      const next = [...prev];
      const row = { ...next[catIdx] };
      const nextSubItems = [...row.subItems];
      const currentItem = { ...nextSubItems[itemIdx] };

      if (field === 'unitPrice') {
        currentItem.unitPrice = numVal;
        currentItem.amount = numVal * (currentItem.quantity || 1);
      } else if (field === 'quantity') {
        currentItem.quantity = numVal;
        currentItem.amount = (currentItem.unitPrice || 0) * numVal;
      } else if (field === 'amount') {
        currentItem.amount = numVal;
      }

      nextSubItems[itemIdx] = currentItem;
      const sums = recalculateCategoryFromSubItems(
        row.category,
        nextSubItems,
        row.govFunding,
        row.instCash,
        row.instGoods
      );

      next[catIdx] = {
        ...row,
        subItems: nextSubItems,
        govFunding: sums.govFunding,
        instCash: sums.instCash,
        instGoods: sums.instGoods
      };
      return next;
    });
  };

  // Direct edit for category amounts when no sub-items are added
  const handleDirectCategoryAmountChange = (
    catIdx: number,
    field: 'govFunding' | 'instCash' | 'instGoods',
    rawStr: string
  ) => {
    const cleanDigits = rawStr.replace(/[^0-9]/g, '');
    const numVal = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);

    setEditRows((prev) =>
      prev.map((r, i) => (i === catIdx ? { ...r, [field]: numVal } : r))
    );
  };

  // Fill sample data matching user's image (총 556,985천원) with detailed sub-items
  const applyImageSampleValues = () => {
    const rows: CategoryEditRow[] = STANDARD_CATEGORIES.map((stdCat) => {
      const items = SAMPLE_SUB_ITEMS[stdCat] ? [...SAMPLE_SUB_ITEMS[stdCat]] : [];
      const sums = recalculateCategoryFromSubItems(stdCat, items, 0, 0, 0);

      return {
        category: stdCat,
        govFunding: sums.govFunding,
        instCash: sums.instCash,
        instGoods: sums.instGoods,
        otherFunding: 0,
        subItems: items,
        isExpanded: items.length > 0
      };
    });

    setEditRows(rows);
  };

  // Quick direct apply from toolbar
  const handleQuickApplyImageSample = () => {
    if (!canEdit) return;
    const targetYear = selectedYear === 'ALL' ? distinctYears[0] : selectedYear;
    if (
      confirm(
        `'${targetYear}년차'에 첨부 이미지의 예시 데이터(총 556,985천원 및 세목 내역)를 즉시 적용하시겠습니까?`
      )
    ) {
      startTransition(async () => {
        const payload = STANDARD_CATEGORIES.map((stdCat) => {
          const items = SAMPLE_SUB_ITEMS[stdCat] ? [...SAMPLE_SUB_ITEMS[stdCat]] : [];
          const sums = recalculateCategoryFromSubItems(stdCat, items, 0, 0, 0);
          return {
            category: stdCat,
            govFunding: sums.govFunding,
            instCash: sums.instCash,
            instGoods: sums.instGoods,
            otherFunding: 0,
            itemsDetail: items.length > 0 ? JSON.stringify(items) : null
          };
        });
        await saveCategoryBudgets(projectId, targetYear, payload);
      });
    }
  };

  // Save changes from modal
  const handleSaveCategoryBudgets = () => {
    startTransition(async () => {
      const payload = editRows.map((r) => ({
        category: r.category,
        govFunding: r.govFunding,
        instCash: r.instCash,
        instGoods: r.instGoods,
        otherFunding: r.otherFunding || 0,
        itemsDetail: r.subItems && r.subItems.length > 0 ? JSON.stringify(r.subItems) : null
      }));
      await saveCategoryBudgets(projectId, editYear, payload);
      setIsEditModalOpen(false);
    });
  };

  // Check if a row should have the reference green highlight (#a9d18e)
  const isGreenHighlightedCategory = (cat: string) => {
    return cat.includes('인건비') || cat.includes('운영비');
  };

  // Modal totals
  const modalGrandTotals = useMemo(() => {
    return editRows.reduce(
      (acc, r) => {
        acc.gov += r.govFunding || 0;
        acc.cash += r.instCash || 0;
        acc.goods += r.instGoods || 0;
        acc.total += (r.govFunding || 0) + (r.instCash || 0) + (r.instGoods || 0);
        return acc;
      },
      { gov: 0, cash: 0, goods: 0, total: 0 }
    );
  }, [editRows]);

  return (
    <div className="space-y-4">
      {/* 1. Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container/30 p-4 rounded-lg border border-border">
        {/* Left: Year Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mr-1 shrink-0">
            조회 연차:
          </span>
          {distinctYears.map((yr, idx) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all shrink-0 ${
                selectedYear === yr
                  ? 'bg-secondary text-white shadow-xs'
                  : 'bg-surface-lowest text-gray-600 hover:text-primary border border-border hover:bg-surface-hover'
              }`}
            >
              {idx + 1}차년도 ({yr}년)
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedYear('ALL')}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all shrink-0 ${
              selectedYear === 'ALL'
                ? 'bg-secondary text-white shadow-xs'
                : 'bg-surface-lowest text-gray-600 hover:text-primary border border-border hover:bg-surface-hover'
            }`}
          >
            전체 연차 합산
          </button>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          {/* Unit Toggle */}
          <div className="flex items-center gap-1.5 bg-surface-lowest px-2 py-1 rounded-md border border-border">
            <span className="text-[11px] text-gray-500 font-medium">단위:</span>
            <div className="flex rounded overflow-hidden text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setUnit('THOUSAND')}
                className={`px-2 py-0.5 transition-colors ${
                  unit === 'THOUSAND'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                천원
              </button>
              <button
                type="button"
                onClick={() => setUnit('WON')}
                className={`px-2 py-0.5 transition-colors ${
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
              title="첨부 이미지 예시 데이터(총 556,985천원 및 세목 내역)를 현재 선택된 연차에 적용합니다."
            >
              <i className="fa-solid fa-wand-magic-sparkles text-[11px]"></i>
              <span className="hidden sm:inline">예시 데이터 적용</span>
            </button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <button
              type="button"
              onClick={openModal}
              className="btn btn-primary text-[12px] px-3.5 py-1.5 flex items-center gap-1.5 font-bold"
            >
              <i className="fa-solid fa-pen-to-square text-[11px]"></i>
              <span>비목 예산 편집</span>
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

      {/* 2. Official Reference Image Table Format (첨부 이미지 100% 일치) */}
      <div className="overflow-x-auto bg-white rounded-md border-2 border-black shadow-xs">
        <table className="w-full text-center border-collapse text-[13px] font-sans border-spacing-0 border border-black">
          <thead>
            {/* Header Row 1 */}
            <tr className="bg-[#e2e4e8] text-black font-bold">
              <th
                rowSpan={2}
                className="border border-black p-2.5 w-44 text-center font-bold text-[14px] bg-[#d9d9d9]"
              >
                비 목
              </th>
              <th className="border border-black p-2 w-32 text-center font-bold text-[13px] bg-[#d9d9d9]">
                정부지원금
              </th>
              <th
                colSpan={3}
                className="border border-black p-2 text-center font-bold text-[13px] bg-[#d9d9d9]"
              >
                민간부담금
              </th>
              <th className="border border-black p-2 w-32 text-center font-bold text-[13px] bg-[#d9d9d9]">
                합계
              </th>
              <th
                rowSpan={2}
                className="border border-black p-2 w-28 text-center font-bold text-[12px] bg-[#d9d9d9] leading-snug"
              >
                연구개발비<br />대비 구성비
              </th>
              <th
                rowSpan={2}
                className="border border-black p-2 w-28 text-center font-bold text-[12px] bg-[#d9d9d9] leading-snug"
              >
                정부지원<br />연구개발비 대비<br />구성비
              </th>
            </tr>

            {/* Header Row 2 */}
            <tr className="bg-[#e2e4e8] text-black font-bold text-[13px]">
              <th className="border border-black p-2 text-center font-bold bg-[#d9d9d9]">
                (A)
              </th>
              <th className="border border-black p-2 w-28 text-center font-bold bg-[#d9d9d9]">
                현금
              </th>
              <th className="border border-black p-2 w-28 text-center font-bold bg-[#d9d9d9]">
                현물
              </th>
              <th className="border border-black p-2 w-28 text-center font-bold bg-[#d9d9d9]">
                소계(B)
              </th>
              <th className="border border-black p-2 text-center font-bold bg-[#d9d9d9]">
                (A+B)
              </th>
            </tr>
          </thead>

          <tbody>
            {categoryRows.map((row) => {
              const hasGreenShading = isGreenHighlightedCategory(row.category);
              const ratioTotal = formatPercent(row.total, grandTotal.total);
              const ratioGov = formatPercent(row.govFunding, grandTotal.govFunding);
              const isExpanded = !!expandedCategories[row.category];

              return (
                <tr key={row.category} className="hover:bg-gray-50/50">
                  {/* 비목 명 */}
                  <td className="border border-black p-2.5 text-center font-bold text-[14px] text-black">
                    <div className="flex items-center justify-between px-1">
                      <span>{row.category}</span>
                      {row.subItems && row.subItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleCategoryExpand(row.category)}
                          className="text-[11px] font-sans text-secondary hover:underline flex items-center gap-1 font-normal ml-2"
                          title="세목 상세 보기"
                        >
                          <span>세목 {row.subItems.length}건</span>
                          <i
                            className={`fa-solid fa-chevron-${
                              isExpanded ? 'up' : 'down'
                            } text-[9px]`}
                          ></i>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 정부지원금 (A) - Light Green highlight if 인건비 or 운영비 */}
                  <td
                    className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black"
                    style={{
                      backgroundColor: hasGreenShading ? '#a9d18e' : undefined
                    }}
                  >
                    {formatVal(row.govFunding)}
                  </td>

                  {/* 민간부담금 현금 */}
                  <td className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black">
                    {formatVal(row.instCash)}
                  </td>

                  {/* 민간부담금 현물 */}
                  <td className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black">
                    {formatVal(row.instGoods)}
                  </td>

                  {/* 민간부담금 소계(B) */}
                  <td className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black">
                    {formatVal(row.instSubtotal)}
                  </td>

                  {/* 합계 (A+B) - Light Green highlight if 인건비 or 운영비 */}
                  <td
                    className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black"
                    style={{
                      backgroundColor: hasGreenShading ? '#a9d18e' : undefined
                    }}
                  >
                    {formatVal(row.total)}
                  </td>

                  {/* 구성비 (%) */}
                  <td className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black">
                    {ratioTotal}
                  </td>

                  {/* 정부 지원금 구성비 (%) */}
                  <td className="border border-black px-3 py-2 text-right font-mono text-[13px] text-black">
                    {ratioGov}
                  </td>
                </tr>
              );
            })}

            {/* Sub-item detailed accordion expansion rows for main table */}
            {categoryRows.map((row) => {
              if (!expandedCategories[row.category] || !row.subItems || row.subItems.length === 0) {
                return null;
              }

              return (
                <tr key={`${row.category}-subitems`} className="bg-surface-container/20">
                  <td colSpan={8} className="border border-black p-3 text-left">
                    <div className="bg-surface-lowest p-3 rounded-lg border border-border shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="font-bold text-[13px] text-primary flex items-center gap-2">
                          <i className="fa-solid fa-list-check text-secondary"></i>
                          {row.category} 세부 집행 세목 내역 ({row.subItems.length}건)
                        </span>
                        <span className="text-[11px] text-gray-500">
                          * 세목 금액 합계가 비목 예산으로 자동 반영되었습니다. (단위: 원)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse text-center">
                          <thead>
                            <tr className="bg-surface-container/50 border-b border-border text-gray-600 font-bold">
                              <th className="py-1.5 px-2 text-left w-28">일자</th>
                              <th className="py-1.5 px-2 w-28">재원구분</th>
                              <th className="py-1.5 px-2 text-left">항목 (세부내역)</th>
                              <th className="py-1.5 px-2 text-right w-32">단가 (원)</th>
                              <th className="py-1.5 px-2 text-right w-20">수량</th>
                              <th className="py-1.5 px-2 text-right w-36">금액 (원)</th>
                              <th className="py-1.5 px-2 text-left w-48">비고</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {row.subItems.map((item, sIdx) => (
                              <tr key={item.id || sIdx} className="hover:bg-surface-container/20">
                                <td className="py-1.5 px-2 text-left font-mono text-gray-600">
                                  {item.date || '-'}
                                </td>
                                <td className="py-1.5 px-2">
                                  <span
                                    className={`badge text-[11px] py-0.5 px-1.5 font-bold ${
                                      item.fundingType === 'GOV'
                                        ? 'bg-secondary/15 text-secondary'
                                        : item.fundingType === 'CASH'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {item.fundingType === 'GOV'
                                      ? '정부지원금'
                                      : item.fundingType === 'CASH'
                                      ? '민간-현금'
                                      : '민간-현물'}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 text-left font-medium text-gray-800">
                                  {item.itemName || '-'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-gray-700">
                                  {item.unitPrice ? item.unitPrice.toLocaleString() : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-gray-700">
                                  {item.quantity ? item.quantity.toLocaleString() : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-primary">
                                  {item.amount ? item.amount.toLocaleString() : '0'}
                                </td>
                                <td className="py-1.5 px-2 text-left text-gray-500 text-[11px]">
                                  {item.note || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Footer Row (합 계) */}
            <tr className="border-t-2 border-black font-bold text-black bg-white">
              <td className="border border-black p-2.5 text-center font-bold text-[14px]">
                합 계
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {formatVal(grandTotal.govFunding)}
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {formatVal(grandTotal.instCash)}
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {formatVal(grandTotal.instGoods)}
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {formatVal(grandTotal.instSubtotal)}
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {formatVal(grandTotal.total)}
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {grandTotal.total > 0 ? '100%' : '0%'}
              </td>
              <td className="border border-black px-3 py-2 text-right font-mono font-bold text-[13px]">
                {grandTotal.govFunding > 0 ? '100%' : '0%'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
        <span>* 단위: {unit === 'THOUSAND' ? '천원' : '원'} (0원은 &apos;-&apos; 기호로 표시)</span>
        <span>* 민간부담금 소계(B) = 현금 + 현물 | 합계(A+B) = 정부지원금(A) + 민간부담금(B)</span>
      </div>

      {/* 3. Category Budget Edit Modal with Sub-items */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-[18px] font-bold text-primary flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-secondary"></i>
                  비목별 세부 배정 내역 편집
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  비목별로 하위에 세목(일자, 항목, 단가, 수량, 금액, 비고)을 추가하면 금액이 비목별로 자동 합산됩니다. (단위: 원)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyImageSampleValues}
                  className="btn btn-secondary text-[12px] px-3 py-1.5 text-secondary border-secondary/30 hover:bg-secondary/10"
                  title="첨부 이미지의 556,985천원(인건비 513,185, 운영비 17,500 등) 상세 세목을 채웁니다."
                >
                  <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i>
                  첨부 이미지 예시값(5.56억) 채우기
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

            {/* Target Year Selector in Modal */}
            <div className="flex items-center justify-between bg-surface-container/30 p-3 rounded-lg border border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-gray-600">편집 대상 연차:</span>
                <div className="flex items-center gap-1.5">
                  {distinctYears.map((yr, idx) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleModalYearChange(yr)}
                      className={`px-3 py-1 text-[12px] font-bold rounded ${
                        editYear === yr
                          ? 'bg-secondary text-white'
                          : 'bg-surface-lowest text-gray-600 border border-border hover:bg-surface-hover'
                      }`}
                    >
                      {idx + 1}차년도 ({yr}년)
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Summary Badge */}
              <div className="flex items-center gap-2 text-[12px] font-mono">
                <span className="text-secondary font-bold">
                  정부: {modalGrandTotals.gov.toLocaleString()}원
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-blue-600">
                  현금: {modalGrandTotals.cash.toLocaleString()}원
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-emerald-600">
                  현물: {modalGrandTotals.goods.toLocaleString()}원
                </span>
                <span className="text-gray-300">|</span>
                <span className="font-extrabold text-primary bg-surface-container px-2 py-0.5 rounded">
                  총계: {modalGrandTotals.total.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* Category Cards with Sub-Items List */}
            <div className="space-y-4">
              {editRows.map((row, catIdx) => {
                const rowTotal = (row.govFunding || 0) + (row.instCash || 0) + (row.instGoods || 0);
                const hasSubItems = row.subItems && row.subItems.length > 0;

                return (
                  <div
                    key={row.category}
                    className="border border-border rounded-xl bg-surface-lowest overflow-hidden shadow-xs"
                  >
                    {/* Category Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface-container/30 border-b border-border gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[14px] font-bold text-primary">
                          {row.category}
                        </span>

                        {hasSubItems ? (
                          <span className="badge bg-secondary/15 text-secondary text-[11px] font-bold">
                            세목 {row.subItems.length}건 (자동합산)
                          </span>
                        ) : (
                          <span className="badge bg-surface-container text-gray-500 text-[11px]">
                            세목 미등록 (직접입력)
                          </span>
                        )}

                        <div className="flex items-center gap-2 text-[12px] font-mono ml-1">
                          <span className="text-secondary font-bold">
                            정부: {row.govFunding.toLocaleString()}원
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-blue-600">
                            현금: {row.instCash.toLocaleString()}원
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-emerald-600">
                            현물: {row.instGoods.toLocaleString()}원
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="font-bold text-primary bg-surface-container px-2 py-0.5 rounded">
                            합계: {rowTotal.toLocaleString()}원
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleAddSubItem(catIdx)}
                          className="btn btn-secondary text-[12px] px-2.5 py-1 text-secondary border-secondary/30 hover:bg-secondary/10 flex items-center gap-1 font-bold"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                          세목 추가
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryCard(catIdx)}
                          className="text-gray-400 hover:text-primary p-1 text-[13px]"
                          title={row.isExpanded ? '접기' : '펼치기'}
                        >
                          <i
                            className={`fa-solid fa-chevron-${row.isExpanded ? 'up' : 'down'}`}
                          ></i>
                        </button>
                      </div>
                    </div>

                    {/* Category Card Body */}
                    {row.isExpanded && (
                      <div className="p-3.5 space-y-3">
                        {hasSubItems ? (
                          <div className="overflow-x-auto border border-border rounded-lg">
                            <table className="w-full text-[12px] border-collapse">
                              <thead>
                                <tr className="bg-surface-container/40 text-gray-600 border-b border-border text-[11px] font-bold uppercase">
                                  <th className="p-2 text-left w-[130px]">일자</th>
                                  <th className="p-2 text-center w-[125px]">재원구분</th>
                                  <th className="p-2 text-left min-w-[150px]">항목 (세부내역)</th>
                                  <th className="p-2 text-right w-[125px]">단가 (원)</th>
                                  <th className="p-2 text-right w-[65px]">수량</th>
                                  <th className="p-2 text-right w-[135px]">금액 (원)</th>
                                  <th className="p-2 text-left min-w-[130px]">비고</th>
                                  <th className="p-2 text-center w-[45px]">삭제</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {row.subItems.map((item, itemIdx) => (
                                  <tr
                                    key={item.id || itemIdx}
                                    className="hover:bg-surface-container/10"
                                  >
                                    {/* 일자 */}
                                    <td className="p-1.5">
                                      <input
                                        type="date"
                                        value={item.date}
                                        onChange={(e) =>
                                          handleSubItemFieldChange(
                                            catIdx,
                                            itemIdx,
                                            'date',
                                            e.target.value
                                          )
                                        }
                                        className="w-full px-2 py-1 bg-surface-lowest border border-border rounded text-[11px] font-mono focus:border-secondary focus:outline-none"
                                      />
                                    </td>

                                    {/* 재원구분 */}
                                    <td className="p-1.5">
                                      <select
                                        value={item.fundingType}
                                        onChange={(e) =>
                                          handleSubItemFieldChange(
                                            catIdx,
                                            itemIdx,
                                            'fundingType',
                                            e.target.value
                                          )
                                        }
                                        className="w-full px-1.5 py-1 bg-surface-lowest border border-border rounded text-[11px] font-medium focus:border-secondary focus:outline-none"
                                      >
                                        <option value="GOV">정부지원금(A)</option>
                                        <option value="CASH">민간부담(현금)</option>
                                        <option value="GOODS">민간부담(현물)</option>
                                      </select>
                                    </td>

                                    {/* 항목 */}
                                    <td className="p-1.5">
                                      <input
                                        type="text"
                                        value={item.itemName}
                                        onChange={(e) =>
                                          handleSubItemFieldChange(
                                            catIdx,
                                            itemIdx,
                                            'itemName',
                                            e.target.value
                                          )
                                        }
                                        placeholder="항목명 입력"
                                        className="w-full px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] focus:border-secondary focus:outline-none"
                                      />
                                    </td>

                                    {/* 단가 */}
                                    <td className="p-1.5">
                                      <input
                                        type="text"
                                        value={
                                          item.unitPrice ? item.unitPrice.toLocaleString() : ''
                                        }
                                        onChange={(e) =>
                                          handleSubItemNumberChange(
                                            catIdx,
                                            itemIdx,
                                            'unitPrice',
                                            e.target.value
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] font-mono text-right focus:border-secondary focus:outline-none"
                                      />
                                    </td>

                                    {/* 수량 */}
                                    <td className="p-1.5">
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity || ''}
                                        onChange={(e) =>
                                          handleSubItemNumberChange(
                                            catIdx,
                                            itemIdx,
                                            'quantity',
                                            e.target.value
                                          )
                                        }
                                        placeholder="1"
                                        className="w-full px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] font-mono text-right focus:border-secondary focus:outline-none"
                                      />
                                    </td>

                                    {/* 금액 (자동계산 및 수동입력) */}
                                    <td className="p-1.5">
                                      <input
                                        type="text"
                                        value={item.amount ? item.amount.toLocaleString() : ''}
                                        onChange={(e) =>
                                          handleSubItemNumberChange(
                                            catIdx,
                                            itemIdx,
                                            'amount',
                                            e.target.value
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] font-mono font-bold text-right text-secondary focus:border-secondary focus:outline-none"
                                      />
                                    </td>

                                    {/* 비고 */}
                                    <td className="p-1.5">
                                      <input
                                        type="text"
                                        value={item.note}
                                        onChange={(e) =>
                                          handleSubItemFieldChange(
                                            catIdx,
                                            itemIdx,
                                            'note',
                                            e.target.value
                                          )
                                        }
                                        placeholder="비고 / 산출근거"
                                        className="w-full px-2 py-1 bg-surface-lowest border border-border rounded text-[11px] text-gray-600 focus:border-secondary focus:outline-none"
                                      />
                                    </td>

                                    {/* 삭제 */}
                                    <td className="p-1.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm("해당 세목을 삭제하시겠습니까?")) {
                                            handleDeleteSubItem(catIdx, itemIdx);
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-tertiary text-white text-[11px] font-bold rounded hover:bg-tertiary/90 transition-colors"
                                        title="세목 삭제"
                                      >
                                        삭제
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* Sub-item table footer */}
                            <div className="flex flex-col sm:flex-row justify-between items-center bg-surface-container/20 px-3 py-2 border-t border-border text-[11px] text-gray-600 font-mono gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddSubItem(catIdx)}
                                className="text-secondary hover:underline font-bold font-sans flex items-center gap-1 self-start sm:self-auto"
                              >
                                <i className="fa-solid fa-plus text-[10px]"></i>
                                + 세목 행 추가
                              </button>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span>
                                  정부: <strong className="text-secondary">{row.govFunding.toLocaleString()}원</strong>
                                </span>
                                <span>
                                  현금: <strong className="text-blue-600">{row.instCash.toLocaleString()}원</strong>
                                </span>
                                <span>
                                  현물: <strong className="text-emerald-600">{row.instGoods.toLocaleString()}원</strong>
                                </span>
                                <span>
                                  비목 합계: <strong className="text-primary font-bold">{rowTotal.toLocaleString()}원</strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-surface-container/10 rounded-lg p-3 border border-dashed border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-[12px] text-gray-500">
                              등록된 세목이 없습니다. 우측의 <strong>[+ 세목 추가]</strong>를 눌러 일자별 항목, 단가, 수량을 등록하거나, 아래에서 비목 금액을 직접 입력할 수 있습니다.
                            </div>
                            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                              <div>
                                <span className="text-[10px] text-gray-500 block mb-0.5">정부지원금 (원)</span>
                                <input
                                  type="text"
                                  value={row.govFunding ? row.govFunding.toLocaleString() : ''}
                                  onChange={(e) =>
                                    handleDirectCategoryAmountChange(
                                      catIdx,
                                      'govFunding',
                                      e.target.value
                                    )
                                  }
                                  className="w-28 px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] font-mono text-right"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 block mb-0.5">민간-현금 (원)</span>
                                <input
                                  type="text"
                                  value={row.instCash ? row.instCash.toLocaleString() : ''}
                                  onChange={(e) =>
                                    handleDirectCategoryAmountChange(
                                      catIdx,
                                      'instCash',
                                      e.target.value
                                    )
                                  }
                                  className="w-28 px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] font-mono text-right"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 block mb-0.5">민간-현물 (원)</span>
                                <input
                                  type="text"
                                  value={row.instGoods ? row.instGoods.toLocaleString() : ''}
                                  onChange={(e) =>
                                    handleDirectCategoryAmountChange(
                                      catIdx,
                                      'instGoods',
                                      e.target.value
                                    )
                                  }
                                  className="w-28 px-2 py-1 bg-surface-lowest border border-border rounded text-[12px] font-mono text-right"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border pt-4 gap-3">
              <div className="text-[13px] text-gray-600 font-medium">
                총 합계: <strong className="font-mono text-primary text-[16px] font-extrabold">{modalGrandTotals.total.toLocaleString()} 원</strong>
                <span className="text-[11px] text-gray-500 ml-2 font-mono">
                  (정부: {modalGrandTotals.gov.toLocaleString()}원 | 현금: {modalGrandTotals.cash.toLocaleString()}원 | 현물: {modalGrandTotals.goods.toLocaleString()}원)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-secondary text-[13px] px-5"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategoryBudgets}
                  disabled={isPending}
                  className="btn btn-primary text-[13px] px-6 font-bold"
                >
                  {isPending ? '저장 중...' : '비목 예산 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
