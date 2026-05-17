# discussion — Claude Code 프로젝트 가이드

**무엇을 만드는가**: 중학생(만 13-15세) 2-5명이 한 모둠으로 온라인에서 토의·합의에 도달하도록 돕는 **Human-AI Agency 기반 AI 보조 시스템**. 전체 사양은 [research.md](./research.md), 4주 실행 계획은 [plan.md](./plan.md), 디자인 시스템은 [design.md](./design.md).

---

## 하네스: 공동 토의 지원 AI

**트리거:** 토의방, 팀 채팅, 개인 채팅, 의견 카드, 공동 보드, AI 패널, 모둠, 합의, 회원가입, 로그인, Supabase, Realtime, 프롬프트 관련 변경 요청 시 `discussion-orchestrator` 스킬 사용. (단순 질문은 직접 응답.)

**구조:**
- 에이전트: [.claude/agents/](./.claude/agents/) — 전문가 4 (frontend / realtime / db / ai-feature) + 검토자 2 (agency-guardian / pedagogy-reviewer)
- 스킬: [.claude/skills/](./.claude/skills/) — discussion-orchestrator / ai-feature-guards / supabase-schema-patterns / realtime-sync-patterns
- 중간 산출물: [_workspace/](./_workspace/)

---

## 작업 규칙 (Work Rules)

### W1. 변경 요청은 항상 오케스트레이터를 통한다
- UI·실시간·DB·AI·인증 어디든 변경이 발생하면 [discussion-orchestrator](./.claude/skills/discussion-orchestrator/SKILL.md) 라우팅 규칙을 따른다.
- 6명 정의 에이전트 외 임의 에이전트 신설 금지. 영역이 새로 필요하면 본 가이드 + 에이전트 추가 PR로.

### W2. AI 관련 변경은 검토자 게이트를 통과해야 한다
- `lib/ai/**`, `app/api/ai/**`, AI 프롬프트, 학생/교사 노출 카피 변경 시:
  - **AI 코드·프롬프트** → `agency-guardian` 통과 필수 (병합 차단권).
  - **노출 카피** → `pedagogy-reviewer` 통과 필수 (병합 차단권).
- 자동 트리거 빈도·조건 변경은 **둘 다** 통과.

### W3. 사양 충돌 시 우선순위
`research.md` > `plan.md` > 본 가이드 > 에이전트/스킬 정의. 충돌 발견 시 상위 문서를 먼저 수정한 뒤 하위에 전파.

### W4. 작업 순서
다중 영역 변경은 의존 순서 강제: db-architect → realtime-engineer → ai-feature-developer → frontend-builder → 검토자.

### W5. 변경 이력은 본 파일 하단에
스키마·아키텍처·프롬프트·작업 규칙 변경은 본 파일의 **변경 이력** 표에 1줄 추가. 상세는 PR이나 `_workspace/` 로그로.

### W6. 중간 산출물은 `_workspace/`에
검토 로그, 프롬프트 반복본, 임시 분석은 [_workspace/](./_workspace/)에. 운영 코드와 분리.

---

## 제약 사항 (Constraints) — 비협상

### C1. Agency 보존 (절대) — [research.md §1.2, §5.1](./research.md)
1. **AI는 학생 의견을 생성하지 않는다.** 학생 입력 가공·재구성만.
2. **AI는 평가하지 않는다.** "맞다/틀리다", "더 좋다" 금지. 질문으로 환원.
3. **AI는 결정하지 않는다.** 합의문·대표 의견을 직접 작성 금지.
4. **AI는 학생을 비난하지 않는다.** 표현에만 대안 제시, 인격 평가 금지.

위반 시 코드/프롬프트는 무조건 차단.

### C2. 8개 AI 기능 허용/제한 범위 — [research.md §4.4](./research.md)

| 기능 | 채널 | 제한 (시스템 프롬프트 가드 필수) |
|------|------|------------------------------|
| 토의 진행 (facilitation) | 팀 | 의견 평가·정답 제시 금지 |
| 개인 코칭 (coaching) | 개인 | 학생 대신 답안 작성, 다른 학생 의견 누설 금지 |
| 요약 | 팀/개인 | 없는 의견 추가 금지 |
| 비교 | 팀 | 대표 의견 선택 금지 |
| 근거 점검 | 팀/개인 | 근거 대신 작성 금지 |
| 질문 생성 | 팀/개인 | 공격적·인신공격 질문 금지 |
| 태도 점검 | 팀 | 학생 비난·인격 평가 금지 |
| 합의 보조 | 팀 | 최종 결정 금지 |

8개 모두 [ai-feature-guards](./.claude/skills/ai-feature-guards/SKILL.md) 공통 헤더 포함 + 후처리 검증 함수 통과 필수.

### C3. 채팅 가시성 격리 — [research.md §3, §4.2](./research.md)
- **팀 채널** (`team`): 모둠 전원 + 교사 read.
- **개인 채널** (`personal:{pid}`): 본인만 실시간 read. 교사는 `personal_chat_consent.teacher_view_allowed=true`인 경우 **사후 RPC**로만.
- 다른 학생의 개인 채널 실시간 subscribe 금지 (RLS + 클라이언트 가드 둘 다).
- 개인 채팅 LLM 호출 컨텍스트에 다른 학생 발화·닉네임 포함 금지.
- 개인 → 팀 전파는 학생 명시 "팀에 공유" 액션만 (`opinions.shared_from_personal=true`).

