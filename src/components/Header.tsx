'use client';

import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import type { RndSession } from '@/lib/auth';

export default function Header({ session }: { session: RndSession | null }) {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

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
          {session ? (
            <div className="flex items-center gap-4 border-l pl-4 border-border">
              <div className="text-right">
                <div className="font-semibold text-primary text-[14px]">{session.user?.name}</div>
                <div className="text-[12px] text-secondary font-bold">{session.user?.role}</div>
              </div>
              <button
                onClick={handleSignOut}
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
