'use client';

import { useState } from 'react';
import Link from 'next/link';
import PaginationControls from './PaginationControls';

interface UserItem {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  joinDate?: string | Date | null;
  affiliation?: string | null;
  nationality?: string | null;
  degree?: string | null;
  major?: string | null;
  degreeYear?: string | null;
  researcherNumber?: string | null;
  grossSalary?: number | null;
  fourInsurances?: number | null;
  monthlyParticipations: { rate: number }[];
}

interface Props {
  users: UserItem[];
  isHR: boolean;
  currentUserId?: string;
  onDeleteUser: (userId: string) => Promise<void>;
}

export default function HRTable({ users, isHR, currentUserId, onDeleteUser }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = users.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

  const formatCurrency = (amount: number | null | undefined) => {
    if (!isHR) return '***,***,***';
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString() + ' 원';
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-primary flex items-center gap-2">
          <i className="fa-solid fa-list-ul text-secondary text-[16px]"></i>
          인력 리스트 (연구과제 참여 인력 명부)
        </h2>
        <span className="badge bg-surface-container text-primary font-bold">
          연구 인력 {totalItems}명
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">성명 / 이메일</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">역할</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">입사일</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">소속 / 국적</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">학위 / 전공</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">과학기술인 등록번호</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-right">세전 연봉</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-right">4대보험 포함 연봉</th>
              <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center">연간 참여율(평균)</th>
              {isHR && <th className="px-4 py-3.5 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center w-36">관리</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedUsers.map((user) => {
              const annualAvgRate = user.monthlyParticipations.reduce((sum, p) => sum + p.rate, 0) / 12;
              const rateColorClass =
                annualAvgRate > 100
                  ? 'text-tertiary font-bold'
                  : annualAvgRate === 0
                  ? 'text-gray-400'
                  : 'text-secondary font-bold';
              const userTotalCompensation = (user.grossSalary || 0) + (user.fourInsurances || 0);
              const isSelf = currentUserId === user.id;

              return (
                <tr key={user.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[14px] text-primary">{user.name}</div>
                    <div className="text-[12px] text-gray-500 mt-0.5 font-mono">{user.email}</div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`badge ${
                        user.role === 'ADMIN'
                          ? 'bg-primary text-white'
                          : user.role === 'PM'
                          ? 'badge-success'
                          : user.role === 'HR'
                          ? 'bg-secondary/10 text-secondary'
                          : 'bg-surface-container text-gray-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-[13px] text-gray-700 font-mono">
                    {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '-'}
                  </td>

                  <td className="px-4 py-4 text-[13px] text-gray-600">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        user.affiliation === '프리랜서' || user.affiliation?.includes('프리랜서')
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {user.affiliation === '프리랜서' || user.affiliation?.includes('프리랜서') ? '프리랜서' : '당사 직원'}
                      </span>
                      <span className="text-[12.5px] text-gray-700 font-medium">{user.affiliation || '-'}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{user.nationality || '대한민국'}</div>
                  </td>

                  <td className="px-4 py-4 text-[13px]">
                    <div className="text-primary font-medium">
                      {user.degree ? `${user.degree} (${user.major || '-'})` : '-'}
                    </div>
                    {user.degreeYear && <div className="text-[11px] text-gray-400">{user.degreeYear}년 취득</div>}
                  </td>

                  <td className="px-4 py-4 text-[13px] text-gray-600 font-mono">
                    {user.researcherNumber || '-'}
                  </td>

                  <td className="px-4 py-4 text-[13px] text-right font-mono font-medium text-gray-800">
                    {formatCurrency(user.grossSalary)}
                  </td>

                  <td className="px-4 py-4 text-[13px] text-right font-mono font-bold text-secondary">
                    {formatCurrency(userTotalCompensation)}
                  </td>

                  <td className={`px-4 py-4 text-center font-mono text-[14px] ${rateColorClass}`}>
                    {annualAvgRate.toFixed(1)}%
                  </td>

                  {isHR && (
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/hr/${user.id}/edit`}
                          className="px-2.5 py-1 bg-secondary text-white text-[11px] font-bold rounded hover:bg-secondary/90 transition-colors"
                        >
                          수정
                        </Link>
                        {!isSelf && (
                          <form
                            action={async () => {
                              if (confirm(`${user.name} 직원을 삭제하시겠습니까?`)) {
                                await onDeleteUser(user.id);
                              }
                            }}
                          >
                            <button
                              type="submit"
                              className="px-2.5 py-1 bg-tertiary text-white text-[11px] font-bold rounded hover:bg-tertiary/90 transition-colors"
                            >
                              삭제
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={isHR ? 10 : 9} className="px-6 py-12 text-center text-[13px] text-gray-400">
                  등록된 인력이 없습니다.
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
