'use client';

export default function LoginButton({ redirectTo }: { redirectTo?: string }) {
  function handleLogin() {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3012';
    const back = redirectTo ?? '/';
    const returnTo = `${window.location.origin}${back}`;
    window.location.href = `${authUrl}/login?redirect=${encodeURIComponent(returnTo)}`;
  }

  return (
    <button type="button" onClick={handleLogin} className="btn btn-primary w-full">
      로그인
    </button>
  );
}
