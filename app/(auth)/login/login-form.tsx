'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // design.md §14.1 — 사과·행동 가능 톤
        toast.error('로그인이 안 됐어요. 이메일이나 비밀번호를 다시 확인해주세요.');
        return;
      }

      toast.success('환영해요!');
      const role = data.user?.user_metadata?.role ?? 'student';
      const redirect = searchParams.get('redirect');
      const target = redirect ?? (role === 'teacher' ? '/teacher' : '/join');
      router.push(target);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? '잠깐만요…' : '로그인'}
      </Button>
    </form>
  );
}
