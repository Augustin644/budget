const TIMEOUT_MS = 8000;

const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildHeaders: (apiKey) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }),
    buildBody: (systemPrompt, userPrompt) => ({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
    extract: (data) => data.choices[0].message.content,
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (systemPrompt, userPrompt) => ({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    extract: (data) => data.content[0].text,
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    buildHeaders: (apiKey) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }),
    buildBody: (systemPrompt, userPrompt) => ({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
    extract: (data) => data.choices[0].message.content,
  },
  gemini: {
    url: (model, apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    model: 'gemini-2.0-flash',
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (systemPrompt, userPrompt) => ({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    }),
    extract: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text,
  },
};

export async function callAI(systemPrompt, userPrompt, apiKey, provider = 'gemini') {
  const config = PROVIDERS[provider] || PROVIDERS.gemini;

  const url = typeof config.url === 'function'
    ? config.url(config.model, apiKey)
    : config.url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify(config.buildBody(systemPrompt, userPrompt)),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `${provider} ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const text = config.extract(data);
    if (!text) throw new Error(`Reponse ${provider} vide`);
    return text;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`${provider} timeout (>8s)`);
    throw err;
  }
}

export function parseJSON(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}
