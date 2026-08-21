import { NextResponse } from 'next/server';
import { callGemini, parseJSON } from '@/lib/ai';

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

function parseTransactions(raw) {
  try {
    const parsed = parseJSON(raw);
    if (!Array.isArray(parsed)) throw new Error('Le résultat n\'est pas un tableau');
    return parsed.filter(
      (t) => t.date && t.amount && (t.type === 'Revenu' || t.type === 'Dépense')
    );
  } catch {
    throw new Error('Réponse IA non parsable. Essayez à nouveau.');
  }
}

export async function POST(request) {
  try {
    const { text, apiKey } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Aucun texte fourni' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée. Ajoutez-la dans Paramètres.' }, { status: 400 });
    }

    const userPrompt = `Voici le contenu du relevé bancaire à analyser :\n\n${text}`;
    const raw = await callGemini(SYSTEM_PROMPT, userPrompt, apiKey);
    const transactions = parseTransactions(raw);

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (err) {
    console.error('[scan]', err.message);
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
