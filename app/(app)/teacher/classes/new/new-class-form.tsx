'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function NewClassForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [grade, setGrade] = useState(3);
  const [classNum, setClassNum] = useState(1);
  const [name, setName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 만료됐어요.');
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('classes')
        .insert({
          teacher_id: user.id,
          grade,
          class_num: classNum,
          name: name.trim() || null,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('이미 같은 학년·반이 등록돼 있어요.');
        } else {
          toast.error('학급을 만들지 못했어요. 다시 시도해주세요.');
        }
        return;
      }
      toast.success(`${grade}-${classNum}반이 만들어졌어요.`);
      router.push(`/teacher/classes/${(data as { id: string }).id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="grade">학년</Label>
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-base text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classnum">반</Label>
              <select
                id="classnum"
                value={classNum}
                onChange={(e) => setClassNum(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-base text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}반
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">반 별칭 (선택)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 햇살반"
              maxLength={40}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? '만드는 중…' : '학급 만들기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
