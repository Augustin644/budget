import { NextResponse } from 'next/server';
import { callAI, parseJSON } from '@/lib/ai';

const SYSTEM_PROMPT = `Tu es un expert en gestion de patrimoine et conseiller financier personnel. Tu analyses l'ensemble de la situation financière d'un particulier et retournes un diagnostic complet et structuré.

Tu analyses TOUTES les dimensions : comptes, épargne, investissements, crédits, revenus, dépenses, budgets.
Tu es pédagogue, factuel, et tu distingues faits et interprétations. Pas de conseils d'achat/vente d'actions.
Tu donnes des recommandations concrètes et chiffrées.

Réponds UNIQUEMENT avec ce JSON, sans texte avant/après :
{
  "resume": "Vue d'ensemble du patrimoine en 3-4 phrases",
  "bilan": {
    "totalActifs": 0,
    "totalPassifs": 0,
    "patrimoineNet": 0,
    "description": "..."
  },
  "repartition": {
    "parType": { "Liquidites": 0, "Epargne": 0, "Investissements": 0 },
    "parSupport": { "PEA": 0, "CTO": 0, "Assurance-vie": 0, "Crypto": 0, "Immobilier": 0 },
    "description": "..."
  },
  "fluxFinanciers": {
    "revenuMensuel": 0,
    "depenseMensuelle": 0,
    "epargneMensuelle": 0,
    "tauxEpargne": 0,
    "description": "..."
  },
  "budget": {
    "categoriesSuralimentees": [{ "nom": "...", "budget": 0, "depenseReelle": 0, "ecart": 0 }],
    "categoriesSousBudget": [{ "nom": "...", "budget": 0, "depenseReelle": 0 }],
    "description": "..."
  },
  "credits": {
    "totalRestant": 0,
    "mensualiteTotale": 0,
    "dureeRestanteMois": 0,
    "chargeEndettement": 0,
    "analyse": "...",
    "optimisation": "..."
  },
  "investissements": {
    "totalInvesti": 0,
    "valeurActuelle": 0,
    "plusValue": 0,
    "plusValuePct": 0,
    "repartition": { "Action": 0, "ETF": 0, "Obligation": 0, "Crypto": 0, "Autre": 0 },
    "analyse": "..."
  },
  "pointsForts": [{ "titre": "...", "explication": "...", "donnee": "..." }],
  "pointsAttention": [{ "titre": "...", "explication": "...", "donnee": "...", "severite": "faible|moyen|élevé" }],
  "actionsRecommandees": [{ "titre": "...", "explication": "...", "priorite": "haute|moyenne|basse", "impact": "..." }],
  "metriques": {
    "tauxEndettement": 0,
    "tauxEpargne": 0,
    "reserveLiquiditeMois": 0,
    "diversification": "score 1-10",
    "risqueGlobal": "faible|moyen|élevé"
  }
}

Règles:
- 2-5 éléments par tableau
- Tous les montants en euros
- Ne jamais inventer de données absentes
- Le taux d'endettement = charges mensuelles de dette / revenus mensuels × 100
- La réserve de liquidités = liquidités / dépenses mensuelles (en mois)
- ActionsRecommandees doit contenir 3-5 recommandations concrètes avec impact estimé`;

function formatAllData(data) {
  const { accounts, investments, credits, transactions, categories } = data;

  const accountsSummary = (accounts || []).map((a) => ({
    name: a.name,
    bank: a.bank,
    type: a.type,
    balance: a.balance,
    interestRate: a.interestRate,
  }));

  const investmentsSummary = (investments || []).map((inv) => ({
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

  const creditsSummary = (credits || []).map((c) => ({
    name: c.name,
    bank: c.bank,
    principal: c.principal,
    remainingBalance: c.remainingBalance,
    annualRate: c.annualRate,
    monthlyPayment: c.monthlyPayment,
    insurance: c.insurance,
    totalMonthly: c.totalMonthly,
    durationMonths: c.durationMonths,
    startDate: c.startDate,
    endDate: c.endDate,
  }));

  const categoriesSummary = (categories || []).map((c) => ({
    name: c.name,
    type: c.type,
    budgetMonthly: c.budgetMonthly,
  }));

  const txSummary = (transactions || []).slice(-100).map((t) => ({
    date: t.date,
    type: t.type,
    amount: t.amount,
    description: t.description,
  }));

  return {
    accounts: accountsSummary,
    investments: investmentsSummary,
    credits: creditsSummary,
    categories: categoriesSummary,
    recentTransactions: txSummary,
  };
}

function parseAnalysis(raw) {
  try {
    const parsed = parseJSON(raw);
    if (!parsed.resume) {
      throw new Error('Reponse IA incomplete');
    }
    return parsed;
  } catch {
    return {
      resume: String(raw).slice(0, 500),
      bilan: null,
      repartition: null,
      fluxFinanciers: null,
      budget: null,
      credits: null,
      investissements: null,
      pointsForts: [],
      pointsAttention: [],
      actionsRecommandees: [],
      metriques: null,
    };
  }
}

export async function POST(request) {
  try {
    const { accounts, investments, credits, transactions, categories, apiKey, provider } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Cle API non configuree' }, { status: 400 });
    }

    const hasData = (accounts?.length > 0) || (investments?.length > 0) || (credits?.length > 0) || (transactions?.length > 0);
    if (!hasData) {
      return NextResponse.json({ error: 'Aucune donnee a analyser' }, { status: 400 });
    }

    const allData = formatAllData({ accounts, investments, credits, transactions, categories });
    const userPrompt = `Analyse complete de ce patrimoine. Sois un expert en gestion de patrimoine.\n\n${JSON.stringify(allData)}`;

    const raw = await callAI(SYSTEM_PROMPT, userPrompt, apiKey, provider || 'gemini');
    const analysis = parseAnalysis(raw);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('[portfolio]', err.message);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
