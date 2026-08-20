'use client';
import { useMemo } from 'react';
import { getMonthKey } from '@/utils/dates';

export function useBudget(transactions, categories, year, month) {
  return useMemo(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const monthTransactions = transactions.filter((t) => {
      const tMonthKey = getMonthKey(t.date);
      return tMonthKey === monthPrefix;
    });

    const budgetItems = categories.map((cat) => {
      const catTransactions = monthTransactions.filter((t) => t.categoryId === cat.id);

      const realByType = catTransactions.reduce(
        (acc, t) => {
          if (t.type === 'Revenu') acc.revenus += t.amount;
          else acc.depenses += t.amount;
          return acc;
        },
        { revenus: 0, depenses: 0 }
      );

      return {
        category: cat,
        budgetMonthly: cat.budgetMonthly || 0,
        real: cat.type === 'Revenu' ? realByType.revenus : realByType.depenses,
        ecart: (cat.budgetMonthly || 0) - (cat.type === 'Revenu' ? realByType.revenus : realByType.depenses),
        isOverBudget: cat.type === 'Dépense' && (cat.budgetMonthly || 0) < realByType.depenses,
      };
    });

    const totalRevenus = budgetItems
      .filter((b) => b.category.type === 'Revenu')
      .reduce((sum, b) => sum + b.real, 0);
    const totalDepenses = budgetItems
      .filter((b) => b.category.type === 'Dépense')
      .reduce((sum, b) => sum + b.real, 0);
    const totalBudgetDepenses = budgetItems
      .filter((b) => b.category.type === 'Dépense')
      .reduce((sum, b) => sum + b.budgetMonthly, 0);

    return {
      budgetItems,
      totalRevenus,
      totalDepenses,
      totalBudgetDepenses,
      solde: totalRevenus - totalDepenses,
    };
  }, [transactions, categories, year, month]);
}

export function useYearToDateBudget(transactions, categories, year, currentMonth) {
  return useMemo(() => {
    const result = {};

    for (const cat of categories) {
      let cumulBudget = 0;
      let cumulReal = 0;

      for (let m = 1; m <= currentMonth; m++) {
        const monthPrefix = `${year}-${String(m).padStart(2, '0')}`;
        cumulBudget += cat.budgetMonthly || 0;

        const monthTransactions = transactions.filter(
          (t) => t.categoryId === cat.id && getMonthKey(t.date) === monthPrefix
        );
        const monthReal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
        cumulReal += monthReal;
      }

      result[cat.id] = {
        cumulBudget,
        cumulReal,
        reste: cumulBudget - cumulReal,
      };
    }

    return result;
  }, [transactions, categories, year, currentMonth]);
}
