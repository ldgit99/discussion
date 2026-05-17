# 개발 계획 (Plan) — 4주 마일스톤

본 문서는 [research.md](./research.md) 사양과 [design.md](./design.md) 디자인 시스템을 기준으로 4주차까지의 구체 실행 계획을 정의한다. 각 주차는 **금요일 데모 가능한 산출물**을 기준으로 한다.

기술스택은 [research.md §9.1](./research.md): Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase (Auth/Realtime/Postgres) + OpenAI API + Vercel.

**디자인**: 모든 UI 작업은 [design.md](./design.md) 토큰·컴포넌트·접근성 사양을 단일 진실 출처로 한다. 새 화면·컴포넌트 머지 전 [design.md §19 검토 체크리스트](./design.md) 통과 필수.

---

## 전체 로드맵 한눈에

| 주차 | 핵심 산출물 | 상태 |
|------|------------|------|
| **1주차** | 프로젝트 골격 + Supabase Auth + DB 스키마 + RLS + Session 일괄 모둠 생성 | ✅ 2026-05-17 완료 |
| **2주차** | 실시간 팀 채팅 + 의견 카드 + 공동 보드 + 교사 대시보드 결과 보드 | ✅ 2026-05-17 완료 |
| **3주차** | OpenAI 통합 + AI 5종 (facilitation/summary/compare/evidence/consensus) + 자동 트리거 | ✅ 2026-05-17 완료 |
| **4주차** | 개인 채팅 + 코칭/질문/태도 3종 + ChatTabs + 교사 사후 조회 + CSV·전체공유 + 사용가이드 | ✅ 2026-05-18 완료 |

**검토 게이트**: 매주 금요일 `agency-guardian`(AI 변경) + `pedagogy-reviewer`(학생 노출 카피) 통과 후 다음 주차 진입.

---

## 1주차 — 프로젝트 기반 (Foundation)

**목표**: 인증·DB·기본 라우팅을 갖춘 빈 껍데기. AI 기능·실시간은 다음 주.

### 1.1 산출물

| # | 산출물 | 담당 에이전트 | 디자인 참조 |
|---|--------|--------------|------------|
| 1.1.1 | Next.js 15 App Router 프로젝트 스캐폴딩, Tailwind + shadcn/ui 설치, `.env.local` 템플릿 | `frontend-builder` | — |
| 1.1.2 | Supabase 프로젝트 생성, Auth(이메일·비번) 활성화, OAuth 미사용 | `db-architect` | — |
| 1.1.3 | DB 마이그레이션 #1 — `rooms`, `participants`, `personal_chat_consent` 3개 테이블 + RLS + role 부여 트리거 | `db-architect` | — |
| 1.1.4 | `lib/db/types.ts` 자동 생성 (`supabase gen types`) | `db-architect` | — |
| **1.1.5** | **`tailwind.config.ts` 디자인 토큰 반영** (컬러·타입·radius·shadow·모션) | `frontend-builder` | [design.md §18](./design.md) 코드 그대로 |
| **1.1.6** | **`app/globals.css` CSS 변수** (라이트/다크 모드 양쪽), reset, base styles | `frontend-builder` | [design.md §2.2-2.6](./design.md), §17 |
| **1.1.7** | **Pretendard Variable 폰트 로드** (`@fontsource-variable/pretendard`) + `lang="ko"` 루트 설정 | `frontend-builder` | [design.md §3.1, §15.4](./design.md) |
| **1.1.8** | **shadcn/ui 초기 컴포넌트 설치** — Button, Input, Textarea, Dialog, Tabs, Card, Avatar, Badge, Tooltip, Popover, Sheet, Separator, Skeleton, ScrollArea, Progress, Sonner | `frontend-builder` | [design.md §12.1](./design.md) |
| 1.1.9 | 인증 페이지: `/login`, `/signup` (역할 선택 분기) | `frontend-builder` | [design.md §13.1](./design.md) |
| 1.1.10 | 교사 라우트: `/teacher` (대시보드 스켈레톤), `/teacher/rooms/new` (방 생성 폼) | `frontend-builder` | [design.md §5.3, §13.4](./design.md) |
| 1.1.11 | 학생 라우트: `/join` (방 코드 6자리 OTP 입력 → 닉네임 설정), `/room/[id]` (3분할 스켈레톤) | `frontend-builder` | [design.md §13.2, §13.3, §5.2](./design.md) |
| 1.1.12 | 미들웨어: 미인증 사용자 `/login` 리다이렉트, role 기반 라우트 가드 | `frontend-builder` | — |
| **1.1.13** | **`/design` 미리보기 라우트** — 컬러 토큰·타입 스케일·기본 컴포넌트 갤러리 (디자인 자동 검증용) | `frontend-builder` | [design.md §20.5](./design.md) |