### C4. 모둠 인원 및 수업 구조 — [research.md §1.1, §1.3, §9.4](./research.md)
- 모둠(Room)당 **2-5명** 가변. min(2) 미만이면 토의 시작 차단, max(5) 초과 입장 차단. UI에 `n/N` 형태로 표기.
- **모든 모둠은 수업(Session)에 속함**. 단독 모둠 생성 금지 — `rooms.session_id` NOT NULL.
- 한 수업 = 한 차시 토의. 교사가 수업 1개 만들면 학생 수·모둠당 인원 입력에 따라 모둠 N개 + 코드 N개 자동 발급.

### C5. 심리적 안전감 — [research.md §5.3](./research.md)
- **부정 피드백 → 비공개** (개인 알림). **긍정 피드백 → 공개**.
- "틀린 의견" 어휘 금지 → "다른 관점", "검토할 부분".
- 발화량 비교는 본인에게만, 학생 간 비교 노출 금지.
- 침묵 학생 환기는 부드러운 표현, 강요 금지.

### C6. 교사 권한 우선 — [research.md §5.4](./research.md)
- 교사는 언제든 AI 개입을 중지/재개 가능.
- 교사 RLS는 본인 담당 모둠에 한정 (`rooms.teacher_id = auth.uid()`).
- 최종 교육적 판단은 교사. 시스템 UI 곳곳에 명시.

### C7. 데이터 프라이버시 — [research.md §8.1](./research.md)
- 학생 발화는 **수업 목적 외 사용 금지**.
- 학생 실명 컬럼 추가 금지 — **닉네임만**.
- 학생 발화 인용 시(검토 로그 등) **익명화 필수**.
- 보호자 동의 절차 필수 (회원가입 흐름).

### C8. 자동 트리거 빈도 상한 — [research.md §4.5, §9.7](./research.md)
- AI 자동 호출은 모둠당 **최대 3분에 1회**. 예외: facilitation 턴 전환, attitude-check 갈등 감지 (즉시 허용).
- 학생 명시 호출(버튼)은 빈도 제한 없음.

### C9. 인증·권한 — [research.md §9.6](./research.md)
- 회원가입·로그인은 **Supabase Auth** (교사·학생 공통). 익명 세션 미사용.
- `role` 부여 강제 트리거로 학생의 'teacher' 자가 지정 차단.
- 모든 테이블 **RLS 활성화 필수**. RLS 없는 테이블 생성 금지.

### C10. 기술스택 고정 — [research.md §9.1](./research.md)
- 프론트: Next.js 15 (App Router) + React + TypeScript + Tailwind + shadcn/ui.
- 백엔드: Supabase (Auth + Postgres + Realtime).
- LLM: **OpenAI** 확정 (`OPENAI_API_KEY`). `lib/ai/provider.ts` 추상화는 유지.
- 배포: Vercel.
- 임의 추가 라이브러리 도입은 PR 설명에 사유 명시.

### C11. 학생 발화 보존
- 의견·합의문·요약 모두 **학생 원문 보존율 50% 이상** (요약 후처리 검증).
- 학생 발화를 클라이언트에서 묶어서 단일 텍스트로 전송 금지 (`author_id` 보존).

### C12. AI 발화 시각적 구분
- AI 발화는 학생 발화와 시각적으로 명확히 구분 (아이콘·색상). AI가 무엇을 보고 무엇을 하는지 학생 친화 언어로 안내.

---

## 변경 이력

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-17 | 초기 하네스 구성 (6 에이전트 + 4 스킬) | 전체 | revfactory/harness 패턴 기반 신규 스캐폴딩 |
| 2026-05-17 | 흐름 v2: 2-5명 가변 인원, AI 주도 진행, 팀/개인 채팅 분리, 결과→교사 대시보드 즉시 반영, Supabase Auth 통합 | research.md + 전체 하네스 파일 | 사용자 요구 반영 |
| 2026-05-17 | 4주 실행 계획 plan.md 신규 | plan.md | 마일스톤·인수조건·검토자 게이트 정의 |
| 2026-05-17 | 작업 규칙(W1-W6) + 제약 사항(C1-C12) 추가 | CLAUDE.md | research.md 핵심을 세션 상시 컨텍스트로 |
| 2026-05-17 | 디자인 시스템 design.md 신규 (20장: 토큰·컴포넌트·접근성·Tailwind 설정 포함) | design.md | 전문 디자이너 관점 단일 진실 출처 |
| 2026-05-17 | plan.md에 디자인 작업·디자인 참조 컬럼·디자인 검토 게이트 통합 | plan.md | design.md를 주차별 산출물과 연결 |
| 2026-05-17 | 1주차 전체 구현 (1.1.1~1.1.13): Next.js 15 스캐폴딩, Tailwind 토큰, shadcn/ui, Supabase Auth/migration #1, 미들웨어, 인증·교사·학생 페이지, /design 갤러리 | app/, components/, lib/, supabase/ | plan.md 1주차 완료 |
| 2026-05-17 | DB fix: generate_room_code 6자 보장 + security definer | supabase/migrations/20260517000002 | "방 코드를 만들지 못했어요" 에러 해소 |
| 2026-05-17 | Session(수업) 개념 도입 — 모둠 일괄 생성. /teacher/sessions/{new,[id]} 추가, /teacher/rooms/new 폐기 | supabase/migrations/20260517000003, app/(app)/teacher/sessions/* | 한 반 20-30명·여러 반 교사의 모둠별 수동 생성 부담 해소 |
