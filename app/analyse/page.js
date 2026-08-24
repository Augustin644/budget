'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import PortfolioAnalysis from '@/app/components/investments/PortfolioAnalysis';
import { useToast } from '@/app/components/ui/Toast';

export default function AnalysePage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { data: accounts, loading: accountsLoading } = useCollection('accounts');
  const { data: investments, loading: investmentsLoading } = useCollection('investments');
  const { data: credits, loading: creditsLoading } = useCollection('credits');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const isLoading = authLoading || accountsLoading || investmentsLoading || creditsLoading;

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const provider = typeof window !== 'undefined' ? localStorage.getItem('ai_provider') : null;
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ai_api_key') : null;

      if (!apiKey) {
        addToast('Aucune cle AI. Allez dans Parametres.', 'error');
        return;
      }

      const safeAcc = (accounts || []).map((a) => ({
        name: String(a.name || ''), bank: String(a.bank || ''), type: String(a.type || ''),
        balance: Number(a.balance) || 0, interestRate: Number(a.interestRate) || 0,
      }));

      const safeInv = (investments || []).map((i) => ({
        name: String(i.name || ''), type: String(i.type || ''),
        investedAmount: Number(i.investedAmount) || 0, currentValue: Number(i.currentValue) || 0,
        gainLoss: Number(i.gainLoss) || 0, gainLossPercent: Number(i.gainLossPercent) || 0,
      }));

      const safeCredits = (credits || []).map((c) => ({
        name: String(c.name || ''), bank: String(c.bank || ''),
        remainingBalance: Number(c.remainingBalance) || 0, annualRate: Number(c.annualRate) || 0,
        totalMonthly: Number(c.totalMonthly) || 0, durationMonths: Number(c.durationMonths) || 0,
      }));

      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: safeAcc, investments: safeInv, credits: safeCredits, apiKey, provider: provider || 'gemini' }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erreur serveur');
      if (!data?.analysis) throw new Error('Pas de donnees');

      setAnalysis(data.analysis);
      addToast('Analyse terminee !', 'success');
    } catch (err) {
      addToast(`Erreur : ${String(err?.message || err)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [accounts, investments, credits, addToast]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyse Patrimoine</h1>
        <p className="text-sm text-gray-400 mt-1">Diagnostic de votre situation financière par IA</p>
      </div>
      <PortfolioAnalysis analysis={analysis} onAnalyze={handleAnalyze} loading={loading} />
    </div>
  );
}
