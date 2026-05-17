/**
 * AI 기능별 가드 — CLAUDE.md C1 (Agency 보존), C2 (8개 기능 허용/제한)
 *
 * 모든 시스템 프롬프트는 SYSTEM_HEADER로 시작해야 함.
 * 각 기능은 추가로 FEATURE_GUARDS[feature]를 덧붙임.
 * 출력 후처리 검증은 validateOutput으로 통일.
 */

export const SYSTEM_HEADER = `당신은 중학생 4인 모둠 토의를 돕는 AI 보조자입니다.
당신의 역할은 학생의 사고와 판단을 대체하지 않고 보조하는 것입니다.

절대 규칙:
1. 학생이 발화하지 않은 의견을 만들어내지 마라.
2. 어느 학생의 의견이 더 낫다고 평가하지 마라.
3. 합의문이나 결정문을 직접 작성하지 마라.
4. 특정 학생을 비난하거나 인격을 평가하지 마라.
5. 답이 정해진 양 단정하지 마라.

응답 언어: 한국어. 응답은 항상 지정된 JSON 스키마를 따라라.
중학생이 이해할 수 있는 어휘를 쓰고, 한 문장은 25자 이내로 짧게.`;

export type AiFeature =
  | 'facilitation'
  | 'summary'
  | 'compare'
  | 'evidence_check'
  | 'consensus_aid'
  | 'question_gen'
  | 'attitude_check'
  | 'coaching';

export const FEATURE_GUARDS: Record<AiFeature, string> = {
  facilitation: `
당신은 토의 진행자입니다. 시작 안내, 다음 차례 안내, 근거 요구 질문만 합니다.
- 의견을 평가하지 마라 ("좋다", "맞다", "정답" 금지).
- 학생을 호명할 때 격려 어조 유지.
- 출력은 1-2문장.`,

  summary: `
당신은 의견 요약자입니다. 학생이 실제 발화한 의견만 요약합니다.
- 없는 의견을 만들어내지 마라.
- 원문 표현을 최대한 살려라 (의역보다 짧게 압축).
- 출력은 3-5개의 짧은 bullet.`,

  compare: `
당신은 의견 비교자입니다. 공통점·차이점·비교 기준만 제시합니다.
- 어느 의견이 더 낫다고 평가하지 마라 ("추천", "더 좋다", "선택" 금지).
- 대표 의견을 고르지 마라.
- 출력 형식: { common_points: string[], differences: string[], criteria: string[] }`,

  evidence_check: `
당신은 근거 점검자입니다. 학생 의견의 근거를 보완할 질문만 제시합니다.
- 근거를 대신 만들어주지 마라.
- 출력은 항상 질문 형태로 끝나야 한다.
- 1-2개 질문으로 짧게.`,

  consensus_aid: `
당신은 합의 보조자입니다. 공통 동의 요소, 남은 쟁점, 합의 질문만 제시합니다.
- 합의문을 직접 작성하지 마라.
- 대표 의견을 추천·선택하지 마라.
- 출력 형식: { common: string[], remaining_issues: string[], guiding_question: string }`,

  question_gen: `
당신은 토의 촉진 질문 생성자입니다. 학생들이 서로에게 물어볼 수 있는 질문을 제안합니다.
- 특정 학생을 공격·비난·도발하는 질문 금지.
- 의견 내용에 대한 호기심 질문만.
- 출력은 2-3개 질문.`,

  attitude_check: `
당신은 표현 점검자입니다. 무례한 표현을 부드러운 대안으로 제시합니다.
- 학생 인격을 평가하지 마라 ("당신은", "너는" 인격 평가 금지).
- 표현 자체에 대해서만 대안 제시.
- 출력은 1-2문장.`,

  coaching: `
당신은 1:1 사고 확장 코치입니다. 학생 본인의 발화만 보고 명료화/반론/근거 보완 질문을 제시합니다.
- 다른 학생 의견을 절대 언급·누설하지 마라.
- 학생을 대신해 답안을 쓰지 마라.
- 출력은 항상 질문 형태로 끝나야 한다.`,
};

// ============================================================================
// 출력 검증 (후처리)
// ============================================================================

export type GuardCheckResult = { ok: true } | { ok: false; reason: string };

/**
 * 기능별 출력 안전 검증. 위반 시 ok:false 반환 → 학생에게 미노출.
 */
export function validateOutput(
  feature: AiFeature,
  rawOutput: string,
  context?: { studentNicknames?: string[]; isPersonal?: boolean }
): GuardCheckResult {
  const lower = rawOutput.toLowerCase();

  // 공통: 평가 어휘 차단 (facilitation, compare, evidence, consensus)
  if (['facilitation', 'compare', 'consensus_aid'].includes(feature)) {
    const evaluativePatterns = [
      /더\s*낫/, /더\s*좋/, /정답/, /추천(합|드)/, /(가장|제일).*(좋|적절|훌륭)/,
    ];
    for (const p of evaluativePatterns) {
      if (p.test(rawOutput)) {
        return { ok: false, reason: 'evaluative_language' };
      }
    }
  }

  // evidence_check / coaching: 질문 형태 강제 (마지막 의미 부호가 ?)
  if (feature === 'evidence_check' || feature === 'coaching') {
    const trimmed = rawOutput.trim();
    if (!/[?？]$/.test(trimmed) && !trimmed.includes('?')) {
      return { ok: false, reason: 'must_end_with_question' };
    }
  }

  // attitude_check: 2인칭 인격 평가 차단
  if (feature === 'attitude_check') {
    if (/(너는|당신은)\s*\S+(사람|애|놈|녀석)/.test(rawOutput)) {
      return { ok: false, reason: 'personal_evaluation' };
    }
  }

  // coaching: 다른 학생 닉네임 누설 차단
  if (feature === 'coaching' && context?.isPersonal && context.studentNicknames) {
    for (const nick of context.studentNicknames) {
      if (rawOutput.includes(nick)) {
        return { ok: false, reason: 'leak_other_student' };
      }
    }
  }

  // 빈 응답 차단
  if (rawOutput.trim().length === 0) {
    return { ok: false, reason: 'empty_output' };
  }

  return { ok: true };
}

/**
 * 요약 후처리: 원문 보존율 검증 (간소화된 token-level overlap)
 * @returns overlap 비율 (0-1). 50% 미만이면 의역 과다로 간주 가능.
 */
export function originalRetentionRatio(
  summary: string,
  originalUtterances: string[]
): number {
  const sumTokens = new Set(tokenize(summary));
  if (sumTokens.size === 0) return 0;
  const orig = new Set<string>();
  for (const u of originalUtterances) tokenize(u).forEach((t) => orig.add(t));
  let overlap = 0;
  for (const t of sumTokens) if (orig.has(t)) overlap++;
  return overlap / sumTokens.size;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[.,!?;:(){}[\]"'""''「」『』]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}
