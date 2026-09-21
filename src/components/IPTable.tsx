'use client';

import { useState } from 'react';
import Link from 'next/link';
import PaginationControls from './PaginationControls';

interface IPItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  registrationNo?: string | null;
  inventor?: string | null;
  registrationDate?: string | Date | null;
  status?: string | null;
  attachmentPath?: string | null;
  projectId?: string | null;
  project?: {
    id: string;
    title: string;
  } | null;
}

interface Props {
  ips: IPItem[];
  isAdmin: boolean;
  onDeleteIP: (id: string) => Promise<void>;
}

export default function IPTable({ ips, isAdmin, onDeleteIP }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = ips.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedIPs = ips.slice(startIndex, startIndex + pageSize);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-24">구분</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">명칭 (Title)</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-36">등록/출원번호</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-28">발명자/저자</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-28">취득일</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-24">상태</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-40">첨부사본</th>
              <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">연관 과제</th>
              {isAdmin && <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center w-20">관리</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedIPs.map((ip) => (
              <tr key={ip.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="badge bg-surface text-primary border border-border">
                    {ip.type}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="font-bold text-primary text-[14px]">{ip.title}</div>
                  {ip.description && <div className="text-[12px] text-gray-500 mt-1">{ip.description}</div>}
                </td>
                <td className="px-5 py-4 text-[13px] text-gray-700 font-mono">{ip.registrationNo || '-'}</td>
                <td className="px-5 py-4 text-[13px] text-gray-700">{ip.inventor || '-'}</td>
                <td className="px-5 py-4 text-[13px] text-gray-500">
                  {ip.registrationDate ? new Date(ip.registrationDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="badge bg-surface-container text-primary">
                    {ip.status || '-'}
                  </span>
                </td>
                <td className="px-5 py-4 text-[13px]">
                  {ip.attachmentPath ? (
                    <div className="flex items-center gap-1.5" title={`첨부사본 경로: ${ip.attachmentPath}`}>
                      <span className="p-1 rounded bg-secondary/10 text-secondary shrink-0">
                        <i className="fa-solid fa-paperclip text-[11px]"></i>
                      </span>
                      <span className="font-mono text-[11.5px] text-gray-700 truncate max-w-[140px]">
                        {ip.attachmentPath.split(/[\\/]/).pop()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-300 font-mono text-[12px]">-</span>
                  )}
                </td>
                <td className="px-5 py-4 text-[13px]">
                  {ip.project ? (
                    <Link href={`/projects/${ip.projectId}/info`} className="text-secondary hover:text-primary font-bold hover:underline">
                      {ip.project.title}
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-center">
                    <form action={async () => {
                      if (confirm(`${ip.title} 지식재산권을 삭제하시겠습니까?`)) {
                        await onDeleteIP(ip.id);
                      }
                    }}>
                      <button type="submit" className="px-2.5 py-1 bg-tertiary text-white text-[11px] font-bold rounded hover:bg-tertiary/90 transition-colors">
                        삭제
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {paginatedIPs.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="px-6 py-12 text-center text-gray-400">
                  등록된 지식재산권이 없습니다.
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
