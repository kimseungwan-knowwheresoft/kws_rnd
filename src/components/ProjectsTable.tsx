'use client';

import { useState } from 'react';
import Link from 'next/link';
import PaginationControls from './PaginationControls';

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  programName?: string | null;
  piName?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

interface Props {
  projects: ProjectItem[];
}

export default function ProjectsTable({ projects }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = projects.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = projects.slice(startIndex, startIndex + pageSize);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-28">상태</th>
              <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">과제명 (사업명)</th>
              <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-36">연구책임자</th>
              <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-36">시작일</th>
              <th className="px-6 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-36">종료일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedProjects.map((p) => (
              <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`badge ${
                      p.status === '진행중' || p.status === 'IN_PROGRESS'
                        ? 'badge-success'
                        : p.status === '계획중'
                        ? 'bg-surface-container text-primary'
                        : 'bg-surface-container text-gray-500'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-primary text-[14px]">
                    <Link href={`/projects/${p.id}/info`} className="hover:text-secondary">
                      {p.title}
                    </Link>
                  </div>
                  {p.programName && <div className="text-[12px] text-gray-500 mt-1">{p.programName}</div>}
                </td>
                <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">{p.piName || '-'}</td>
                <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
            {paginatedProjects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  등록된 과제가 없습니다.
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
