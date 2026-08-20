import { ACCOUNT_CATEGORIES } from '@/lib/constants';
import { getCreditRemainingBalance } from '@/utils/amortization';

export function calculatePatrimoine(accounts, investments, credits) {
  let liquidites = 0;
  let epargne = 0;
  let investissements = 0;

  for (const account of accounts) {
    const category = ACCOUNT_CATEGORIES[account.type] || 'Autre';
    const balance = account.balance || 0;

    if (category === 'Liquidités') {
      liquidites += balance;
    } else if (category === 'Épargne') {
      epargne += balance;
    } else if (category === 'Investissement') {
      investissements += balance;
    }
  }

  const totalAssets = liquidites + epargne + investissements;
  const totalDebts = (credits || []).reduce((sum, c) => sum + getCreditRemainingBalance(c), 0);
  const netWorth = totalAssets - totalDebts;

  return {
    liquidites: Math.round(liquidites * 100) / 100,
    epargne: Math.round(epargne * 100) / 100,
    investissements: Math.round(investissements * 100) / 100,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalDebts: Math.round(totalDebts * 100) / 100,
    netWorth: Math.round(netWorth * 100) / 100,
  };
}

export function calculatePortfolioTotals(investments) {
  let totalInvested = 0;
  let totalValue = 0;

  for (const inv of investments) {
    totalInvested += inv.investedAmount || 0;
    totalValue += inv.currentValue || 0;
  }

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    gainLoss: Math.round((totalValue - totalInvested) * 100) / 100,
    gainLossPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) : 0,
  };
}

export function getAccountDisplayValue(account) {
  return account.balance || 0;
}