### 1.2 인수 조건

- 교사가 `/signup` → 이메일 인증 → 로그인 → 방 생성 → 6자리 방 코드 발급까지 무중단 동작.
- 학생이 별도 계정으로 `/signup` → 로그인 → 방 코드 입력 → 닉네임 설정 → `/room/[id]` 진입까지 무중단 동작.
- 다른 학생의 모둠 데이터 접근 시 RLS로 차단됨을 SQL 콘솔에서 확인.
- 학생이 직접 `role='teacher'`로 가입 시도 시 트리거가 `student`로 강제 변경.
- **`/design` 라우트에서 디자인 토큰 갤러리 정상 노출** (컬러 칩, 타입 스케일, 기본 컴포넌트). 디자이너·검토자가 토큰 검증 가능.
- **Pretendard 적용 확인**: 한글 본문이 시스템 폰트가 아닌 Pretendard로 렌더링됨 (DevTools Computed font-family).
- **대비 검증**: axe DevTools로 `/login`, `/signup`, `/join` 페이지 컬러 대비 위반 0건.

### 1.3 위임 흐름

```
discussion-orchestrator
  └─ db-architect → 마이그레이션 #1 + Auth 트리거
  └─ frontend-builder → 인증·라우팅·스켈레톤
```

검토자: `pedagogy-reviewer` (인증 카피·에러 메시지 + [design.md §14 보이스 가이드](./design.md)). `agency-guardian`은 AI 코드 없으므로 1주차 미호출.

**디자인 검토**: [design.md §19 체크리스트](./design.md) 1주차 적용 항목 — 컬러 대비, 키보드 접근성, 다크 모드 토큰, 빈/로딩/에러 상태, 카피 가이드 준수.

### 1.4 1주차 비목표 (Out of Scope)

- 실시간 동기화 (2주차)
- AI 호출 (3주차)
- 개인 채팅 UI (4주차)
- 공동 보드의 실제 편집 기능 (스켈레톤만)

---

## 2주차 — 실시간 + 팀 채팅 + 의견 카드 (Collaboration MVP)

**목표**: AI 없이 사람만으로도 토의가 가능한 협업 환경.

### 2.1 산출물

