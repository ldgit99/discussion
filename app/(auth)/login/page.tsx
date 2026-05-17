import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';

// design.md §13.1 — 로그인 화면
export default function LoginPage() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-neutral-900">토론모임</h1>
        <p className="text-lg text-neutral-600">같이 생각하고, 함께 결정해요</p>
      </header>

      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <LoginForm />
      </Suspense>

      <p className="text-center text-sm text-neutral-600">
        아직 계정이 없나요?{' '}
        <Link
          href="/signup"
          className="text-brand-600 font-medium underline-offset-4 hover:underline"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
