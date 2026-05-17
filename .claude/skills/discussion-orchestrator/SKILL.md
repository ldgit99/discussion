---
name: discussion-orchestrator
description: Routes incoming development requests for the middle-school discussion AI app to the correct specialist agent(s) and enforces the producer-reviewer flow. Use whenever the user asks to add, change, or debug a feature in this project (UI, realtime, DB, AI features, prompts, copy, auth). Triggers on keywords like 토의방, 팀 채팅, 개인 채팅, 의견 카드, 공동 보드, AI 패널, 모둠, 합의, 회원가입, 로그인, Supabase, Realtime, 프롬프트.
---

## 목적

이 프로젝트는 6명의 전문가/검토자 에이전트로 구성된 팀이다. 본 스킬은 **요청을 올바른 에이전트(들)에게 라우팅**하고, **AI 관련 변경은 반드시 검토자를 거치도록 강제**한다.

## 핵심 원칙

- **이유**: AI 기능의 Agency 보존이 프로젝트 정체성이므로, 검토 없이 병합되면 시스템 존재 이유가 무너진다 ([research.md §1.2](../../../research.md)).
- **린 유지**: 본 SKILL.md는 라우팅 규칙만. 각 영역의 상세는 다른 스킬·에이전트로 위임.
- **일반화**: 새 기능이 추가되어도 동일 라우팅 룰이 적용되도록 영역별로 분류한다.

## 라우팅 규칙

### 1) 영역 → 1차 담당 에이전트

| 변경 영역 | 1차 담당 | 비고 |
|----------|---------|------|
| `app/`, `components/`, UI 페이지·컴포넌트, Tailwind 스타일 (회원가입·로그인 UI 포함) | `frontend-builder` | shadcn/ui 우선 |
| `lib/realtime/`, Supabase Realtime 채널·훅, presence (팀/개인/교사 3종 채널) | `realtime-engineer` | 채널 추상화만 |
| `supabase/migrations/`, `lib/db/types.ts`, RLS 정책, Auth 트리거 | `db-architect` | 마이그레이션 단일 진실 출처 |
| `lib/ai/`, `app/api/ai/`, 프롬프트, 모더레이션 (8개 기능: facilitation·coaching + 6 보조) | `ai-feature-developer` | OpenAI 확정 |
| 회원가입·로그인·세션 (Supabase Auth) | `db-architect` (Auth 트리거·RLS) + `frontend-builder` (UI) | role 부여 강제 |

### 2) 검토자 강제 호출

| 변경 트리거 | 호출 검토자 | 권한 |
|------------|------------|------|
| `lib/ai/**` 또는 `app/api/ai/**` 변경 | `agency-guardian` | 병합 차단 |
| 학생·교사 노출 텍스트(카피, 에러, AI 응답 템플릿) 변경 | `pedagogy-reviewer` | 병합 차단 |
| AI 자동 트리거 빈도·조건 변경 | `agency-guardian` + `pedagogy-reviewer` 둘 다 | 둘 다 통과 필요 |

### 3) 데이터 흐름

```
사용자 요청
  ↓
[discussion-orchestrator] 영역 분류
  ↓
1차 담당 에이전트 작업
  ↓ (산출물)
필요 시 검토자 호출 → 차단/통과
  ↓
완료 (CLAUDE.md 변경 이력에 기록)
```

### 4) 다중 영역 작업 시

- 영역이 둘 이상이면 의존 순서를 명시하여 순차 호출:
  1. `db-architect` (스키마가 가장 먼저, 타입이 다른 에이전트의 입력)
  2. `realtime-engineer` (스키마 의존)
  3. `ai-feature-developer` (스키마 + 채널 의존)
  4. `frontend-builder` (전부 의존)
  5. 검토자(들)

## 모드 분기

- **단순 질문/조회** (예: "지금 어떤 테이블이 있나?"): 스킬 사용 없이 직접 응답 가능.
- **변경 요청**: 본 스킬 사용 + 라우팅 + 검토자 강제.
- **연구·기획 변경**: [research.md](../../../research.md) 직접 편집 + 변경 이력 CLAUDE.md에 1줄 기록.

## 참조 스킬

- AI 기능별 허용/제한 범위 상세: [[ai-feature-guards]]
- Supabase 스키마·RLS 패턴: [[supabase-schema-patterns]]
- Realtime 동기화 패턴: [[realtime-sync-patterns]]

## 채널 분리 규칙 (개인 ↔ 팀 채팅)

- 개인 채팅(`personal:{pid}`)과 팀 채팅(`team`)은 **데이터·실시간·LLM 컨텍스트 모두 분리**.
- 개인 채팅 변경 작업 시 항상 다음을 확인:
  - 다른 학생이 실시간으로 구독할 수 없는가? (RLS + 클라이언트 코드)
  - 교사 사후 조회는 `personal_chat_consent.teacher_view_allowed=true`만 허용하는가?
  - LLM 입력에 다른 학생 발화가 포함되지 않는가?
- "팀에 공유" 액션만 개인 → 팀 전파를 허용 (`opinions.shared_from_personal=true`).

## 금지 사항

- 검토자 우회 금지. AI 변경에 검토자 호출을 생략하면 본 스킬의 존재 의미가 없다.
- 6명의 정의된 에이전트 외 임의 에이전트 신설 금지. 새로운 영역이 생기면 본 스킬 + 에이전트 추가 PR로 변경.
- 개인 채팅 가시성 위반 변경은 무조건 차단.