| # | 산출물 | 담당 에이전트 | 디자인 참조 |
|---|--------|--------------|------------|
| 2.1.1 | DB 마이그레이션 #2 — `messages`, `opinions`, `board_items`, `consensus_results` 4개 테이블 + RLS | `db-architect` | — |
| 2.1.2 | Realtime publication에 위 4개 + `participants` 등록 | `db-architect` | — |
| 2.1.3 | `lib/realtime/` 훅 1차: `useTeamChannel`, `useTeamMessages`, `useOpinionsSync`, `useBoardSync`, `usePresence` | `realtime-engineer` | — |
| 2.1.4 | **`RoomHeader`** 컴포넌트 — 주제·단계·남은 시간·방 코드·`n/N` 접속·교사명 | `frontend-builder` | [design.md §5.2, §12.2](./design.md) |
| 2.1.5 | **`ChatPanel` + `ChatMessages` + `ChatInput`** — 팀 탭 채팅 UI (메시지 입력·발화 표시·닉네임·아바타) | `frontend-builder` | [design.md §11.2, §11.3 발화자 위계, §3.5 메시지 간격](./design.md) |
| 2.1.6 | **`OpinionCard` + 등록 `Dialog`** — 의견 + 근거 분리 입력, 작성자·시각 메타 | `frontend-builder` | [design.md §12.2, §14.3 마이크로카피](./design.md) |
| 2.1.7 | **`BoardPanel` + 섹션 4종** (CompareTable / CriteriaList / IssuesList / RepresentativeDraft) | `frontend-builder` | [design.md §5.2, §13.3 컴포넌트 트리](./design.md) |
| 2.1.8 | **`ResultStrip`** — 하단 결과 영역 + `[우리 모둠 의견 제출하기]` 버튼 | `frontend-builder` | [design.md §13.3 하단, §14.3 카피](./design.md) |
| 2.1.9 | 교사 대시보드 — **`GroupCard` 그리드** + 선택 모둠 실시간 미니뷰 + 하단 **`ResultBoardRow` 결과 보드** (`consensus_results` 실시간 수신) | `frontend-builder` + `realtime-engineer` | [design.md §5.3, §13.4](./design.md) |
| 2.1.10 | 낙관적 동시성 + 충돌 토스트 ("방금 다른 친구가 수정했어요") | `realtime-engineer` + `frontend-builder` | [design.md §13.7 에러 상태, Sonner 토스트](./design.md) |
| **2.1.11** | **빈/로딩 상태 구현** — 채팅·보드·교사 대시보드 빈 상태 카피 + 일러스트 아이콘 | `frontend-builder` | [design.md §13.5, §13.6](./design.md) |
| **2.1.12** | **모션 적용** — 새 메시지 slide-down(200ms), 의견 카드 등록 scale-in(240ms), 결과 보드 행 추가(320ms + 1초 강조) | `frontend-builder` | [design.md §8.2](./design.md) |
| **2.1.13** | **반응형 검증** — 1280px / 768px / 모바일 3개 너비에서 레이아웃 무너지지 않음 | `frontend-builder` | [design.md §16.3](./design.md) |

### 2.2 인수 조건

- 2명 이상 학생이 같은 방에 동시 접속 → 한쪽이 의견 카드 등록 → 다른 쪽 화면에 1초 내 반영.
- 동시에 같은 보드 셀 편집 → 마지막 쓰기 우선 + 토스트 노출.
- 학생이 `[우리 모둠 의견 제출하기]` 클릭 → 교사 대시보드 하단 보드에 새 행 즉시 추가 + 1초간 success 강조 후 페이드.
- 다른 모둠 채널에 잘못 subscribe하려는 시도가 RLS로 차단.
- **본인 발화는 우측 정렬 + brand-50 배경**, 다른 학생 발화는 좌측 정렬 + 화이트로 명확히 구분됨 ([design.md §11.3](./design.md) 위계 준수).
- **1280px·768px·모바일 3개 너비**에서 학생 대시보드·교사 대시보드 모두 정상 렌더링.
- 모든 빈/로딩 상태 정의되어 있고 카피가 [design.md §14](./design.md) 가이드 준수.

### 2.3 위임 흐름

```
discussion-orchestrator
  ├─ db-architect → 마이그레이션 #2 + Realtime publication
  ├─ realtime-engineer → 훅 1차
  └─ frontend-builder → 학생/교사 대시보드 UI (병렬)
```

검토자: `pedagogy-reviewer` (학생·교사 노출 카피 전체).

### 2.4 2주차 비목표

- AI 발화·진행자 (3주차)
- 개인 채팅 탭 (4주차)
- 태도 점검 자동 감지 (3주차 말 또는 4주차)

---

## 3주차 — AI 진행자 + 핵심 보조 기능 (AI Core)

**목표**: AI가 토의를 진행하고 학생 요청에 따라 핵심 보조 기능을 제공.

### 3.1 산출물

