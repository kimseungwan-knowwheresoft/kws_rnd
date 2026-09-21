'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  projectId: string;
}

export default function ProjectNavTabs({ projectId }: Props) {
  const pathname = usePathname();

  const tabs = [
    {
      label: '기본정보',
      href: `/projects/${projectId}/info`,
      icon: 'fa-solid fa-circle-info',
      isActive: (path: string) =>
        path === `/projects/${projectId}` ||
        path === `/projects/${projectId}/info` ||
        path.startsWith(`/projects/${projectId}/info/`)
    },
    {
      label: '기본 연차별 예산',
      href: `/projects/${projectId}/annual-budget`,
      icon: 'fa-solid fa-calculator',
      isActive: (path: string) =>
        path === `/projects/${projectId}/annual-budget` ||
        path.startsWith(`/projects/${projectId}/annual-budget/`)
    },
    {
      label: '인력참여율 관리',
      href: `/projects/${projectId}/participation`,
      icon: 'fa-solid fa-user-check',
      isActive: (path: string) =>
        path === `/projects/${projectId}/participation` ||
        path.startsWith(`/projects/${projectId}/participation/`)
    },
    {
      label: '예산 관리',
      href: `/projects/${projectId}/budget`,
      icon: 'fa-solid fa-chart-line',
      isActive: (path: string) =>
        path === `/projects/${projectId}/budget` ||
        path.startsWith(`/projects/${projectId}/budget/`)
    }
  ];

  return (
    <div className="flex border-b border-border overflow-x-auto bg-surface-lowest rounded-t-xl px-2">
      {tabs.map((tab) => {
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-[14px] font-semibold transition-all border-b-2 whitespace-nowrap ${
              active
                ? 'border-secondary text-primary font-bold bg-white/70 shadow-xs'
                : 'border-transparent text-gray-500 hover:text-primary hover:border-gray-300'
            }`}
          >
            <i className={`${tab.icon} text-[15px] ${active ? 'text-secondary' : 'text-gray-400'}`}></i>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
