import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de relevés bancaires français.
Tu dois extraire toutes les transactions du texte fourni et les retourner en JSON.

Pour chaque transaction, retourne :
- "date" : date au format YYYY-MM-DD
- "description" : description de la transaction (court, 5-10 mots max)
- "amount" : montant en euros (nombre positif, toujours en valeur absolue)
- "type" : "Revenu" ou "Dépense"

Règles :
- Les virements entrants, salaires, remboursements, credits sont des "Revenu"
- Les paiements, prélèvements, virements sortants sont des "Dépense"
- Les opérations en double (ligne de débit + ligne de libellé, ou la même transaction apparue 2 fois) ne doivent apparaître qu'une seule fois
- Si une transaction apparaît avec des montants différents (ex: montant en devise étrangère + montant en EUR), ne garder que la version en EUR
- Les montants doivent être positifs (l'information Revenu/Dépense est dans le type)
- Ignore les lignes qui ne sont pas des transactions (soldes, intérêts comptables, lignes de résumé, frais de tenue de compte)
- Chaque transaction doit être unique par combinaison (date + montant + description similaires)

Retourne UNIQUEMENT un tableau JSON valide, sans texte avant ou après.
Format attendu :
[
  {"date": "2024-01-15", "description": "Amazon achat en ligne", "amount": 45.99, "type": "Dépense"},
  {"date": "2024-01-01", "description": "Virement salaire", "amount": 2500.00, "type": "Revenu"}
]`;

async function callOpenAI(text, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Voici le contenu du relevé bancaire à analyser :\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur OpenAI: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(text, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Voici le contenu du relevé bancaire à analyser :\n\n${text}` },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur Anthropic: ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callMistral(text, apiKey) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Voici le contenu du relevé bancaire à analyser :\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur Mistral: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(text, apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Voici le contenu du relevé bancaire à analyser :\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur Gemini: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

function parseTransactions(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Le résultat n\'est pas un tableau');
  return parsed.filter(
    (t) => t.date && t.amount && (t.type === 'Revenu' || t.type === 'Dépense')
  );
}

export async function POST(request) {
  try {
    const { text, provider, apiKey } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Aucun texte fourni' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée. Ajoutez-la dans Paramètres.' }, { status: 400 });
    }

    let raw;
    if (provider === 'anthropic') {
      raw = await callAnthropic(text, apiKey);
    } else if (provider === 'mistral') {
      raw = await callMistral(text, apiKey);
    } else if (provider === 'gemini') {
      raw = await callGemini(text, apiKey);
    } else {
      raw = await callOpenAI(text, apiKey);
    }

    const transactions = parseTransactions(raw);

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
