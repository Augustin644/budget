import { NextResponse } from 'next/server';
import { callAI, parseJSON } from '@/lib/ai';

const SYSTEM_PROMPT = `Tu es un expert en gestion de patrimoine. Tu analyses la situation financière complète d'un particulier et retournes un diagnostic structuré.

IMPORTANT: Les comptes de type PEA, CTO, Assurance-vie, Crypto, Non Coté, Immobilier sont des COMPTES-TITRES. Leur solde EST la valeur des investissements qu'ils contiennent. Ne les additionne PAS avec la valeur des investissements (ce serait du double comptage). Les investissements fournis séparément sont les positions DANS ces comptes.

Tu analyses : comptes (liquidités + épargne), investissements (positions), crédits. Tu es pédagogue et factuel. Pas de conseils d'achat/vente d'actions.

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
    "description": "..."
  },
  "investissements": {
    "totalInvesti": 0,
    "valeurActuelle": 0,
    "plusValue": 0,
    "plusValuePct": 0,
    "analyse": "..."
  },
  "credits": {
    "totalRestant": 0,
    "mensualiteTotale": 0,
    "dureeRestanteMois": 0,
    "chargeEndettement": 0,
    "analyse": "...",
    "optimisation": "..."
  },
  "pointsForts": [{ "titre": "...", "explication": "...", "donnee": "..." }],
  "pointsAttention": [{ "titre": "...", "explication": "...", "donnee": "...", "severite": "faible|moyen|élevé" }],
  "actionsRecommandees": [{ "titre": "...", "explication": "...", "priorite": "haute|moyenne|basse", "impact": "..." }],
  "metriques": {
    "tauxEndettement": 0,
    "reserveLiquiditeMois": 0,
    "diversification": "score 1-10",
    "risqueGlobal": "faible|moyen|élevé"
  }
}

Règles:
- 2-5 éléments par tableau. Montants en euros. Ne jamais inventer de données absentes.
- totalActifs = liquidités + épargne + valeur totale des investissements (PAS les soldes des comptes-titres)
- chargeEndettement = mensualités dette / revenus estimés × 100`;

const INVESTMENT_ACCOUNT_TYPES = ['PEA', 'CTO', 'Assurance-vie', 'Crypto', 'Non Coté', 'Immobilier'];

function formatAllData(data) {
  const { accounts, investments, credits } = data;

  const liquidites = (accounts || [])
    .filter((a) => !INVESTMENT_ACCOUNT_TYPES.includes(a.type))
    .map((a) => ({ name: a.name, bank: a.bank, type: a.type, balance: a.balance }));

  const investAccounts = (accounts || [])
    .filter((a) => INVESTMENT_ACCOUNT_TYPES.includes(a.type))
    .map((a) => ({ name: a.name, type: a.type }));

  return {
    comptes: { liquiditesEpargne: liquidites, comptesTitres: investAccounts },
    positions: (investments || []).map((inv) => ({
      name: inv.name, type: inv.type, invested: inv.investedAmount, value: inv.currentValue,
      pl: inv.gainLoss, plPct: inv.gainLossPercent,
    })),
    credits: (credits || []).map((c) => ({
      name: c.name, remaining: c.remainingBalance, monthly: c.totalMonthly,
      rate: c.annualRate, months: c.durationMonths,
    })),
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
      bilan: null, repartition: null, investissements: null, credits: null,
      pointsForts: [], pointsAttention: [], actionsRecommandees: [], metriques: null,
    };
  }
}

export async function POST(request) {
  try {
    const { accounts, investments, credits, apiKey, provider } = await request.json();

    if (!apiKey) return NextResponse.json({ error: 'Clé API non configurée' }, { status: 400 });

    const hasData = (accounts?.length > 0) || (investments?.length > 0) || (credits?.length > 0);
    if (!hasData) return NextResponse.json({ error: 'Aucune donnée à analyser' }, { status: 400 });

    const allData = formatAllData({ accounts, investments, credits });
    const userPrompt = `Analyse ce patrimoine.\n\n${JSON.stringify(allData)}`;

    const raw = await callAI(SYSTEM_PROMPT, userPrompt, apiKey, provider || 'gemini');
    const analysis = parseAnalysis(raw);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('[portfolio]', err.message);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