| # | 산출물 | 담당 에이전트 | 디자인 참조 |
|---|--------|--------------|------------|
| 3.1.1 | DB 마이그레이션 #3 — `ai_messages` 테이블 + RLS (`channel` 컬럼 포함) | `db-architect` | — |
| 3.1.2 | `lib/ai/provider.ts` — OpenAI 추상화, `OPENAI_API_KEY` 환경 변수 | `ai-feature-developer` | — |
| 3.1.3 | `lib/ai/moderation.ts` — OpenAI Moderation 1차 + 키워드 필터 2차 | `ai-feature-developer` | — |
| 3.1.4 | `lib/ai/features/facilitation.ts` + `app/api/ai/facilitation/route.ts` — 시작 안내·턴 진행·근거 요구 | `ai-feature-developer` | — |
| 3.1.5 | `lib/ai/features/summary.ts` + API + `[정리하기]` 버튼 (`ListChecks` 아이콘) | `ai-feature-developer` + `frontend-builder` | [design.md §9.3](./design.md) |
| 3.1.6 | `lib/ai/features/compare.ts` + API + `[의견 비교]` 버튼 (`GitCompare`) | `ai-feature-developer` + `frontend-builder` | [design.md §9.3](./design.md) |
| 3.1.7 | `lib/ai/features/evidence-check.ts` + API + `[근거 확인]` 버튼 (`Search`) + 의견 등록 직후 자동 호출 | `ai-feature-developer` + `frontend-builder` | [design.md §9.3](./design.md) |
| 3.1.8 | `lib/ai/features/consensus-aid.ts` + API + `[합의 돕기]` 버튼 (`Handshake`) | `ai-feature-developer` + `frontend-builder` | [design.md §9.3](./design.md) |
| 3.1.9 | 5개 기능별 시스템 프롬프트 + 가드 검증 함수 (`ai-feature-guards` 스킬의 공통 헤더 + 8개 가드 적용) | `ai-feature-developer` | — |
| **3.1.10** | **`AIMessage` 컴포넌트** — ✦ 아이콘 + "AI 진행자" 라벨 + ai-50 배경 + ai-200 보더 + **최대 폭 70%** + AI 등장 모션(250ms 지연 fade) | `frontend-builder` | [design.md §11.1, §8.2](./design.md) |
| **3.1.11** | **`AIPanel` 컴포넌트** — 우측 6개 버튼 (아이콘 + 텍스트, 팀 모드 전체 활성) | `frontend-builder` | [design.md §10.1, §12.2](./design.md) |
| **3.1.12** | **AI 로딩 상태** — 메시지 자리에 Skeleton 3줄 + "AI가 생각 중이에요…" + 3초/10초 타임아웃 대응 | `frontend-builder` | [design.md §13.6](./design.md) |
| **3.1.13** | **AI 가드 차단 시 UX** — 학생에게 "지금은 안내가 어려워요. 잠깐 후 다시 눌러주세요." 토스트 (실제 오류는 미노출) | `frontend-builder` | [design.md §13.7](./design.md) |
| 3.1.14 | AI 발화 broadcast → `useAiBroadcast` 훅으로 채팅 영역 표시 | `realtime-engineer` + `frontend-builder` | — |
| 3.1.15 | 트리거 엔진 (`lib/ai/triggers.ts`): 학생 입장 완료 → facilitation 자동, 의견 등록 → evidence-check 자동 | `ai-feature-developer` | — |

### 3.2 인수 조건

- 2명 이상 입장 → AI가 자동으로 주제·절차 안내 메시지 송출.
- 학생이 의견 등록 → AI가 "왜 그렇게 생각하나요?" 형태 근거 요구 자동 응답.
- 각 버튼 클릭 시 응답 latency 3초 이내, 출력은 JSON 스키마 준수.
- 후처리 검증 실패한 출력은 학생에게 노출되지 않고 재시도 또는 안내 메시지.
- `agency-guardian` 검토: 5개 기능 모두 "제한 범위" 가드가 시스템 프롬프트에 포함됨을 확인.
- **AI 발화는 학생 발화와 시각적으로 명확히 구분** ([design.md §11.3 위계](./design.md)) — 폭, 배경, 아이콘, 라벨 모두 차이.
- **`/design` 라우트에 `AIMessage` 컴포넌트 갤러리 추가** (검토자 시각 확인용).

### 3.3 위임 흐름

