'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Step = 'code' | 'confirm';

type RoomInfo = {
  id: string;
  topic: string;
  current: number;
  max: number;
};

export function JoinForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  // 로그인된 학생의 자동 닉네임 가져오기
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const nick = user?.user_metadata?.nickname as string | undefined;
      setNickname(nick ?? null);
    })();
  }, []);

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
      setStep('confirm');
    });
  }

  async function handleJoin() {
    if (!roomInfo) return;
    if (!nickname) {
      toast.error('학생 정보가 완성되지 않았어요. 회원가입을 다시 해주세요.');
      router.push('/signup');
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

      const { error } = await supabase.from('participants').insert({
        room_id: roomInfo.id,
        user_id: user.id,
        role: 'student',
        nickname,
      });

      if (error) {
        console.error('[join] participants insert failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          user_id: user.id,
          room_id: roomInfo.id,
          nickname,
          user_meta_role: user.user_metadata?.role,
        });
        if (error.code === '23505') {
          // unique constraint: 같은 방에 이미 입장됨
          toast.success('이미 입장된 모둠이에요. 바로 이동할게요.');
          router.push(`/room/${roomInfo.id}`);
          return;
        }
        toast.error(`입장 실패: ${error.message}`);
        return;
      }

      toast.success(`'${roomInfo.topic}' 모둠에 입장했어요!`);
      router.push(`/room/${roomInfo.id}`);
    });
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleCodeSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            {nickname && (
              <p className="text-sm text-neutral-600 text-center">
                나는 <strong className="text-brand-700">{nickname}</strong> 으로 참여해요.
              </p>
            )}

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

  // confirm step
  return (
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
          <p className="text-sm text-neutral-600">모둠에 표시될 이름</p>
          <div className="rounded-lg border border-neutral-200 px-4 py-3 bg-neutral-50">
            <p className="text-lg font-semibold text-brand-700">
              {nickname ?? '이름 정보 없음'}
            </p>
          </div>
          {!nickname && (
            <p className="text-xs text-warning-500">
              학생 정보(반/번호/이름)가 없어요. 회원가입을 다시 해주세요.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setStep('code');
              setRoomInfo(null);
              setCode('');
            }}
          >
            뒤로
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleJoin}
            disabled={isPending || !nickname}
          >
            {isPending ? '입장 중…' : '입장하기'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
