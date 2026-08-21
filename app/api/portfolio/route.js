import { NextResponse } from 'next/server';
import { callGemini, parseJSON } from '@/lib/ai';

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

  return {
    positions,
    totalInvested,
    totalValue,
    gainLoss: totalValue - totalInvested,
    gainLossPct: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested * 100).toFixed(2) : 0,
    accounts: accountsSummary,
  };
}

function parseAnalysis(raw) {
  try {
    const parsed = parseJSON(raw);
    if (!parsed.resume || !parsed.pointsForts) {
      throw new Error('Réponse IA incomplète');
    }
    return parsed;
  } catch {
    return {
      resume: String(raw).slice(0, 500),
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
    const { investments, accounts, apiKey } = await request.json();

    if (!investments || investments.length === 0) {
      return NextResponse.json({ error: 'Aucun investissement fourni' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée' }, { status: 400 });
    }

    const portfolioData = formatPortfolioData(investments, accounts);
    const userPrompt = `Analyse ce portefeuille et fournis un diagnostic structuré.\n\n${JSON.stringify(portfolioData)}`;

    const raw = await callGemini(SYSTEM_PROMPT, userPrompt, apiKey);
    const analysis = parseAnalysis(raw);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('[portfolio]', err.message);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
