'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Step = 'code' | 'nickname';

export function JoinForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomInfo, setRoomInfo] = useState<{
    id: string;
    topic: string;
    current: number;
    max: number;
  } | null>(null);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.replace(/\s/g, '').toUpperCase();
    if (cleanCode.length !== 6) {
      toast.error('방 코드는 6자리예요.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('validate_room_code', {
        p_code: cleanCode,
      });

      if (error || !data || data.length === 0) {
        toast.error('그 코드의 방을 찾을 수 없어요. 다시 확인해주세요.');
        return;
      }

      const room = data[0];
      if (!room.joinable) {
        toast.error('지금은 입장할 수 없어요. 정원이 찼거나 토의가 진행 중일 수 있어요.');
        return;
      }

      setRoomInfo({
        id: room.id,
        topic: room.topic,
        current: room.current_count,
        max: room.max_participants,
      });
      setStep('nickname');
    });
  }

  async function handleNicknameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (cleanNick.length < 1 || cleanNick.length > 20) {
      toast.error('닉네임은 1자에서 20자 사이로 적어주세요.');
      return;
    }

    if (!roomInfo) return;

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

      const { error } = await supabase.from('participants').insert({
        room_id: roomInfo.id,
        user_id: user.id,
        role: 'student',
        nickname: cleanNick,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('이미 누가 쓰는 닉네임이에요. 다른 이름으로 해주세요.');
        } else {
          toast.error('입장이 안 됐어요. 다시 시도해주세요.');
        }
        return;
      }

      toast.success(`'${roomInfo.topic}' 방에 입장했어요!`);
      router.push(`/room/${roomInfo.id}`);
    });
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleCodeSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code" className="sr-only">
                방 코드
              </Label>
              <Input
                id="code"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="text-center font-mono text-2xl tracking-[0.5em] h-14"
                aria-label="6자리 방 코드"
              />
              <p className="text-xs text-neutral-400 text-center">
                대소문자 구분 없음 · 6자리 영숫자
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending || code.length !== 6}
            >
              {isPending ? '확인 중…' : '다음'}
            </Button>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <form onSubmit={handleNicknameSubmit}>
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1 p-3 rounded-lg bg-brand-50">
            <p className="text-xs text-brand-900 font-medium">토의 주제</p>
            <p className="text-base font-semibold text-neutral-900">{roomInfo!.topic}</p>
            <p className="text-xs text-neutral-600">
              현재 {roomInfo!.current}/{roomInfo!.max}명 입장
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">모둠에서 쓸 이름</Label>
            <Input
              id="nickname"
              autoComplete="off"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 모둠지기"
              autoFocus
            />
            <p className="text-xs text-neutral-400">실명 대신 닉네임을 써주세요.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep('code');
                setRoomInfo(null);
              }}
            >
              뒤로
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending || nickname.trim().length === 0}
            >
              {isPending ? '입장 중…' : '입장하기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
