---
name: ai-feature-guards
description: Provides the canonical 허용/제한 범위 definitions and system-prompt guard templates for the 6 AI features (요약·비교·근거점검·질문생성·태도점검·합의보조). Use whenever writing, modifying, or reviewing any OpenAI system prompt, output parser, or post-processing validator in this project.
---

## 목적

[research.md §4.4, §4.6](../../../research.md) 의 8개 AI 기능 허용/제한 범위를 코드와 프롬프트로 옮길 때 사용하는 가드 사양. 모든 시스템 프롬프트는 본 스킬의 가드 템플릿을 포함해야 한다.

## 핵심 원칙

- **이유**: Agency 보존이 깨지면 프로젝트의 교육적 가치 자체가 사라진다 ([research.md §1.2](../../../research.md)).
- **린 유지**: 각 기능별 1페이지. 상세 예시는 `references/`로 분리.
- **검증 가능성**: 모든 제한 규칙은 후처리에서 프로그램적으로 검증 가능하도록 작성.

## 8개 기능 가드 요약

| 기능 | 채널 | 허용 | 제한 (시스템 프롬프트에 명시) | 후처리 검증 |
|------|------|------|---------------------------|------------|
| 토의 진행 | 팀 | 시작 안내, 턴 안내, 근거 요구 | 의견 평가·정답 제시 금지 | "맞다/틀리다/좋다" 평가 어휘 차단 |
| 개인 코칭 | 개인 | 명료화·반론·근거 보완 질문 | 학생 대신 답안 작성, 다른 학생 의견 누설 금지 | 출력이 질문 부호로 끝남, 다른 학생 닉네임 미포함 |
| 요약 | 팀/개인 | 학생 발언 기반 요약 | 없는 의견 추가 금지 | 출력↔입력 n-gram overlap ≥ 50% |
| 비교 | 팀 | 기준 제안, 공통점·차이점 | 대표 의견 선택·추천 금지 | "추천", "낫다", "선택" 키워드 차단 |
| 근거 점검 | 팀/개인 | 보완 질문 제시 | 근거 대신 작성 금지 | 출력이 질문 부호로 끝나는지 검사 |
| 질문 생성 | 팀/개인 | 토의 촉진 질문 | 공격적 반박·인신공격 질문 금지 | 모더레이션 + 인물 지칭 패턴 차단 |
| 태도 점검 | 팀 | 표현 수정 제안 | 학생 비난·인격 평가 금지 | "너는", "당신은" 등 2인칭 인격 지칭 차단 |
| 합의 보조 | 팀 | 선택 기준·조정 질문 | 최종 결정·합의문 작성 금지 | 출력이 평서문 합의안인지 검사, 차단 |

**채널 분리 가드**: `facilitation`은 팀 채널만, `coaching`은 개인 채널만 broadcast. 잘못된 채널 호출 시 차단.

**개인 코칭 격리 가드**: 개인 코칭 LLM 호출 시 입력 컨텍스트에 다른 학생의 의견·발화를 절대 포함하지 마라. 같은 모둠 다른 학생의 닉네임이 출력에 등장하면 차단.

## 공통 시스템 프롬프트 헤더

모든 6개 기능 시스템 프롬프트는 다음 헤더로 시작:

```
당신은 중학생 4인 모둠 토의를 돕는 AI 보조자입니다.
당신의 역할은 학생의 사고와 판단을 대체하지 않고 보조하는 것입니다.

절대 규칙:
1. 학생이 발화하지 않은 의견을 만들어내지 마라.
2. 어느 학생의 의견이 더 낫다고 평가하지 마라.
3. 합의문이나 결정문을 직접 작성하지 마라.
4. 특정 학생을 비난하거나 인격을 평가하지 마라.
5. 답이 정해진 양 단정하지 마라.

응답 언어: 한국어. 응답은 항상 지정된 JSON 스키마를 따라라.
```

## 기능별 시스템 프롬프트 본문

각 기능별 상세 프롬프트는 `references/{feature}.md`로 분리:

- `references/facilitation.md` — 토의 진행 (팀)
- `references/coaching.md` — 개인 코칭 (개인)
- `references/summary.md` — 요약
- `references/compare.md` — 비교
- `references/evidence-check.md` — 근거 점검
- `references/question-gen.md` — 질문 생성
- `references/attitude-check.md` — 태도 점검
- `references/consensus-aid.md` — 합의 보조

(MVP 단계에서 우선순위가 정해지면 해당 reference만 작성한다.)

## 후처리 검증 함수 인터페이스

모든 기능은 다음 시그니처를 따른다:

```typescript
type GuardResult = { ok: true } | { ok: false; reason: string };

function validate{Feature}Output(
  input: { opinions: Opinion[]; recentUtterances: string[] },
  output: {FeatureOutput}
): GuardResult;
```

검증 실패 시: LLM 재호출 1회 → 그래도 실패하면 "잠시 후 다시 시도하세요" 메시지 노출. 절대 검증 실패 출력을 학생에게 노출하지 말 것.

## 자동 트리거 빈도 가드

- 단일 모둠 자동 호출은 **3분에 1회 이하**.
- 학생 명시 호출(버튼)은 빈도 제한 없음.
- 갈등 감지(태도 점검 자동 호출)는 예외 — 즉시 호출 허용.

## 금지 사항

- 가드 없는 LLM 호출 금지.
- 시스템 프롬프트에 본 스킬의 "절대 규칙 1-5" 누락 금지.
- 검증 실패한 출력을 학생에게 그대로 노출 금지.
