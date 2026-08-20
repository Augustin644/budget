export const ACCOUNT_TYPES = [
  'Compte courant', 'Livret A', 'LDDS', 'PEL/CEL', 'Autre épargne',
  'PEA', 'CTO', 'Assurance-vie', 'Crypto', 'Non Coté', 'Immobilier'
];

export const ACCOUNT_CATEGORIES = {
  'Compte courant': 'Liquidités',
  'Livret A': 'Épargne',
  'LDDS': 'Épargne',
  'PEL/CEL': 'Épargne',
  'Autre épargne': 'Épargne',
  'PEA': 'Investissement',
  'CTO': 'Investissement',
  'Assurance-vie': 'Investissement',
  'Crypto': 'Investissement',
  'Non Coté': 'Investissement',
  'Immobilier': 'Investissement',
};

export const INVESTMENT_TYPES = ['Action', 'ETF', 'Obligation', 'Fonds', 'Crypto', 'Autre'];

export const TRANSACTION_TYPES = ['Revenu', 'Dépense'];

export const DEFAULT_CATEGORIES = [
  { type: 'Revenu', name: 'Salaire', budgetMonthly: 0 },
  { type: 'Revenu', name: 'Primes / 13e mois', budgetMonthly: 0 },
  { type: 'Revenu', name: 'Aides / Allocations', budgetMonthly: 0 },
  { type: 'Revenu', name: 'Revenus locatifs', budgetMonthly: 0 },
  { type: 'Revenu', name: 'Autres revenus', budgetMonthly: 0 },
  { type: 'Revenu', name: 'Dons & cadeaux reçus', budgetMonthly: 0 },
  { type: 'Dépense', name: 'Logement (loyer/crédit)', budgetMonthly: 0 },
  { type: 'Dépense', name: 'Charges (eau/élec/gaz)', budgetMonthly: 0 },
  { type: 'Dépense', name: 'Alimentation', budgetMonthly: 200 },
  { type: 'Dépense', name: 'Transport', budgetMonthly: 100 },
  { type: 'Dépense', name: 'Assurances', budgetMonthly: 40 },
  { type: 'Dépense', name: 'Santé', budgetMonthly: 50 },
  { type: 'Dépense', name: 'Abonnements & Télécom', budgetMonthly: 20 },
  { type: 'Dépense', name: 'Loisirs & Sorties', budgetMonthly: 100 },
  { type: 'Dépense', name: 'Shopping & Habillement', budgetMonthly: 35 },
  { type: 'Dépense', name: 'Éducation', budgetMonthly: 0 },
  { type: 'Dépense', name: 'Épargne & Investissement', budgetMonthly: 1585 },
  { type: 'Dépense', name: 'Remboursement crédit', budgetMonthly: 0 },
  { type: 'Dépense', name: 'Voyages', budgetMonthly: 50 },
  { type: 'Dépense', name: 'Cadeaux & Dons', budgetMonthly: 50 },
  { type: 'Dépense', name: 'Impôts & Taxes', budgetMonthly: 0 },
  { type: 'Dépense', name: 'Autres dépenses', budgetMonthly: 0 },
];
