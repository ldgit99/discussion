import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Clock, MessageSquareQuote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PersonalChatViewer } from './personal-chat-viewer';

export default async function TeacherRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: room } = await supabase
    .from('rooms')
    .select('id, room_code, topic, stage, max_participants, time_limit_minutes')
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .maybeSingle();

  if (!room) notFound();

  const { data: participants } = await supabase
    .from('participants')
    .select('id, user_id, nickname, role, joined_at')
    .eq('room_id', id)
    .order('joined_at', { ascending: true });

  // 발화량 집계 (팀 채널 utterance만)
  const { data: msgs } = await supabase
    .from('messages')
    .select('author_id')
    .eq('room_id', id)
    .eq('channel', 'team')
    .eq('message_type', 'utterance');

  const utteranceCount = new Map<string, number>();
  (msgs ?? []).forEach((m) => {
    const aid = (m as { author_id: string | null }).author_id;
    if (aid) utteranceCount.set(aid, (utteranceCount.get(aid) ?? 0) + 1);
  });

  // 의견 카드 수
  const { count: opinionsCount } = await supabase
    .from('opinions')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', id);

  // 동의된 개인 채팅 참가자 id 목록
  const studentParticipants = (participants ?? []).filter(
    (p) => (p as { role: string }).role === 'student'
  );
  const studentIds = studentParticipants.map((p) => (p as { id: string }).id);

  const { data: consents } =
    studentIds.length > 0
      ? await supabase
          .from('personal_chat_consent')
          .select('participant_id, teacher_view_allowed')
          .in('participant_id', studentIds)
      : { data: [] as { participant_id: string; teacher_view_allowed: boolean }[] };

  const consentedSet = new Set(
    (consents ?? [])
      .filter((c) => (c as { teacher_view_allowed: boolean }).teacher_view_allowed)
      .map((c) => (c as { participant_id: string }).participant_id)
  );

  return (
    <main className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teacher">
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
      </Button>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{(room as { topic: string }).topic}</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <code className="font-mono font-bold text-brand-600">
            {(room as { room_code: string }).room_code}
          </code>
          <Badge variant="muted">{stageLabel((room as { stage: string }).stage)}</Badge>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {studentParticipants.length}/{(room as { max_participants: number }).max_participants}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquareQuote className="h-4 w-4" />
            의견 {opinionsCount ?? 0}개
          </span>
          {(room as { time_limit_minutes: number | null }).time_limit_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {(room as { time_limit_minutes: number }).time_limit_minutes}분
            </span>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">참여자 + 발화량</h2>
          {studentParticipants.length === 0 ? (
            <p className="text-sm text-neutral-600">아직 입장한 학생이 없어요.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th className="py-2 pr-3">닉네임</th>
                  <th className="py-2 pr-3">팀 발화 수</th>
                  <th className="py-2 pr-3">개인 채팅 열람</th>
                  <th className="py-2 pr-3">입장 시각</th>
                </tr>
              </thead>
              <tbody>
                {studentParticipants.map((p) => {
                  const part = p as { id: string; user_id: string; nickname: string; joined_at: string };
                  const count = utteranceCount.get(part.user_id) ?? 0;
                  const consented = consentedSet.has(part.id);
                  return (
                    <tr key={part.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-3 font-medium text-neutral-800">{part.nickname}</td>
                      <td className="py-2 pr-3 text-neutral-600">{count}</td>
                      <td className="py-2 pr-3">
                        {consented ? (
                          <PersonalChatViewer participantId={part.id} nickname={part.nickname} />
                        ) : (
                          <span className="text-xs text-neutral-400">동의 안 됨</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-neutral-400">
                        {new Date(part.joined_at).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-sm text-neutral-600 italic">
          실시간 채팅 미니뷰는 다음 단계에서 추가됩니다. 현재는 모둠 결과 + 발화량
          + 동의된 개인 채팅 사후 조회만 지원합니다.
        </CardContent>
      </Card>
    </main>
  );
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    waiting: '대기 중',
    intro: '안내 중',
    turn_taking: '의견 발표',
    discussion: '토의 중',
    consensus: '합의 중',
    submitted: '제출 완료',
    closed: '종료',
  };
  return labels[stage] ?? stage;
}
