'use client';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers to show (up to 5 surrounding current)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-border bg-surface-lowest text-[13px] text-gray-600">
      {/* Left: Row Count Selector & Total Count Info */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">표시 개수:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="rounded-lg border border-border bg-white px-2.5 py-1 text-[13px] font-medium text-gray-800 shadow-xs focus:border-primary focus:outline-hidden"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}개씩 보기
              </option>
            ))}
          </select>
        </div>

        <div className="text-gray-500">
          총 <span className="font-bold text-primary">{totalItems.toLocaleString()}</span>건 중{' '}
          <span className="font-medium text-gray-800">{startItem}</span> -{' '}
          <span className="font-medium text-gray-800">{endItem}</span>건 표시
        </div>
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1 self-center sm:self-auto">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="px-2 py-1 rounded border border-border bg-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[12px]"
          title="첫 페이지"
        >
          <i className="fa-solid fa-angles-left"></i>
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="px-2.5 py-1 rounded border border-border bg-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[12px]"
          title="이전 페이지"
        >
          <i className="fa-solid fa-angle-left"></i>
        </button>

        {/* Page Numbers */}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 rounded border text-[13px] font-semibold transition-all ${
              safeCurrentPage === p
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-white border-border text-gray-700 hover:bg-surface-hover hover:text-primary'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className="px-2.5 py-1 rounded border border-border bg-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[12px]"
          title="다음 페이지"
        >
          <i className="fa-solid fa-angle-right"></i>
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="px-2 py-1 rounded border border-border bg-white hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[12px]"
          title="마지막 페이지"
        >
          <i className="fa-solid fa-angles-right"></i>
        </button>
      </div>
    </div>
  );
}
