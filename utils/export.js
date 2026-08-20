import { getCreditRemainingBalance } from '@/utils/amortization';

export function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map((row) =>
      headers
        .map((h) => {
          let val = row[h];
          if (val === null || val === undefined) val = '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(';')
    ),
  ];

  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTransactions(transactions, categories, accounts) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const data = transactions.map((t) => ({
    Date: t.date,
    Type: t.type,
    Catégorie: catMap[t.categoryId] || t.categoryId || '',
    Compte: accMap[t.accountId] || t.accountId || '',
    Description: t.description || '',
    Montant: t.amount,
  }));

  data.sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));
  downloadCSV(data, `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportAccounts(accounts) {
  const data = accounts.map((a) => ({
    Banque: a.bank || '',
    Nom: a.name || '',
    Type: a.type || '',
    Propriétaire: a.owner || '',
    Solde: a.balance || 0,
    'Taux annuel': a.interestRate || 0,
    Catégorie: a.category || '',
    Notes: a.notes || '',
  }));

  downloadCSV(data, `comptes_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportInvestments(investments, accounts) {
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const data = investments.map((i) => ({
    Compte: accMap[i.accountId] || i.accountId || '',
    Nom: i.name || '',
    Type: i.type || '',
    Quantité: i.quantity || 0,
    'Prix de revient': i.averageCost || 0,
    'Cours actuel': i.currentPrice || 0,
    'Montant investi': i.investedAmount || 0,
    'Valeur actuelle': i.currentValue || 0,
    'Plus/moins-value': i.gainLoss || 0,
    'Rendement %': i.gainLossPercent ? (i.gainLossPercent * 100).toFixed(2) : '0',
  }));

  downloadCSV(data, `investissements_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportCredits(credits) {
  const data = credits.map((c) => ({
    Nom: c.name || '',
    Banque: c.bank || '',
    Capital: c.principal || 0,
    'Taux annuel': c.annualRate || 0,
    'Durée (mois)': c.durationMonths || 0,
    'Date début': c.startDate || '',
    Mensualité: c.monthlyPayment || 0,
    Assurance: c.insurance || 0,
    'Total mensuel': c.totalMonthly || 0,
    'Capital restant dû': getCreditRemainingBalance(c),
    'Date fin': c.endDate || '',
  }));

  downloadCSV(data, `credits_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportCategories(categories) {
  const data = categories.map((c) => ({
    Type: c.type || '',
    Nom: c.name || '',
    'Budget mensuel': c.budgetMonthly || 0,
    Notes: c.notes || '',
  }));

  downloadCSV(data, `categories_${new Date().toISOString().slice(0, 10)}.csv`);
}
