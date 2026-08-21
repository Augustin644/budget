import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Tu es un conseiller financier pédagogue. Analyses un portefeuille et retourne un diagnostic JSON structuré.

RÈGLES : Pas de conseils d'achat/vente. Distingue faits et interprétations. Sois pédagogue.

Réponds UNIQUEMENT avec ce JSON, sans texte avant/après :
{
  "resume": "Vue d'ensemble en 2-3 phrases",
  "repartition": { "parType": { "Action": 45, "ETF": 35 }, "description": "..." },
  "pointsForts": [{ "titre": "...", "explication": "...", "donnee": "..." }],
  "pointsAttention": [{ "titre": "...", "explication": "...", "donnee": "...", "severite": "faible|moyen|élevé" }],
  "axesAmelioration": [{ "titre": "...", "explication": "...", "avantages": ["..."], "inconvenients": ["..."] }],
  "metriques": { "diversification": "score 1-10", "risqueGlobal": "faible|moyen|élevé" }
}

2-5 éléments par tableau. Données chiffrées. Ne jamais inventer de données absentes du portefeuille.`;

function formatPortfolioData(investments, accounts) {
  const positions = investments.map((inv) => ({
    name: inv.name,
    type: inv.type,
    qty: inv.quantity,
    cost: inv.averageCost,
    price: inv.currentPrice,
    invested: inv.investedAmount,
    value: inv.currentValue,
    pl: inv.gainLoss,
    plPct: inv.gainLossPercent,
  }));

  const totalInvested = positions.reduce((s, p) => s + (p.invested || 0), 0);
  const totalValue = positions.reduce((s, p) => s + (p.value || 0), 0);

  const accountsSummary = (accounts || []).map((a) => ({
    name: a.name,
    type: a.type,
    balance: a.balance,
  }));

  return JSON.stringify({
    positions,
    totalInvested,
    totalValue,
    gainLoss: totalValue - totalInvested,
    gainLossPct: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested * 100).toFixed(2) : 0,
    accounts: accountsSummary,
  });
}

async function fetchWithRetry(url, options, retries = 0, delay = 1500) {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      if (i < retries && (res.status === 503 || res.status === 429 || res.status === 500)) {
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Timeout ou reseau: ${err.message}`);
    }
  }
}

async function callAI(text, provider, apiKey) {
  const providers = {
    openai: {
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      buildBody: (messages) => JSON.stringify({ model: 'gpt-4o', messages, temperature: 0.2, max_tokens: 1500 }),
      extract: (data) => data.choices[0].message.content,
    },
    anthropic: {
      url: 'https://api.anthropic.com/v1/messages',
      model: 'claude-sonnet-4-20250514',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      buildBody: (messages) => JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: messages.filter((m) => m.role !== 'system'),
      }),
      extract: (data) => data.content[0].text,
      skipSystemInMessages: true,
    },
    mistral: {
      url: 'https://api.mistral.ai/v1/chat/completions',
      model: 'mistral-small-latest',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      buildBody: (messages) => JSON.stringify({ model: 'mistral-small-latest', messages, temperature: 0.2, max_tokens: 1500 }),
      extract: (data) => data.choices[0].message.content,
    },
    gemini: {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: 'gemini-2.5-flash',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      buildBody: (messages) => JSON.stringify({ model: 'gemini-2.5-flash', messages, temperature: 0.2, max_tokens: 1500 }),
      extract: (data) => data.choices[0].message.content,
      mergeSystemIntoUser: true,
    },
  };

  const config = providers[provider] || providers.openai;

  let messages;
  if (config.skipSystemInMessages) {
    messages = [{ role: 'user', content: text }];
  } else if (config.mergeSystemIntoUser) {
    messages = [{ role: 'user', content: `${SYSTEM_PROMPT}\n\n${text}` }];
  } else {
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];
  }

  const res = await fetchWithRetry(config.url, {
    method: 'POST',
    headers: config.headers,
    body: config.buildBody(messages),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur ${provider}: ${res.status}`);
  }

  const data = await res.json();
  return config.extract(data);
}

function parseAnalysis(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.resume || !parsed.pointsForts) {
      throw new Error('Réponse IA incomplète');
    }
    return parsed;
  } catch {
    return {
      resume: cleaned.slice(0, 500),
      pointsForts: [],
      pointsAttention: [],
      axesAmelioration: [],
      metriques: null,
      repartition: null,
    };
  }
}

export async function POST(request) {
  try {
    const { investments, accounts, provider, apiKey } = await request.json();

    if (!investments || investments.length === 0) {
      return NextResponse.json({ error: 'Aucun investissement fourni' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée' }, { status: 400 });
    }

    const usedProvider = provider || 'gemini';
    const portfolioText = formatPortfolioData(investments, accounts);
    const prompt = `Analyse ce portefeuille et fournis un diagnostic structuré.\n\n${portfolioText}`;

    const raw = await callAI(prompt, usedProvider, apiKey);
    const analysis = parseAnalysis(raw);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('[portfolio] Error:', err.message, err.stack);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
