'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/db/types';

/**
 * 자동 AI 트리거:
 *   - 학생 첫 입장 후 facilitation(room_start) 1회 (sessionStorage 가드)
 *   - 본인 의견 등록 직후 evidence_check 자동 호출
 *   - M분 정체 감지 → question_gen 자동 권유 (1회만)
 *   - 비방 키워드 감지 → attitude_check 자동 호출
 *
 * CLAUDE.md C8: 모둠당 자동 호출 3분에 1회 (facilitation 턴 전환, attitude 갈등 감지는 예외)
 */

const SILENCE_MINUTES = 3;

const ATTITUDE_KEYWORDS = ['바보', '멍청', '미친', '꺼져', '닥쳐', '죽어', '쓰레기', '재수없', '한심'];

type Props = {
  roomId: string;
  opinionsCount: number;
  latestOpinionId: string | null;
  latestOpinionAuthorId: string | null;
  myUserId: string;
  /** 팀 채널의 최근 메시지들 (정체·갈등 감지용) */
  teamMessages: Message[];
};

export function AiTriggers({
  roomId,
  opinionsCount,
  latestOpinionId,
  latestOpinionAuthorId,
  myUserId,
  teamMessages,
}: Props) {
  const startedRef = useRef(false);
  const lastEvidenceRef = useRef<string | null>(null);
  const lastFlaggedRef = useRef<string | null>(null);
  const lastSilenceRef = useRef<number>(0);

  // 1) 방 첫 진입 시 1회 facilitation
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const key = `ai_room_started:${roomId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1');

    fetch('/api/ai/facilitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, trigger: 'room_start' }),
    }).catch(() => {});
  }, [roomId]);

  // 2) 본인 의견 등록 시 evidence_check
  useEffect(() => {
    if (!latestOpinionId) return;
    if (latestOpinionAuthorId !== myUserId) return;
    if (lastEvidenceRef.current === latestOpinionId) return;
    lastEvidenceRef.current = latestOpinionId;

    const key = `last_evidence_opinion:${roomId}:${latestOpinionId}`;
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    }

    fetch('/api/ai/evidence-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, opinionId: latestOpinionId }),
    }).catch(() => {});
  }, [latestOpinionId, latestOpinionAuthorId, myUserId, roomId]);

  // 3) 정체 감지 — 마지막 학생 발화가 SILENCE_MINUTES분 이상 전이면 question_gen 1회
  useEffect(() => {
    const utterances = teamMessages.filter((m) => m.message_type === 'utterance');
    const last = utterances[utterances.length - 1];
    if (!last) return;

    const lastTime = new Date(last.created_at).getTime();
    const now = Date.now();
    const silenceMs = now - lastTime;
    const cutoffMs = SILENCE_MINUTES * 60 * 1000;

    if (silenceMs < cutoffMs) return;
    // 같은 정체 구간에 중복 호출 방지 (마지막 호출 시점이 같은 구간이면 skip)
    if (lastSilenceRef.current === lastTime) return;
    lastSilenceRef.current = lastTime;

    const sessionKey = `ai_silence:${roomId}:${last.id}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) return;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(sessionKey, '1');

    fetch('/api/ai/question-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, channel: 'team' }),
    }).catch(() => {});
  }, [teamMessages, roomId]);

  // 4) 비방 키워드 감지 — 최근 메시지에 키워드 있으면 attitude_check 호출 (메시지당 1회)
  useEffect(() => {
    const utterances = teamMessages.filter((m) => m.message_type === 'utterance');
    const recent = utterances[utterances.length - 1];
    if (!recent) return;
    if (lastFlaggedRef.current === recent.id) return;

    const lower = recent.content.toLowerCase();
    const hit = ATTITUDE_KEYWORDS.find((k) => lower.includes(k));
    if (!hit) return;
    lastFlaggedRef.current = recent.id;

    const sessionKey = `ai_attitude:${roomId}:${recent.id}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) return;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(sessionKey, '1');

    fetch('/api/ai/attitude-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        flaggedMessageText: recent.content,
        flaggedMessageId: recent.id,
        detectedBy: 'keyword',
      }),
    }).catch(() => {});
  }, [teamMessages, roomId]);

  void opinionsCount;
  return null;
}
