import Link from 'next/link';
import { SignupForm } from './signup-form';

// design.md §13.1 — 회원가입 화면 (역할 선택 포함)
export default function SignupPage() {
  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-neutral-900">토론모임</h1>
        <p className="text-lg text-neutral-600">같이 생각하고, 함께 결정해요</p>
      </header>

      <SignupForm />

      <p className="text-center text-sm text-neutral-600">
        이미 계정이 있나요?{' '}
        <Link
          href="/login"
          className="text-brand-600 font-medium underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