```
discussion-orchestrator
  ├─ db-architect → 마이그레이션 #3
  ├─ ai-feature-developer → provider·moderation·5개 기능
  │    └─ (필수) agency-guardian 검토 통과
  │    └─ (필수) pedagogy-reviewer 카피 검토
  ├─ realtime-engineer → AI broadcast 채널 통합
  └─ frontend-builder → 버튼 연결, AI 발화 표시
```

### 3.4 3주차 비목표

- 개인 채팅 (`coaching` 기능, 4주차)
- 질문 생성·태도 점검 (4주차)
- 자동 정체 감지·갈등 감지 (4주차)

---

## 4주차 — 개인 채팅 + 코칭 + 마무리 (Personal Mode + Polish)

**목표**: 개인 모드 사고 확장, 남은 AI 기능, 교사 대시보드 완성, 파일럿 준비.

### 4.1 산출물

| # | 산출물 | 담당 에이전트 | 디자인 참조 |
|---|--------|--------------|------------|
| 4.1.1 | DB 마이그레이션 #4 — `attitude_flags` 테이블 + RLS (학생 비노출) | `db-architect` | — |
| 4.1.2 | `messages.channel`·`ai_messages.channel`이 `personal:{pid}`인 경우 RLS 본인만 read 정책 검증 | `db-architect` | — |
| 4.1.3 | `lib/realtime/` 훅 2차: `usePersonalChannel`, `usePersonalMessages`, `useTeacherChannel`, `useResultSubmissions` | `realtime-engineer` | — |
| **4.1.4** | **`ChatTabs` 컴포넌트** — 팀/개인 탭 전환 UI. 활성 탭 모드별 인디케이터 색상(brand vs personal-accent), 키보드 단축키 (`Cmd/Ctrl+1`, `Cmd/Ctrl+2`) | `frontend-builder` | [design.md §10.2, §15.2](./design.md) |
| **4.1.5** | **개인 모드 채팅 영역 시각 구분** — `bg-personal-bg` 배경 + `border-personal-border` + 헤더 🔒 **"나만 보이는 공간"** 배지 + 200ms 페이드 전환 + 입장 시 1초 강조 펄스 | `frontend-builder` | [design.md §10.1, §10.2, §2.4](./design.md) |
| **4.1.6** | **개인 모드 메시지 입력 placeholder** "혼자만의 생각을 정리해보세요…" + **AI 코치 라벨** "AI 코치" (팀 모드 "AI 진행자"와 구분) | `frontend-builder` | [design.md §10.1, §14.3](./design.md) |
| 4.1.7 | `lib/ai/features/coaching.ts` + API — 개인 채팅 코치 (다른 학생 발화 입력 컨텍스트에서 제거) | `ai-feature-developer` | — |
| 4.1.8 | `lib/ai/features/question-gen.ts` + `[질문 만들기]` 버튼 (`HelpCircle`) + 정체 감지 자동 권유 | `ai-feature-developer` + `frontend-builder` | [design.md §9.3](./design.md) |
| 4.1.9 | `lib/ai/features/attitude-check.ts` + 비방 표현 실시간 감지 + `[태도 점검]` 버튼 (`Heart`) | `ai-feature-developer` + `frontend-builder` | [design.md §9.3](./design.md) |
| 4.1.10 | 정체 감지 (`M분간 새 발화 없음`) + 갈등 감지 자동 트리거 | `ai-feature-developer` | — |
| **4.1.11** | **AI 패널 모드별 활성 분기** — 팀 모드 6개 활성, **개인 모드 3개만 활성**(정리·근거 확인·질문 만들기), 비활성 버튼은 회색 + 툴팁 "팀 모드에서 사용 가능" | `frontend-builder` | [design.md §4.5 채팅 모드 표, §10.1](./design.md) |
| **4.1.12** | **"팀에 공유" 액션 UI** — 개인 메시지 호버 시 `[팀에 공유]` 버튼 + `ConsentDialog` "이 내용을 팀 모두에게 보여줄까요?" + 공유 후 팀 채팅에 personal-accent 4px 액센트 바 + "🔒→👥 개인에서 공유" 캡션 | `frontend-builder` + `realtime-engineer` | [design.md §10.3](./design.md) |
| 4.1.13 | 교사 대시보드 — 모둠별 상세 패널 (팀 채팅 미니뷰, 학생별 발화량 차트, 알림 상세) | `frontend-builder` | [design.md §13.4](./design.md) |
| **4.1.14** | **`ConsentDialog`** — 개인 채팅 교사 열람 동의 다이얼로그 | `frontend-builder` + `db-architect` | [design.md §12.2](./design.md) |
| 4.1.15 | 교사 대시보드 — 개인 채팅 사후 조회 (학생 동의 시) | `frontend-builder` + `db-architect` | — |
| 4.1.16 | 교사 대시보드 — `[전체 공유 모드]`, `[CSV 내보내기]`, `[학급 종합 리포트]` | `frontend-builder` | — |
| **4.1.17** | **다크 모드 검증** — 모든 화면에서 다크 토큰 정상 적용, 개인 모드 다크 배경 `#1C1917` 확인 | `frontend-builder` | [design.md §17](./design.md) |
| **4.1.18** | **접근성 최종 검증** — axe DevTools 위반 0건, `prefers-reduced-motion` 환경 모션 제거 확인, 키보드 단축키 동작 | `frontend-builder` | [design.md §15](./design.md) |
| 4.1.19 | 시드 데이터: 샘플 토의 주제 3개 (국어 토의 1, 사회 쟁점 1, 자유 1) | `db-architect` | — |
| 4.1.20 | 배포: Vercel preview + production 환경 변수 설정 | `frontend-builder` | — |

