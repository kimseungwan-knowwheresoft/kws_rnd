'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface InProgressProject {
  id: string;
  title: string;
  status: string;
}

export default function Sidebar() {
  const { status } = useSession();
  const pathname = usePathname();
  const [inProgressProjects, setInProgressProjects] = useState<InProgressProject[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(true);
  const [isHRMenuOpen, setIsHRMenuOpen] = useState(true);
  const [isSettlementMenuOpen, setIsSettlementMenuOpen] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/projects/in-progress')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setInProgressProjects(data);
          }
        })
        .catch((err) => console.error('Error loading projects in sidebar:', err));
    }
  }, [status, pathname]);

  // Auto-expand current active project in sidebar
  useEffect(() => {
    const match = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)/);
    if (match && match[1] && match[1] !== 'new') {
      const activeId = match[1];
      setExpandedProjects((prev) => ({ ...prev, [activeId]: true }));
      setIsProjectsMenuOpen(true);
    }
  }, [pathname]);

  if (pathname === '/login') return null;

  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const isProjectsActive = pathname === '/projects' || pathname.startsWith('/projects/');
  const isHRActive = pathname === '/hr' || pathname.startsWith('/hr/');
  const isSettlementActive = pathname === '/settlement' || pathname.startsWith('/settlement/');

  return (
    <aside className="w-[280px] bg-surface text-primary flex-shrink-0 flex flex-col border-r border-border z-20 hidden md:flex h-screen">
      {/* Brand Header */}
      <div className="flex items-center px-6 py-4 border-b border-border bg-surface flex-shrink-0">
        <Link href="/" className="flex items-center gap-3 w-full">
          <div className="bg-white rounded flex items-center justify-center h-10">
            <Image src="/logo.png" alt="KnowWhereSoft Logo" width={140} height={36} className="object-contain" priority />
          </div>
        </Link>
      </div>

      {/* Navigation Area */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar">
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Main Menu
          </div>
          
          <nav className="space-y-1">
            {/* 1. Dashboard */}
            <Link
              href="/"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                pathname === '/'
                  ? 'bg-surface-container text-primary font-bold shadow-sm'
                  : 'text-gray-600 hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <i className={`fa-solid fa-chart-pie w-5 text-center text-[16px] ${pathname === '/' ? 'text-secondary' : 'text-gray-400'}`}></i>
              <span className="text-[14px]">대시보드</span>
            </Link>

            {/* 2. Project Management (과제 관리) */}
            <div className="pt-1">
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                  isProjectsActive && !pathname.match(/^\/projects\/[a-zA-Z0-9_-]+/)
                    ? 'bg-surface-container text-primary font-bold shadow-sm'
                    : 'text-gray-700 hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <Link href="/projects" className="flex items-center gap-3 flex-1">
                  <i className={`fa-solid fa-folder-open w-5 text-center text-[16px] ${isProjectsActive ? 'text-secondary' : 'text-gray-400'}`}></i>
                  <span className="text-[14px]">과제 관리</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsProjectsMenuOpen(!isProjectsMenuOpen)}
                  className="text-gray-400 hover:text-primary p-1 transition-transform"
                >
                  <i className={`fa-solid fa-chevron-${isProjectsMenuOpen ? 'down' : 'right'} text-[11px]`}></i>
                </button>
              </div>

              {/* Sub-projects list */}
              {isProjectsMenuOpen && (
                <div className="mt-1 pl-4 pr-1 space-y-1 border-l-2 border-border ml-5">
                  <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 flex items-center justify-between">
                    <span>진행 중인 과제</span>
                    <span className="bg-surface-container text-secondary text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {inProgressProjects.length}
                    </span>
                  </div>

                  {inProgressProjects.length === 0 ? (
                    <div className="px-2 py-2 text-[12px] text-gray-400 italic">
                      진행 중인 과제 없음
                    </div>
                  ) : (
                    inProgressProjects.map((proj) => {
                      const isThisProjActive = pathname.startsWith(`/projects/${proj.id}`);
                      const isExpanded = expandedProjects[proj.id] ?? isThisProjActive;

                      return (
                        <div key={proj.id} className="space-y-0.5">
                          {/* Project Name Item */}
                          <div
                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                              isThisProjActive
                                ? 'bg-surface-container text-primary font-semibold'
                                : 'text-gray-600 hover:bg-surface-hover hover:text-primary'
                            }`}
                          >
                            <Link
                              href={`/projects/${proj.id}/info`}
                              className="flex items-center gap-2 truncate flex-1"
                              title={proj.title}
                            >
                              <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
                              <span className="truncate">{proj.title}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => toggleProject(proj.id, e)}
                              className="text-gray-400 group-hover:text-primary p-1 ml-1"
                            >
                              <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px]`}></i>
                            </button>
                          </div>

                          {/* 4 Sub-menus */}
                          {isExpanded && (
                            <div className="pl-3.5 space-y-0.5 border-l border-border ml-2 my-1">
                              <Link
                                href={`/projects/${proj.id}/info`}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors ${
                                  pathname === `/projects/${proj.id}/info` || pathname === `/projects/${proj.id}`
                                    ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                                    : 'text-gray-500 hover:text-primary hover:bg-surface-hover'
                                }`}
                              >
                                <i className="fa-solid fa-circle-info text-[11px] w-3.5 text-center"></i>
                                <span>기본정보</span>
                              </Link>

                              <Link
                                href={`/projects/${proj.id}/annual-budget`}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors ${
                                  pathname === `/projects/${proj.id}/annual-budget`
                                    ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                                    : 'text-gray-500 hover:text-primary hover:bg-surface-hover'
                                }`}
                              >
                                <i className="fa-solid fa-calculator text-[11px] w-3.5 text-center"></i>
                                <span>기본 연차별 예산</span>
                              </Link>

                              <Link
                                href={`/projects/${proj.id}/participation`}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors ${
                                  pathname === `/projects/${proj.id}/participation`
                                    ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                                    : 'text-gray-500 hover:text-primary hover:bg-surface-hover'
                                }`}
                              >
                                <i className="fa-solid fa-user-check text-[11px] w-3.5 text-center"></i>
                                <span>인력참여율 관리</span>
                              </Link>

                              <Link
                                href={`/projects/${proj.id}/budget`}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors ${
                                  pathname === `/projects/${proj.id}/budget`
                                    ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                                    : 'text-gray-500 hover:text-primary hover:bg-surface-hover'
                                }`}
                              >
                                <i className="fa-solid fa-chart-line text-[11px] w-3.5 text-center"></i>
                                <span>예산 관리</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 3. HR Management (인력 관리) */}
            <div className="pt-1">
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                  isHRActive
                    ? 'bg-surface-container text-primary font-bold shadow-sm'
                    : 'text-gray-700 hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <Link href="/hr" className="flex items-center gap-3 flex-1">
                  <i className={`fa-solid fa-users w-5 text-center text-[16px] ${isHRActive ? 'text-secondary' : 'text-gray-400'}`}></i>
                  <span className="text-[14px]">인력 관리</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsHRMenuOpen(!isHRMenuOpen)}
                  className="text-gray-400 hover:text-primary p-1 transition-transform"
                >
                  <i className={`fa-solid fa-chevron-${isHRMenuOpen ? 'down' : 'right'} text-[11px]`}></i>
                </button>
              </div>

              {isHRMenuOpen && (
                <div className="mt-1 pl-4 pr-1 space-y-0.5 border-l-2 border-border ml-5">
                  <Link
                    href="/hr"
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                      pathname === '/hr'
                        ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                        : 'text-gray-600 hover:text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <i className="fa-solid fa-list-ul text-[12px] w-4 text-center"></i>
                    <span>인력 리스트</span>
                  </Link>

                  <Link
                    href="/hr/monthly-participation"
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                      pathname === '/hr/monthly-participation'
                        ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                        : 'text-gray-600 hover:text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <i className="fa-solid fa-calendar-days text-[12px] w-4 text-center"></i>
                    <span>월별 참여율 조회</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 4. Settlement Management (정산 관리) */}
            <div className="pt-1">
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                  isSettlementActive
                    ? 'bg-surface-container text-primary font-bold shadow-sm'
                    : 'text-gray-700 hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <Link href="/settlement/projects" className="flex items-center gap-3 flex-1">
                  <i className={`fa-solid fa-calculator w-5 text-center text-[16px] ${isSettlementActive ? 'text-secondary' : 'text-gray-400'}`}></i>
                  <span className="text-[14px]">정산 관리</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSettlementMenuOpen(!isSettlementMenuOpen)}
                  className="text-gray-400 hover:text-primary p-1 transition-transform"
                >
                  <i className={`fa-solid fa-chevron-${isSettlementMenuOpen ? 'down' : 'right'} text-[11px]`}></i>
                </button>
              </div>

              {isSettlementMenuOpen && (
                <div className="mt-1 pl-4 pr-1 space-y-0.5 border-l-2 border-border ml-5">
                  <Link
                    href="/settlement/projects"
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                      pathname === '/settlement' || pathname === '/settlement/projects'
                        ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                        : 'text-gray-600 hover:text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <i className="fa-solid fa-table-list text-[12px] w-4 text-center"></i>
                    <span>과제별 정산 관리</span>
                  </Link>

                  <Link
                    href="/settlement/labor-costs"
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                      pathname === '/settlement/labor-costs'
                        ? 'text-secondary font-bold bg-surface-lowest shadow-xs'
                        : 'text-gray-600 hover:text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <i className="fa-solid fa-file-invoice-dollar text-[12px] w-4 text-center"></i>
                    <span>월별 인건비 산정</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 5. Intellectual Property (지식재산권 관리) */}
            <Link
              href="/ip"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                pathname === '/ip' || pathname.startsWith('/ip/')
                  ? 'bg-surface-container text-primary font-bold shadow-sm'
                  : 'text-gray-600 hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <i className={`fa-solid fa-lightbulb w-5 text-center text-[16px] ${pathname.startsWith('/ip') ? 'text-secondary' : 'text-gray-400'}`}></i>
              <span className="text-[14px]">지식재산권 관리</span>
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border text-[11px] text-gray-400 flex items-center justify-between flex-shrink-0">
        <span>© 2026 KnowWhereSoft</span>
        <span className="px-1.5 py-0.5 bg-surface-container rounded text-gray-500 font-mono">v1.2</span>
      </div>
    </aside>
  );
}
