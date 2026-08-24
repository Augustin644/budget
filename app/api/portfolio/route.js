import { NextResponse } from 'next/server';
import { callAI, parseJSON } from '@/lib/ai';

const SYSTEM_PROMPT = `Tu es un expert en gestion de patrimoine. Tu reçois des données financières PRÉ-CALCULÉES. Tu n'as PAS à recalculer les totaux, ils sont déjà fournis. Tu analyses et donnes des conseils.

Tu es pédagogue et factuel. Pas de conseils d'achat/vente d'actions.

Réponds UNIQUEMENT avec ce JSON, sans texte avant/après :
{
  "resume": "Vue d'ensemble en 3-4 phrases",
  "repartition": {
    "description": "..."
  },
  "investissements": {
    "analyse": "..."
  },
  "credits": {
    "analyse": "...",
    "optimisation": "..."
  },
  "pointsForts": [{ "titre": "...", "explication": "...", "donnee": "..." }],
  "pointsAttention": [{ "titre": "...", "explication": "...", "donnee": "...", "severite": "faible|moyen|élevé" }],
  "actionsRecommandees": [{ "titre": "...", "explication": "...", "priorite": "haute|moyenne|basse", "impact": "..." }]
}

Règles:
- 2-5 éléments par tableau
- Tu DOIS utiliser les chiffres fournis, ne les recalcule pas
- Ne jamais inventer de données absentes`;

const INVESTMENT_ACCOUNT_TYPES = ['PEA', 'CTO', 'Assurance-vie', 'Crypto', 'Non Coté', 'Immobilier'];

function buildDataForAI(accounts, investments, credits) {
  const liquidites = (accounts || [])
    .filter((a) => !INVESTMENT_ACCOUNT_TYPES.includes(a.type))
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);

  const epargne = (accounts || [])
    .filter((a) => ['Livret A', 'LDDS', 'PEL/CEL', 'Autre épargne'].includes(a.type))
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);

  const liquiditesPure = liquidites - epargne;

  const totalInvesti = (investments || []).reduce((s, i) => s + (Number(i.investedAmount) || 0), 0);
  const valeurInvestissements = (investments || []).reduce((s, i) => s + (Number(i.currentValue) || 0), 0);
  const plusValue = valeurInvestissements - totalInvesti;
  const plusValuePct = totalInvesti > 0 ? ((plusValue / totalInvesti) * 100).toFixed(1) : '0';

  const repartitionInvest = {};
  (investments || []).forEach((i) => {
    const t = i.type || 'Autre';
    repartitionInvest[t] = (repartitionInvest[t] || 0) + (Number(i.currentValue) || 0);
  });

  const totalCredits = (credits || []).reduce((s, c) => s + (Number(c.remainingBalance) || 0), 0);
  const mensualitesCredits = (credits || []).reduce((s, c) => s + (Number(c.totalMonthly) || 0), 0);

  const totalActifs = liquiditesPure + epargne + valeurInvestissements;
  const patrimoineNet = totalActifs - totalCredits;

  const positions = (investments || []).map((inv) => ({
    name: inv.name,
    type: inv.type,
    invested: inv.investedAmount,
    value: inv.currentValue,
    pl: inv.gainLoss,
    plPct: inv.gainLossPercent,
  }));

  const creditsDetail = (credits || []).map((c) => ({
    name: c.name,
    remaining: c.remainingBalance,
    monthly: c.totalMonthly,
    rate: c.annualRate,
    months: c.durationMonths,
  }));

  return {
    totaux: {
      liquiditesPure,
      epargne,
      totalInvesti,
      valeurInvestissements,
      plusValue,
      plusValuePct: Number(plusValuePct),
      totalActifs,
      totalCredits,
      patrimoineNet,
      mensualitesCredits,
    },
    repartitionInvest,
    positions,
    creditsDetail,
  };
}

function parseAnalysis(raw) {
  try {
    const parsed = parseJSON(raw);
    if (!parsed.resume) throw new Error('Réponse IA incomplète');
    return parsed;
  } catch {
    return {
      resume: String(raw).slice(0, 500),
      repartition: null, investissements: null, credits: null,
      pointsForts: [], pointsAttention: [], actionsRecommandees: [],
    };
  }
}

export async function POST(request) {
  try {
    const { accounts, investments, credits, apiKey, provider } = await request.json();

    if (!apiKey) return NextResponse.json({ error: 'Clé API non configurée' }, { status: 400 });

    const hasData = (accounts?.length > 0) || (investments?.length > 0) || (credits?.length > 0);
    if (!hasData) return NextResponse.json({ error: 'Aucune donnée à analyser' }, { status: 400 });

    const data = buildDataForAI(accounts, investments, credits);
    const userPrompt = `Voici les données pré-calculées du patrimoine. Utilise ces chiffres exacts.\n\n${JSON.stringify(data)}`;

    const raw = await callAI(SYSTEM_PROMPT, userPrompt, apiKey, provider || 'gemini');
    const analysis = parseAnalysis(raw);

    analysis.totaux = data.totaux;

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('[portfolio]', err.message);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
