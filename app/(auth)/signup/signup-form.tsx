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

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상으로 만들어주세요.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // research.md §9.6.4 — role은 트리거가 강제 검증. 학생이 'teacher' 자가 지정 시도해도 차단됨.
          data: { role },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error('가입이 안 됐어요. 이메일을 확인하거나 다시 시도해주세요.');
        return;
      }

      toast.success('가입됐어요! 이메일 인증 후 로그인해주세요.');
      router.push('/login');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? '잠깐만요…' : '회원가입'}
      </Button>
    </form>
  );
}
