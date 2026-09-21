'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-10 flex w-full bg-surface shadow-sm border-b border-border">
      <div className="flex flex-grow items-center justify-between px-6 py-4">
        
        {/* Left Side (Breadcrumb/Title placeholder) */}
        <div className="flex items-center gap-4">
          <div className="text-primary font-bold text-lg hidden sm:block">
            R&D Management Service
          </div>
        </div>

        {/* Right Side (User Profile & Actions) */}
        <div className="flex items-center gap-4">
          {status === 'loading' ? (
            <div className="text-[14px] text-gray-500">로딩 중...</div>
          ) : session ? (
            <div className="flex items-center gap-4 border-l pl-4 border-border">
              <div className="text-right">
                <div className="font-semibold text-primary text-[14px]">{session.user?.name}</div>
                <div className="text-[12px] text-secondary font-bold">{session.user?.role}</div>
              </div>
              <button 
                onClick={() => signOut()} 
                className="bg-surface-lowest hover:bg-surface-hover text-primary text-[14px] py-1.5 px-3 rounded-md transition-colors flex items-center gap-2 border border-border"
              >
                <i className="fa-solid fa-right-from-bracket"></i> 로그아웃
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
