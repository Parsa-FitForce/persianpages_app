/**
 * Provider-agnostic LLM helper for PersianPages scripts.
 *
 * Supports OpenAI (default) and Anthropic as fallback.
 * Set LLM_PROVIDER=anthropic to use Anthropic instead.
 */

export async function callLLM(
  prompt: string,
  options?: { maxTokens?: number; model?: string },
): Promise<string | null> {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const maxTokens = options?.maxTokens || 4096;

  if (provider === 'openai') {
    return callOpenAI(prompt, maxTokens, options?.model);
  } else {
    return callAnthropic(prompt, maxTokens, options?.model);
  }
}

async function callOpenAI(
  prompt: string,
  maxTokens: number,
  model?: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_completion_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  OpenAI API error (${res.status}): ${text}`);
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callAnthropic(
  prompt: string,
  maxTokens: number,
  model?: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  Anthropic API error (${res.status}): ${text}`);
    return null;
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || null;
}

/** Validate that the configured LLM provider has its API key set. */
export function validateLLMConfig(): void {
  const provider = process.env.LLM_PROVIDER || 'openai';
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY (LLM_PROVIDER=openai)');
  }
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY (LLM_PROVIDER=anthropic)');
  }
}
