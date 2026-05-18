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

      <div className="space-y-2 text-center text-sm text-neutral-600">
        <p>
          이미 계정이 있나요?{' '}
          <Link
            href="/login"
            className="text-brand-600 font-medium underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>
        <p className="text-xs text-neutral-500">
          선생님이 ID·비밀번호를 나눠줬다면 그것으로{' '}
          <Link
            href="/login"
            className="text-brand-600 font-medium underline-offset-4 hover:underline"
          >
            바로 로그인
          </Link>
          하세요.
        </p>
      </div>
    </div>
  );
}
