'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function NewRoomForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [topic, setTopic] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [timeLimit, setTimeLimit] = useState(30);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 5) {
      toast.error('토의 주제는 5자 이상으로 적어주세요.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 만료됐어요. 다시 로그인해주세요.');
        router.push('/login');
        return;
      }

      // 방 코드 생성 RPC
      const { data: code, error: codeError } = await supabase.rpc('generate_room_code');
      if (codeError || !code) {
        toast.error('방 코드를 만들지 못했어요. 다시 시도해주세요.');
        return;
      }

      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          room_code: code,
          topic: topic.trim(),
          teacher_id: user.id,
          max_participants: maxParticipants,
          time_limit_minutes: timeLimit,
          stage: 'waiting',
        })
        .select('id')
        .single();

      if (error || !room) {
        toast.error('방을 만들지 못했어요. 다시 시도해주세요.');
        return;
      }

      toast.success(`방이 만들어졌어요! 코드: ${code}`);
      router.push('/teacher');
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="topic">토의 주제</Label>
            <Input
              id="topic"
              required
              minLength={5}
              maxLength={200}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 학교 점심 시간을 늘려야 할까?"
            />
            <p className="text-xs text-neutral-400">학생들에게 보이는 핵심 질문이에요.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max">최대 인원</Label>
              <Input
                id="max"
                type="number"
                min={2}
                max={5}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
              <p className="text-xs text-neutral-400">2-5명 사이.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">제한 시간 (분)</Label>
              <Input
                id="time"
                type="number"
                min={10}
                max={120}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? '만드는 중…' : '방 만들기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
