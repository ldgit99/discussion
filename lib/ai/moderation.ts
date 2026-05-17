import { openaiClient } from './provider';

/**
 * 1차: OpenAI Moderation API
 * 2차: 자체 한국어 키워드 사전
 * 참조: CLAUDE.md C5 (심리적 안전감), C8 (자동 트리거)
 */

// 청소년 토의 맥락에서 차단해야 할 한국어 표현
const BLOCK_KEYWORDS = [
  '병신', '바보', '멍청', '미친', '꺼져', '닥쳐',
  '죽어', '죽이', '쓰레기', '재수없', '한심',
  // 차별 표현
  '장애인아', '게이', '레즈',
];

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: string; categories?: string[] };

export async function moderate(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) return { ok: true };

  // 2차 키워드 (빠른 차단)
  const lower = text.toLowerCase();
  for (const kw of BLOCK_KEYWORDS) {
    if (lower.includes(kw)) {
      return { ok: false, reason: 'keyword_filter', categories: [kw] };
    }
  }

  // 1차 OpenAI Moderation
  try {
    const res = await openaiClient().moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    });
    const r = res.results[0];
    if (r?.flagged) {
      const cats = Object.entries(r.categories ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k);
      return { ok: false, reason: 'openai_moderation', categories: cats };
    }
    return { ok: true };
  } catch {
    // Moderation 실패 시 보수적으로 통과 (UX 우선) — 운영 시 정책 재검토 필요
    return { ok: true };
  }
}
