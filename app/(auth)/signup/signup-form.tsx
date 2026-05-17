'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Role = 'teacher' | 'student';

// 반 1-10, 번호 1-30 선택지
const CLASS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const NUMBER_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');

  // 학생 전용 필드
  const [classNum, setClassNum] = useState<number>(1);
  const [studentNum, setStudentNum] = useState<number>(1);
  const [name, setName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상으로 만들어주세요.');
      return;
    }

    // 학생 필수 입력 검증
    if (role === 'student') {
      const trimmed = name.trim();
      if (trimmed.length < 1 || trimmed.length > 10) {
        toast.error('이름은 1-10자로 입력해주세요.');
        return;
      }
      if (/[-\s]/.test(trimmed)) {
        toast.error('이름에 하이픈(-)이나 공백을 쓸 수 없어요.');
        return;
      }
    }

    startTransition(async () => {
      const supabase = createClient();

      // 학생 닉네임 자동 생성: 반-번호-이름
      const nickname =
        role === 'student' ? `${classNum}-${studentNum}-${name.trim()}` : null;

      const metadata: Record<string, unknown> = { role };
      if (role === 'student') {
        metadata.class_num = classNum;
        metadata.student_num = studentNum;
        metadata.name = name.trim();
        metadata.nickname = nickname;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error('가입이 안 됐어요. 이메일을 확인하거나 다시 시도해주세요.');
        return;
      }

      toast.success(
        role === 'student'
          ? `가입됐어요! "${nickname}" 으로 토의에 참여하게 돼요.`
          : '가입됐어요! 이메일 인증 후 로그인해주세요.'
      );
      router.push('/login');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-3">
        <Label>역할</Label>
        <RadioGroup
          value={role}
          onValueChange={(v) => setRole(v as Role)}
          className="grid grid-cols-2 gap-3"
        >
          <label
            htmlFor="role-student"
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-0 px-4 py-3 cursor-pointer hover:bg-neutral-50 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
          >
            <RadioGroupItem value="student" id="role-student" />
            <span className="text-base font-medium text-neutral-800">학생</span>
          </label>
          <label
            htmlFor="role-teacher"
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-0 px-4 py-3 cursor-pointer hover:bg-neutral-50 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
          >
            <RadioGroupItem value="teacher" id="role-teacher" />
            <span className="text-base font-medium text-neutral-800">교사</span>
          </label>
        </RadioGroup>
        {role === 'teacher' && (
          <p className="text-xs text-warning-500">
            ※ 교사 권한은 별도 인증 후 부여됩니다. 현재 학생으로 가입됩니다.
          </p>
        )}
      </div>

      {/* 학생 전용 — 반/번호/이름 */}
      {role === 'student' && (
        <div className="space-y-4 rounded-lg bg-brand-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="class">반</Label>
              <select
                id="class"
                value={classNum}
                onChange={(e) => setClassNum(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-base text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}반
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="num">번호</Label>
              <select
                id="num"
                value={studentNum}
                onChange={(e) => setStudentNum(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-base text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {NUMBER_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}번
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              autoComplete="name"
              required
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김지혜"
            />
            <p className="text-xs text-neutral-600">
              모둠에서는{' '}
              <strong className="text-brand-700">
                {classNum}-{studentNum}-{name.trim() || '이름'}
              </strong>{' '}
              으로 보여요.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상"
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? '잠깐만요…' : '회원가입'}
      </Button>
    </form>
  );
}
