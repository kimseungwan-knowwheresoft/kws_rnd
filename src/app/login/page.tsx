'use client';

import { signIn } from 'next-auth/react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      if (res.error === 'ID_NOT_FOUND') {
        setError('아이디가 정확하지 않습니다.');
      } else if (res.error === 'WRONG_PASSWORD') {
        setError('패스워드가 틀렸습니다.');
      } else if (res.error === 'ACCOUNT_LOCKED' || res.error === 'ACCOUNT_LOCKED_NOW') {
        setError('5회 이상 로그인 실패로 20분간 계정이 잠김 처리되었습니다.');
      } else {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-lowest py-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-50">
      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-lg shadow-card border border-border">
        <div>
          <div className="flex justify-center">
            <Image src="/logo.png" alt="KnowWhereSoft Logo" width={180} height={50} className="object-contain" priority />
          </div>
          <h2 className="mt-6 text-center text-[32px] font-bold text-primary">
            시스템 로그인
          </h2>
          <p className="mt-2 text-center text-[14px] text-gray-500">
            사내 R&D 및 인력 통합 관리 시스템
          </p>
        </div>
        
        {error && (
          <div className="bg-[#ffe9ee] border-l-4 border-tertiary p-4 rounded-md">
            <p className="text-[14px] text-tertiary font-medium text-center">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 input-group">
            <div>
              <label htmlFor="email">이메일 주소</label>
              <input
                id="email"
                type="email"
                required
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-[14px] text-gray-500 text-center font-bold">테스트 계정 (비밀번호: password123)</p>
          <ul className="mt-2 text-[12px] text-gray-400 text-center space-y-1">
            <li>admin@company.com (ADMIN)</li>
            <li>pm@company.com (PM)</li>
            <li>researcher1@company.com (RESEARCHER)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
