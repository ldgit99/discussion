---
name: supabase-schema-patterns
description: Canonical schema, RLS, and migration patterns for the 7 Supabase tables defined in research.md §9.4. Use whenever creating or modifying Supabase migrations, RLS policies, or generated TypeScript types for this project.
---

## 목적

[research.md §9.4](../../../research.md) 의 테이블 9종(`rooms`, `participants`, `messages`, `opinions`, `board_items`, `ai_messages`, `consensus_results`, `attitude_flags`, `personal_chat_consent`)과 [§9.6](../../../research.md) 의 Supabase Auth 통합을 일관된 패턴으로 작성하기 위한 사양.

## 핵심 원칙

- **이유**: 학생 데이터 분리(RLS)와 교사 권한 격리는 [research.md §8.1 프라이버시](../../../research.md) 의 법적/윤리적 요구.
- **린 유지**: 본 스킬은 패턴만 정의. 실제 DDL은 `db-architect` 에이전트가 마이그레이션 파일로 생성.

## 마이그레이션 파일 규칙

- 위치: `supabase/migrations/{YYYYMMDDHHMMSS}_{slug}.sql`
- 멱등성: `CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`(Postgres 16+) 또는 `DROP POLICY IF EXISTS; CREATE POLICY`.
- 단일 파일에 (a) DDL + (b) RLS 활성화 + (c) 정책 정의를 묶음.

## 공통 컬럼

모든 테이블은 다음 컬럼을 갖는다:
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- 변경 가능한 테이블은 `updated_at timestamptz`도 추가 + 트리거.

## 권한 모델 (Supabase Auth)

**회원가입·로그인은 교사·학생 모두 Supabase Auth 사용** ([research.md §9.6](../../../research.md)).

| 역할 | 식별 방식 |
|------|----------|
| `teacher` | `auth.jwt() ->> 'role' = 'teacher'` (raw_user_meta_data에서 승격) |
| `student` | `auth.jwt() ->> 'role' = 'student'` AND `participants(room_id, user_id=auth.uid())` 존재 |

학생은 로그인 후 방 코드로 모둠 입장 → `participants` 테이블에 row 생성. 익명 세션은 사용하지 않는다 (보호자 동의 추적 필요).

### role 부여 강제 트리거

```sql
-- 회원가입 직후 role 검증 (학생이 'teacher' 자가 지정 차단)
create or replace function public.enforce_role_on_signup()
returns trigger as $$
begin
  if new.raw_user_meta_data ->> 'role' not in ('teacher', 'student') then
    new.raw_user_meta_data = jsonb_set(coalesce(new.raw_user_meta_data, '{}'::jsonb), '{role}', '"student"');
  end if;
  -- 'teacher' role 자가 부여 차단: 별도 승격 절차로만 부여 (관리자 RPC)
  return new;
end;
$$ language plpgsql security definer;
```

(교사 승격은 별도 관리자 RPC 또는 학교 도메인 화이트리스트로 처리.)

## 테이블별 RLS 패턴

### rooms
- read: 교사(본인 `teacher_id`) + 모둠 참가 학생
- write: 교사만

### participants
- read: 같은 모둠 구성원 + 담당 교사
- write: 본인 닉네임만 update, 교사가 강퇴 가능
- insert: 본인 `user_id = auth.uid()`만, `rooms.room_code` 일치 검증
- 모둠 정원 검증: 같은 `room_id` participants count < `rooms.max_participants` (5)

### messages
- read: `channel='team'`이면 같은 모둠 + 교사, `channel='personal:{pid}'`이면 본인만 (교사는 사후 RPC로만)
- write: 본인 `author_id = auth.uid()`만 insert. AI는 서비스 역할만 insert.

### opinions
- read: 같은 모둠 + 담당 교사
- write: **본인 `author_id`만 insert/update**, 다른 학생 의견 수정 금지

### board_items
- read: 같은 모둠 + 담당 교사
- write: 같은 모둠 누구나 (공동 편집)

### ai_messages
- read: `channel='team'`이면 같은 모둠 + 교사, `channel='personal:{pid}'`이면 본인만
- write: **서비스 역할만** (서버 사이드 API에서만 insert)

### consensus_results
- read: 같은 모둠 + 담당 교사
- write: 같은 모둠 누구나 (최종 제출은 단계 전환 필요)
- insert 시 교사 대시보드 실시간 반영([research.md §4.3](../../../research.md))

### attitude_flags
- read: **교사·서비스 역할만** (학생 비노출)
- write: 서비스 역할만

### personal_chat_consent
- read: 본인 + 담당 교사
- write: 본인만 (`teacher_view_allowed` 토글)

## 인덱스 패턴

- 모든 자식 테이블에 `(room_id)` 인덱스.
- 시간순 조회용: `(room_id, created_at DESC)` 복합 인덱스.
- `opinions(room_id, author_id)` 인덱스 (학생별 의견 집계).

## Realtime 활성화

- `opinions`, `board_items`, `ai_messages`, `consensus_results`는 `supabase_realtime` publication에 포함.
- `attitude_flags`는 학생 모둠 채널에서 **제외** (별도 교사 채널로만).

## TypeScript 타입

- `supabase gen types typescript --linked > lib/db/types.ts` 자동 실행.
- 마이그레이션 후 타입 재생성 미루지 말 것 — 다른 에이전트가 import.

## 금지 사항

- RLS 비활성 테이블 생성 금지.
- 학생 실명 컬럼 추가 금지. 닉네임만.
- `attitude_flags`를 학생 가시 채널에 push 금지.
