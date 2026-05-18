'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  MessageSquareQuote,
  Clock,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  Hourglass,
  TrendingUp,
} from 'lucide-react';
import { useTeamMessages } from '@/lib/realtime/use-team-messages';
import { useOpinionsSync } from '@/lib/realtime/use-opinions-sync';
import { useBoardSync } from '@/lib/realtime/use-board-sync';
import { useRoomParticipants } from '@/lib/realtime/use-room-participants';
import { useConsensusSync } from '@/lib/realtime/use-consensus-sync';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonalChatViewer } from './personal-chat-viewer';
import type { Message } from '@/lib/db/types';

type Props = {
  roomId: string;
  sessionId: string;
  maxParticipants: number;
  consentedIds: string[]; // 개인 채팅 동의된 participant.id 목록
};

const SILENCE_WARN_MS = 90 * 1000; // 90초 침묵이면 경고

export function RoomLiveAnalytics({
  roomId,
  sessionId,
  maxParticipants,
  consentedIds,
}: Props) {
  const consentedSet = useMemo(() => new Set(consentedIds), [consentedIds]);
  const { participants } = useRoomParticipants(roomId);
  const { messages } = useTeamMessages(roomId);
  const { opinions } = useOpinionsSync(roomId);
  const { items: boardItems } = useBoardSync(roomId);
  const { result: consensus } = useConsensusSync(roomId, sessionId);

  const students = participants.filter((p) => p.role === 'student');

  // 발화량 계산
  const utteranceByNickname = useMemo(() => {
    const map = new Map<string, number>();
    messages
      .filter((m) => m.message_type === 'utterance' && m.author_nickname)
      .forEach((m) => {
        const k = m.author_nickname!;
        map.set(k, (map.get(k) ?? 0) + 1);
      });
    return map;
  }, [messages]);

  const totalUtterances = useMemo(
    () => messages.filter((m) => m.message_type === 'utterance').length,
    [messages]
  );

  const aiMessages = useMemo(
    () => messages.filter((m) => m.message_type !== 'utterance'),
    [messages]
  );

  const opinionsByAuthor = useMemo(() => {
    const map = new Map<string, number>();
    opinions.forEach((o) => {
      map.set(o.author_nickname, (map.get(o.author_nickname) ?? 0) + 1);
    });
    return map;
  }, [opinions]);

  const aiByFeature = useMemo(() => {
    const map = new Map<string, number>();
    aiMessages.forEach((m) => {
      if (!m.ai_feature) return;
      map.set(m.ai_feature, (map.get(m.ai_feature) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [aiMessages]);

  // 발화 균등도 (Gini 유사 — 표준편차/평균)
  const fairness = useMemo(() => {
    if (students.length < 2) return null;
    const counts = students.map((s) => utteranceByNickname.get(s.nickname) ?? 0);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (avg === 0) return null;
    const variance =
      counts.reduce((acc, x) => acc + (x - avg) ** 2, 0) / counts.length;
    const sd = Math.sqrt(variance);
    const cv = sd / avg; // 변동계수 (낮을수록 균등)
    return { cv, max: Math.max(...counts), min: Math.min(...counts), avg };
  }, [students, utteranceByNickname]);

  // 침묵 감지
  const lastUtteranceTime = useMemo(() => {
    const utt = messages.filter((m) => m.message_type === 'utterance');
    if (utt.length === 0) return null;
    return new Date(utt[utt.length - 1].created_at).getTime();
  }, [messages]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const silenceMs = lastUtteranceTime ? now - lastUtteranceTime : 0;
  const isSilent = lastUtteranceTime && silenceMs > SILENCE_WARN_MS;

  return (
    <div className="space-y-6">
      {/* 핵심 지표 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="입장 인원"
          value={`${students.length}/${maxParticipants}`}
          accent="brand"
        />
        <MetricCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="총 발화"
          value={totalUtterances.toString()}
        />
        <MetricCard
          icon={<MessageSquareQuote className="h-4 w-4" />}
          label="의견 카드"
          value={opinions.length.toString()}
        />
        <MetricCard
          icon={<Sparkles className="h-4 w-4" />}
          label="AI 호출"
          value={aiMessages.length.toString()}
          accent="ai"
        />
      </section>

      {/* 침묵 알림 + 합의 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className={isSilent ? 'border-warning-500' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            {isSilent ? (
              <Hourglass className="h-5 w-5 text-warning-500" />
            ) : (
              <Clock className="h-5 w-5 text-neutral-400" />
            )}
            <div className="flex-1">
              <div className="text-xs text-neutral-600">마지막 학생 발화</div>
              <div className={`text-sm font-semibold ${isSilent ? 'text-warning-500' : 'text-neutral-800'}`}>
                {lastUtteranceTime
                  ? formatElapsed(silenceMs)
                  : '아직 발화 없음'}
              </div>
            </div>
            {isSilent && (
              <Badge variant="warning" className="text-xs">
                <AlertTriangle className="h-3 w-3" />
                침묵
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card className={consensus ? 'border-success-500' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            {consensus ? (
              <CheckCircle2 className="h-5 w-5 text-success-500" />
            ) : (
              <LayoutGrid className="h-5 w-5 text-neutral-400" />
            )}
            <div className="flex-1">
              <div className="text-xs text-neutral-600">합의 제출</div>
              <div className="text-sm font-semibold text-neutral-800">
                {consensus ? '제출 완료' : '진행 중'}
              </div>
            </div>
            {fairness && fairness.avg > 0 && (
              <Badge variant={fairness.cv < 0.5 ? 'success' : 'muted'} className="text-xs">
                <TrendingUp className="h-3 w-3" />
                균등도 {(Math.max(0, 1 - fairness.cv) * 100).toFixed(0)}%
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 학생별 발화량 */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-base font-semibold text-neutral-900">학생별 활동</h3>
          {students.length === 0 ? (
            <p className="text-sm text-neutral-400">아직 입장한 학생이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {students.map((p) => {
                const utterances = utteranceByNickname.get(p.nickname) ?? 0;
                const opinionCount = opinionsByAuthor.get(p.nickname) ?? 0;
                const maxUtt = Math.max(
                  1,
                  ...Array.from(utteranceByNickname.values())
                );
                const pct = (utterances / maxUtt) * 100;
                const consented = consentedSet.has(p.id);
                return (
                  <li key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-neutral-800 truncate flex-1">
                        {p.nickname}
                      </span>
                      <span className="text-xs text-neutral-600 shrink-0">
                        발화 <strong>{utterances}</strong> · 의견{' '}
                        <strong>{opinionCount}</strong>
                      </span>
                      {consented && (
                        <PersonalChatViewer
                          participantId={p.id}
                          nickname={p.nickname}
                        />
                      )}
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-500 h-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* AI 호출 분포 */}
      {aiByFeature.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-base font-semibold text-neutral-900">
              AI 기능 호출
            </h3>
            <ul className="space-y-1.5">
              {aiByFeature.map(([feature, count]) => (
                <li key={feature} className="flex justify-between text-sm">
                  <span className="text-neutral-800">{featureLabel(feature)}</span>
                  <span className="text-neutral-600">{count}회</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 실시간 채팅 미니뷰 */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-base font-semibold text-neutral-900">
            팀 채팅 미니뷰 (최신 {Math.min(messages.length, 30)}개)
          </h3>
          {messages.length === 0 ? (
            <p className="text-sm text-neutral-400">아직 메시지가 없어요.</p>
          ) : (
            <ScrollArea className="h-72 -mx-2">
              <div className="px-2 space-y-2">
                {messages.slice(-30).map((m) => (
                  <MiniMessage key={m.id} message={m} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 의견 카드 + 보드 진척도 */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-base font-semibold text-neutral-900">
            보드 진척도
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <BoardProgressCell
              label="의견 비교"
              count={boardItems.filter((b) => b.type === 'compare').length}
            />
            <BoardProgressCell
              label="선택 기준"
              count={boardItems.filter((b) => b.type === 'criteria').length}
            />
            <BoardProgressCell
              label="쟁점"
              count={boardItems.filter((b) => b.type === 'issue').length}
            />
            <BoardProgressCell
              label="대표 의견 후보"
              count={boardItems.filter((b) => b.type === 'representative').length}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-2xs text-neutral-400 italic text-center">
        모든 지표는 학생 활동에 따라 실시간으로 갱신됩니다.
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'brand' | 'ai';
}) {
  const color =
    accent === 'brand'
      ? 'text-brand-600'
      : accent === 'ai'
      ? 'text-ai-500'
      : 'text-neutral-800';
  return (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-1 text-2xs text-neutral-600">
          {icon}
          {label}
        </div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function MiniMessage({ message: m }: { message: Message }) {
  const isAi = m.message_type !== 'utterance';
  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-xs ${
        isAi
          ? 'bg-ai-50 border-ai-200'
          : 'bg-neutral-50 border-neutral-200'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-2xs font-semibold ${
            isAi ? 'text-ai-text' : 'text-neutral-600'
          }`}
        >
          {isAi
            ? `AI · ${featureLabel(m.ai_feature ?? 'facilitation')}`
            : m.author_nickname ?? '?'}
        </span>
        <span className="text-2xs text-neutral-400">
          {new Date(m.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="text-neutral-800 whitespace-pre-wrap line-clamp-3">
        {m.content}
      </div>
    </div>
  );
}

function BoardProgressCell({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 text-center">
      <div className="text-2xs text-neutral-600">{label}</div>
      <div className="text-base font-semibold text-neutral-800">{count}</div>
    </div>
  );
}

function featureLabel(f: string): string {
  return (
    {
      facilitation: '진행',
      summary: '정리하기',
      compare: '의견 비교',
      evidence_check: '근거 확인',
      question_gen: '질문 만들기',
      attitude_check: '태도 점검',
      consensus_aid: '합의 돕기',
      coaching: '개인 코칭',
    } as Record<string, string>
  )[f] ?? f;
}

function formatElapsed(ms: number): string {
  if (ms < 60 * 1000) return `${Math.floor(ms / 1000)}초 전`;
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / 60000)}분 전`;
  return `${Math.floor(ms / 3600000)}시간 전`;
}
