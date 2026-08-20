'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import KPICard from '@/app/components/ui/KPICard';
import Button from '@/app/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { calculatePatrimoine } from '@/utils/patrimoine';
import { getToday, getMonthKey, getMonthLabel } from '@/utils/dates';
import { useToast } from '@/app/components/ui/Toast';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { data: accounts, loading: accountsLoading } = useCollection('accounts');
  const { data: investments, loading: investmentsLoading } = useCollection('investments');
  const { data: credits, loading: creditsLoading } = useCollection('credits');
  const { data: transactions, loading: txLoading } = useCollection('transactions');
  const { data: categories, loading: catLoading } = useCollection('categories');
  const { data: patrimoineHistory, loading: phLoading, add: addPatrimoineHistory } = useCollection('patrimoineHistory');

  const loading = authLoading || accountsLoading || investmentsLoading || creditsLoading || txLoading || catLoading;

  const patrimoine = useMemo(() => calculatePatrimoine(accounts, investments, credits), [accounts, investments, credits]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTransactions = transactions.filter(t => getMonthKey(t.date) === key);
      const revenus = monthTransactions.filter(t => t.type === 'Revenu').reduce((s, t) => s + t.amount, 0);
      const depenses = monthTransactions.filter(t => t.type === 'Dépense').reduce((s, t) => s + t.amount, 0);
      data.push({
        name: MONTHS_SHORT[d.getMonth()],
        Revenus: revenus,
        Dépenses: depenses,
      });
    }
    return data;
  }, [transactions, currentYear, currentMonth]);

  const patrimoineChartData = useMemo(() => patrimoineHistory
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(-12)
    .map(p => ({
      date: p.date ? getMonthLabel(p.date) : '',
      'Patrimoine net': p.netWorth || 0,
      Dettes: p.totalDebts || 0,
    })), [patrimoineHistory]);

  const handleFreezePatrimoine = async () => {
    await addPatrimoineHistory({
      date: getToday(),
      liquidites: patrimoine.liquidites,
      epargne: patrimoine.epargne,
      investissements: patrimoine.investissements,
      totalAssets: patrimoine.totalAssets,
      totalDebts: patrimoine.totalDebts,
      netWorth: patrimoine.netWorth,
    });
    addToast('Patrimoine figé ! Un point d\'historique a été créé.', 'success');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-white">Bienvenue</h1>
        <p className="text-gray-400">Connectez-vous pour accéder à vos finances</p>
        <Link href="/auth" className="bg-[#39F6D6] text-[#0B0F1A] px-6 py-2 rounded-lg font-medium hover:bg-[#2de0bf]">
          Se connecter
        </Link>
      </div>
    );
  }

  const monthTx = transactions.filter(t => getMonthKey(t.date) === currentMonthKey);
  const monthlyRevenus = monthTx.filter(t => t.type === 'Revenu').reduce((s, t) => s + t.amount, 0);
  const monthlyDepenses = monthTx.filter(t => t.type === 'Dépense').reduce((s, t) => s + t.amount, 0);
  const monthlySolde = monthlyRevenus - monthlyDepenses;
  const totalMensualites = credits.reduce((s, c) => s + (c.totalMonthly || c.monthlyPayment || 0), 0);

  const pieData = [
    { name: 'Liquidités', value: patrimoine.liquidites, color: '#39F6D6' },
    { name: 'Épargne', value: patrimoine.epargne, color: '#9B6BFF' },
    { name: 'Investissements', value: patrimoine.investissements, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-1">Vue d&apos;ensemble de vos finances</p>
        </div>
        <Button variant="violet" size="sm" onClick={handleFreezePatrimoine}>Figer le patrimoine</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/comptes">
          <KPICard
            title="Patrimoine net"
            value={formatCurrency(patrimoine.netWorth)}
            icon="💰"
            color={patrimoine.netWorth >= 0 ? 'cyan' : 'red'}
          />
        </Link>
        <Link href="/credits">
          <KPICard
            title="Dettes"
            value={formatCurrency(patrimoine.totalDebts)}
            icon="💳"
            color="violet"
          />
        </Link>
        <Link href="/budget">
          <KPICard
            title="Solde du mois"
            value={formatCurrency(monthlySolde)}
            icon="📊"
            color={monthlySolde >= 0 ? 'green' : 'red'}
          />
        </Link>
        <Link href="/credits">
          <KPICard
            title="Mensualités"
            value={formatCurrency(totalMensualites)}
            icon="📅"
            color="violet"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Évolution patrimoine</h3>
          {patrimoineChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={patrimoineChartData}>
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={v => formatCurrency(v)} />
                <Line type="monotone" dataKey="Patrimoine net" stroke="#39F6D6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Dettes" stroke="#9B6BFF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
              Ajoutez des points d&apos;historique pour voir l&apos;évolution
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Répartition du patrimoine</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={v => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
              Aucune donnée
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Revenus vs Dépenses</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={v => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="Revenus" fill="#39F6D6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Dépenses" fill="#9B6BFF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Liquidités</p>
              <p className="text-lg font-bold text-[#39F6D6] mt-1">{formatCurrency(patrimoine.liquidites)}</p>
            </div>
            <span className="text-2xl">💵</span>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Épargne</p>
              <p className="text-lg font-bold text-[#9B6BFF] mt-1">{formatCurrency(patrimoine.epargne)}</p>
            </div>
            <span className="text-2xl">🏦</span>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Investissements</p>
              <p className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(patrimoine.investissements)}</p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
