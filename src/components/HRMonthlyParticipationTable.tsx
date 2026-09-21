'use client';

import { useState } from 'react';

interface MonthlyParticipation {
  yearMonth: string; // "YYYY-MM"
  rate: number;
}

interface User {
  id: string;
  name: string | null;
  role: string;
  affiliation: string | null;
  monthlyParticipations: MonthlyParticipation[];
}

interface Props {
  users: User[];
  projectYears?: number[];
}

export default function HRMonthlyParticipationTable({ users, projectYears = [] }: Props) {
  const currentYear = new Date().getFullYear();
  // Extract all distinct years from the data (past and future), plus current year and project dates
  const allYears = new Set<number>([currentYear, ...projectYears]);
  users.forEach(u => {
    u.monthlyParticipations.forEach(p => {
      const yr = parseInt(p.yearMonth.split('-')[0], 10);
      if (!isNaN(yr)) allYears.add(yr);
    });
  });
  
  const minYear = Math.min(...Array.from(allYears));
  const maxYear = Math.max(...Array.from(allYears));
  
  // Create a continuous array of years from minYear to maxYear
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-4 border-b border-border bg-surface-container/30 flex items-center gap-3">
        <label htmlFor="year-select" className="text-[13px] font-bold text-gray-600 whitespace-nowrap mb-0">
          조회 연도:
        </label>
        <div className="relative w-40">
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="w-full pl-3 pr-8 py-1.5 bg-surface border border-border rounded-md text-[13px] font-bold text-primary focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors cursor-pointer"
          >
            {years.map(yr => (
              <option key={yr} value={yr}>
                {yr}년도 조회
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 uppercase w-[180px]">이름 / 소속</th>
              {[...Array(12)].map((_, i) => (
                <th key={i} className="px-3 py-3.5 text-[12px] font-semibold text-gray-500 uppercase text-center min-w-[65px]">
                  {i + 1}월
                </th>
              ))}
              <th className="px-4 py-3.5 text-[12px] font-bold text-secondary uppercase text-center w-[85px]">연평균</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(user => {
              let annualSum = 0;
              const monthlyRates = [...Array(12)].map((_, i) => {
                const monthStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
                // Sum all participations for this user in this month (across multiple projects)
                const monthRate = user.monthlyParticipations
                  .filter(p => p.yearMonth === monthStr)
                  .reduce((sum, p) => sum + p.rate, 0);
                annualSum += monthRate;
                return monthRate;
              });

              const annualAvg = annualSum / 12;

              return (
                <tr key={user.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-[13px] text-primary">{user.name || '-'}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{user.affiliation || '소속 없음'}</div>
                  </td>
                  {monthlyRates.map((rate, i) => (
                    <td 
                      key={i} 
                      className={`px-3 py-3 text-center font-mono text-[12px] ${
                        rate > 100 ? 'text-tertiary font-bold bg-[#ffe9ee]/30' : rate > 0 ? 'text-primary font-medium' : 'text-gray-300'
                      }`}
                    >
                      {rate > 0 ? `${rate.toFixed(1)}%` : '-'}
                    </td>
                  ))}
                  <td className={`px-4 py-3 text-center font-mono text-[13px] font-bold ${annualAvg > 100 ? 'text-tertiary' : 'text-secondary'}`}>
                    {annualAvg.toFixed(1)}%
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={14} className="px-6 py-12 text-center text-[13px] text-gray-400">
                  등록된 인력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
