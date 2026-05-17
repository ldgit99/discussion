---
name: realtime-sync-patterns
description: Canonical Supabase Realtime channel patterns for the 4-student discussion room — presence, opinion sync, board co-edit, AI broadcast, and optimistic concurrency. Use whenever implementing or modifying any real-time sync code (lib/realtime/) in this project.
---

## 목적

[research.md §9.3, §3 채팅 모드](../../../research.md) 의 실시간 토의방(팀+개인 채팅)을 Supabase Realtime로 구현하는 일관된 패턴 정의.

## 핵심 원칙

- **이유**: 2-5명의 학생이 동시에 의견을 등록·편집하고 개인/팀 채팅을 오가므로, 채널 분리와 가시성 격리가 학생 사고 보호의 핵심.
- **린 유지**: 팀 채널은 모둠당 1개로 통합. 개인 채널은 학생별 1개. 그 외 추가 채널 금지.

## 채널 구조

세 종류의 채널:

```
// 1. 팀 채널 (모둠 전원 + 교사)
const teamCh = supabase.channel(`room:${roomId}:team`)
  .on('postgres_changes', { ... table: 'messages', filter: `room_id=eq.${roomId}&channel=eq.team` }, ...)
  .on('postgres_changes', { ... table: 'opinions' ... }, ...)
  .on('postgres_changes', { ... table: 'board_items' ... }, ...)
  .on('postgres_changes', { ... table: 'consensus_results' ... }, ...)
  .on('broadcast', { event: 'ai' }, ...)
  .on('presence', { event: 'sync' }, ...)
  .subscribe(...);

// 2. 개인 채널 (본인만)
const personalCh = supabase.channel(`room:${roomId}:personal:${participantId}`)
  .on('postgres_changes', { ... table: 'messages', filter: `room_id=eq.${roomId}&channel=eq.personal:${participantId}` }, ...)
  .on('broadcast', { event: 'ai' }, ...)
  .subscribe(...);

// 3. 교사 채널 (담당 교사만)
const teacherCh = supabase.channel(`teacher:${teacherId}`)
  .on('postgres_changes', { ... table: 'attitude_flags' ... }, ...)
  .on('postgres_changes', { ... table: 'consensus_results', filter: `teacher_id=eq.${teacherId}` }, ...)
  .subscribe(...);
```

**가시성 격리**: 개인 채널은 본인 외 누구도 subscribe 금지. RLS로 강제하되, 클라이언트 코드에서도 다른 학생의 personal 채널을 subscribe하는 코드 차단.

## 훅 인터페이스 (frontend-builder가 소비)

- `useTeamChannel(roomId)` — 팀 채널 인스턴스 반환, cleanup 포함.
- `usePersonalChannel(roomId, participantId)` — 개인 채널 인스턴스, 본인 확인 후 subscribe.
- `useTeacherChannel(teacherId)` — 교사 채널 (alerts, 결과 제출 broadcast).
- `useTeamMessages(roomId)` — 팀 채팅 메시지 + AI 진행자 발화 통합.
- `usePersonalMessages(roomId, participantId)` — 개인 채팅 메시지 + AI 코치 발화.
- `useOpinionsSync(roomId)` — `{ opinions, addOpinion, updateOpinion, deleteOpinion, shareFromPersonal }`
- `useBoardSync(roomId)` — `{ items, upsertItem, deleteItem }`
- `useAiBroadcast(roomId, channel: 'team' | `personal:${pid}`)` — 채널별 AI 메시지 구독.
- `usePresence(roomId, nickname)` — `{ online: string[], count: number, max: number }` (가변 인원).
- `useConsensusSync(roomId)` — `{ result, save, submit }` — `submit`은 교사 채널로 broadcast 트리거.
- `useResultSubmissions(teacherId)` — 교사 대시보드용. 모든 담당 모둠의 `consensus_results` 실시간 누적.

훅은 모두 `"use client"` 컴포넌트에서만 호출.

## 낙관적 동시성 (Optimistic Concurrency)

1. 사용자 액션 즉시 로컬 상태 업데이트.
2. Supabase insert/update 요청.
3. 성공 시 `postgres_changes` 이벤트로 다른 클라이언트 동기화 (본인 클라이언트도 멱등 처리).
4. 실패 시 로컬 상태 롤백 + 토스트.

**충돌 해소**: 같은 카드에 동시 update는 마지막 쓰기 우선(`updated_at` 비교). UI에 "방금 다른 친구가 수정했어요" 토스트.

## Presence 활용

- `n/N 접속` 헤더 표시. N은 `rooms.max_participants` (기본 5).
- 토의 시작 조건: `n >= rooms.min_participants` (기본 2).
- 침묵 학생 감지: 마지막 발화 시각이 N분 초과 + presence online 인 학생.
- heartbeat 30초.

## AI 브로드캐스트 페이로드

```typescript
type AiBroadcast = {
  feature: 'facilitation' | 'coaching' | 'summary' | 'compare' | 'evidence-check' | 'question-gen' | 'attitude-check' | 'consensus-aid';
  channel: 'team' | `personal:${string}`;
  triggered_by: 'student' | 'auto' | 'turn-transition' | 'room-start';
  payload: unknown; // 기능별 스키마
  message_id: string; // ai_messages.id
  created_at: string;
};
```

- `facilitation`: 토의 진행자 발화 (시작 안내, 턴 안내, 근거 요구) — 팀 채널만.
- `coaching`: 개인 채팅 코치 발화 — 개인 채널만.
- 페이로드 스키마 변경은 `ai-feature-developer` + `realtime-engineer` 둘 다 동의 필요.

## 교사 채널 (별도)

- 채널: `teacher:${teacherId}`
- 구독 대상: 본인 담당 모든 `rooms`의 요약 이벤트 + `attitude_flags` + `consensus_results` 제출 알림.
- 학생 모둠 채널과 분리 (attitude_flags 학생 비노출 보장).
- 학생이 `[결과 저장]` 클릭 시 교사 대시보드 하단 보드([research.md §4.3](../../../research.md))에 즉시 행 추가.

## 결과 제출 → 교사 대시보드 흐름

```
학생 [결과 저장] 클릭
   ↓
consensus_results insert (RLS 통과)
   ↓
서버 trigger 또는 RPC가 teacher:{teacher_id} 채널에 broadcast
   ↓
교사 대시보드 useResultSubmissions 훅이 신규 row 수신
   ↓
하단 보드에 행 추가 (애니메이션)
```

## 금지 사항

- 팀 채널 다중 생성 금지 (모둠당 1개).
- 본인 외 다른 학생의 개인 채널 subscribe 금지.
- 클라이언트에서 직접 `attitude_flags` 구독 금지 — 교사 채널 경유.
- 학생 발화를 클라이언트에서 묶어서 단일 텍스트로 전송 금지 (author_id 보존 위반).
- presence를 의견 등록 트리거로 사용 금지 (presence는 부정확함).
- 개인 채팅 내용을 자동으로 팀 채널로 broadcast 금지 — `opinions.shared_from_personal=true`로 학생 명시 액션만.
