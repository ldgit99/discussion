import OpenAI from 'openai';

/**
 * OpenAI Provider — CLAUDE.md C10: OpenAI 확정.
 * 향후 교체 대비해 이 파일로 추상화 격리.
 */

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY missing in env');
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * 일반 chat completion. JSON 모드는 별도 함수 사용.
 */
export async function chat(opts: {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}): Promise<string> {
  const resp = await client().chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.max_tokens ?? 600,
  });
  return resp.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * JSON 모드 응답. response_format: json_object 강제.
 */
export async function chatJson<T = unknown>(opts: {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}): Promise<T> {
  const resp = await client().chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.max_tokens ?? 800,
    response_format: { type: 'json_object' },
  });
  const raw = resp.choices[0]?.message?.content?.trim() ?? '{}';
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('AI returned invalid JSON');
  }
}

export { client as openaiClient };
