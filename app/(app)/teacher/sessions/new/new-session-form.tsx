'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Layers, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function NewSessionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [topic, setTopic] = useState('');
  const [totalStudents, setTotalStudents] = useState(24);
  const [groupSize, setGroupSize] = useState(5);
  const [timeLimit, setTimeLimit] = useState(30);

  const numRooms = useMemo(
    () => Math.max(1, Math.ceil(totalStudents / groupSize)),
    [totalStudents, groupSize]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 5) {
      toast.error('토의 주제는 5자 이상으로 적어주세요.');
      return;
    }
    if (totalStudents < 2 || totalStudents > 150) {
      toast.error('학생 수는 2명에서 150명 사이로 입력해주세요.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('create_session_with_rooms', {
        p_topic: topic.trim(),
        p_total_students: totalStudents,
        p_group_size: groupSize,
        p_time_limit_minutes: timeLimit,
      });

      if (error || !data) {
        console.error('create_session_with_rooms error:', error);
        toast.error('수업을 만들지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }

      // RETURNS JSONB: { session_id, num_rooms, rooms: [...] }
      const result = data as {
        session_id: string;
        num_rooms: number;
        rooms: Array<{ room_id: string; room_code: string; room_index: number; capacity: number }>;
      };

      toast.success(`수업이 만들어졌어요! 모둠 ${result.num_rooms}개`);
      router.push(`/teacher/sessions/${result.session_id}`);
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
              <Label htmlFor="total">전체 학생 수</Label>
              <Input
                id="total"
                type="number"
                min={2}
                max={150}
                value={totalStudents}
                onChange={(e) => setTotalStudents(Number(e.target.value))}
              />
              <p className="text-xs text-neutral-400">반 전체 인원</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">모둠당 인원</Label>
              <Input
                id="group"
                type="number"
                min={2}
                max={5}
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
              />
              <p className="text-xs text-neutral-400">2-5명 사이</p>
            </div>
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

          {/* 자동 계산 미리보기 */}
          <div className="rounded-lg bg-brand-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-brand-900">자동으로 만들어질 내용</p>
            <div className="flex items-center gap-4 text-sm text-neutral-800">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-brand-600" />
                모둠 <strong>{numRooms}개</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-600" />
                평균 {Math.ceil(totalStudents / numRooms)}명/모둠
              </span>
            </div>
            <p className="text-xs text-neutral-600">
              각 모둠마다 6자리 코드가 만들어지고, 학생들에게 나눠주면 돼요.
            </p>
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
              {isPending ? '만드는 중…' : '수업 만들기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