### 4.2 인수 조건

- 학생이 개인 탭으로 전환 → 다른 학생은 그 학생의 개인 메시지를 실시간으로 보지 못함 (RLS + 클라이언트 가드 둘 다 검증).
- 개인 코칭 LLM 호출 시 다른 학생 닉네임이 입력에 포함되지 않음 (`agency-guardian` 검증).
- 학생이 개인 모드에서 정리한 의견을 "팀에 공유" → 팀 채팅에 등장 + `opinions.shared_from_personal=true` 마킹 + personal-accent 액센트 바 표시.
- 비방 표현 등록 시 `attitude_flags` 자동 생성 + 교사 채널 알림, 학생 모둠 채널에는 노출 안 됨. **학생 카드 자체는 변색되지 않음** (design.md §2.7 규칙).
- M분간 새 발화 없음 → AI가 "질문 만들기" 권유 메시지 송출 (1회만).
- 교사가 학생 동의된 개인 채팅을 사후 조회 가능, 미동의 시 차단.
- **팀 ↔ 개인 탭 전환 시 채팅 영역 배경이 200ms 페이드로 전환**, 헤더 배지 변경, AI 라벨 변경.
- **개인 모드에서 AI 패널 6개 버튼 중 3개만 활성**, 비활성 버튼 회색 + 툴팁 노출.
- **다크 모드 토글** 시 모든 화면 정상 렌더링.
- **`prefers-reduced-motion: reduce`** 환경에서 slide/scale/펄스 모션 모두 제거됨.
- **[design.md §19 디자인 검토 체크리스트](./design.md) 전체 항목 통과**.

### 4.3 위임 흐름

```
discussion-orchestrator
  ├─ db-architect → 마이그레이션 #4 + 채널 RLS 검증
  ├─ realtime-engineer → 개인·교사 채널 훅 2차
  ├─ ai-feature-developer → coaching·question·attitude + 자동 트리거
  │    └─ (필수) agency-guardian 검토 — 개인 코칭 격리 집중 검증
  │    └─ (필수) pedagogy-reviewer 검토 — 개인 모드 안내 카피
  └─ frontend-builder → 탭 UI, 교사 상세·결과·내보내기
```

### 4.4 4주차 산출 외 (파일럿 준비)

- 보호자 동의 절차 문서화 ([research.md §8.1, §9.6.2](./research.md))
- 학생·교사 사용 가이드 1페이지
- 파일럿 학급 섭외·일정 조율
- 사전·사후 설문 폼 (Google Forms 또는 자체)

---

## 검토자 게이트 운영 규칙

매주 금요일 오전: **데모 → 검토 → 회고** 순서.

