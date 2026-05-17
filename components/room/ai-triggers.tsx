'use client';

import { useEffect, useRef } from 'react';

/**
 * 자동 AI 트리거:
 *   - 학생 첫 입장 후 한 번만 facilitation(room_start) 호출
 *   - 새 의견 등록 직후 evidence_check 호출
 *
 * 빈도 제한 (CLAUDE.md C8): 모둠당 자동 호출 3분에 1회 (room_start 예외, 매 의견 evidence는 예외 — 학생 액션 직후라 허용)
 */
type Props = {
  roomId: string;
  opinionsCount: number;
  latestOpinionId: string | null;
  latestOpinionAuthorId: string | null;
  myUserId: string;
};

const RECENT_OPINION_KEY = 'last_evidence_opinion';

export function AiTriggers({
  roomId,
  opinionsCount,
  latestOpinionId,
  latestOpinionAuthorId,
  myUserId,
}: Props) {
  const startedRef = useRef(false);
  const lastEvidenceRef = useRef<string | null>(null);

  // 방 첫 진입 시 1회 facilitation
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

  // 새 의견 등록 직후 evidence_check (본인이 등록한 의견에만)
  useEffect(() => {
    if (!latestOpinionId) return;
    if (latestOpinionAuthorId !== myUserId) return;
    if (lastEvidenceRef.current === latestOpinionId) return;
    lastEvidenceRef.current = latestOpinionId;

    // 세션 스토리지로 중복 호출 방지 (페이지 새로고침 대비)
    const key = `${RECENT_OPINION_KEY}:${roomId}:${latestOpinionId}`;
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

  // 무 카운트 의존성을 위해 reference (lint quiet)
  void opinionsCount;

  return null;
}