1. **데모 (30분)**: 인수 조건 라이브 시연 (`/design` 갤러리 포함).
2. **`agency-guardian` 검토 (해당 시)**: AI 코드·프롬프트 변경 PR 일괄 검토. 차단 시 다음 주 1순위.
3. **`pedagogy-reviewer` 검토**: 노출 카피 + 시각 적절성 일괄 검토. [design.md §14 톤 가이드](./design.md) 위반 차단.
4. **디자인 검토** ([design.md §19 체크리스트](./design.md)):
   - 컬러 대비 ≥ 4.5:1 (axe DevTools)
   - 키보드 접근성
   - AI/학생 발화 구분, 팀/개인 모드 구분
   - 빈/로딩/에러 상태 정의
   - 반응형 (1280/768/모바일)
   - 다크 모드
5. **회고 (15분)**: `_workspace/retro_{week}.md`에 기록.

---

## 의존성 그래프

```
1주차 (Auth + 기본 DB) ─┬─► 2주차 (Realtime + 팀 채팅)
                       │
                       └─► 3주차 (AI 5개 기능)
                            │
                            └─► 4주차 (개인 채팅 + 나머지 + 마감)
```

병렬 가능 구간:
- **1주차**: db-architect와 frontend-builder는 마이그레이션 #1 머지 후 거의 병렬.
- **2주차**: 학생 UI와 교사 UI는 훅 1차 완료 후 병렬.
- **3주차**: 5개 AI 기능은 provider + moderation 완료 후 병렬.
- **4주차**: 개인 채팅 + 교사 상세 + 자동 트리거 병렬.

---

## 리스크와 대응

| 리스크 | 대응 | 발생 시 영향받는 주차 |
|--------|------|-------------------|
| OpenAI latency > 3초 | 응답 스트리밍 + "AI가 생각 중이에요…" UX ([design.md §13.6](./design.md)) | 3주차 |
| 4-5명 동시 편집 race condition | 2주차 부하 테스트 (시뮬 클라이언트 5개) | 2주차 |
| `agency-guardian` 검토 차단 다발 | 시스템 프롬프트를 [[ai-feature-guards]] 헤더부터 먼저 확정 후 기능 개발 시작 | 3,4주차 |
| 한국어 청소년 발화 모델 이해도 부족 | OpenAI Moderation + 자체 키워드 사전 추가, 실제 학생 발화 샘플로 평가 | 3,4주차 |
| RLS 누락으로 가시성 위반 | 매 마이그레이션마다 다른 모둠 가장한 쿼리로 자동 차단 검증 | 1,2,3,4주차 |
| 일정 지연 | MVP 우선순위 — `coaching`, `question-gen`, `attitude-check`는 5주차로 이연 가능 | 4주차 |
| 디자인 토큰 일관성 깨짐 (하드코드된 색·크기) | 1주차 `/design` 라우트 + `tailwind.config.ts` 토큰 강제, PR에서 `text-#[0-9a-f]{6}` 사용 차단 | 전체 |
| Pretendard 로드 실패로 한글 깨짐 | `@fontsource-variable/pretendard` 셀프호스팅 + 시스템 폰트 fallback ([design.md §3.1](./design.md)) | 1주차 |
| AI/학생 발화 시각 혼동 | 3주차 `/design`에 `AIMessage` 갤러리 추가, `agency-guardian` C12 검증 | 3주차 |

---

## MVP 우선순위 (일정 지연 시 컷오프 순서)

이연 가능한 후순위(높은 번호부터 다음 스프린트로 이연):

1. `[학급 종합 리포트]`, `[CSV 내보내기]` (4.1.12)
2. 개인 채팅 사후 조회 UI (4.1.11)
3. `attitude-check` 자동 감지 (4.1.7 부분)
4. `question-gen` 자동 권유 (4.1.6 자동 부분)
5. `coaching` (4.1.5)

위 5개를 모두 컷해도 **2-5명이 팀 채팅으로 토의하고 AI 5개 기능으로 보조받아 합의에 도달, 교사가 결과를 실시간 확인**하는 핵심 가치는 유지됨.
