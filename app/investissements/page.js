'use client';
import { useState, useMemo } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import Badge from '@/app/components/ui/Badge';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import { useToast } from '@/app/components/ui/Toast';
import EmptyState from '@/app/components/ui/EmptyState';
import PortfolioAnalysis from '@/app/components/investments/PortfolioAnalysis';
import { formatCurrency, formatPercent, formatNumber } from '@/utils/currency';
import { getToday, getMonthLabel } from '@/utils/dates';
import { calculatePortfolioTotals, calculatePatrimoine } from '@/utils/patrimoine';
import { INVESTMENT_TYPES } from '@/lib/constants';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const EMPTY_FORM = {
  accountId: '',
  name: '',
  type: 'ETF',
  quantity: '',
  averageCost: '',
  currentPrice: '',
};

export default function InvestissementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { data: accounts, loading: accountsLoading } = useCollection('accounts');
  const { data: investments, loading: investmentsLoading, add, update, remove } = useCollection('investments');
  const { data: credits } = useCollection('credits');
  const { data: investmentHistory, add: addHistory } = useCollection('investmentHistory');
  const { data: patrimoineHistory, add: addPatrimoineHistory } = useCollection('patrimoineHistory');
  const [showModal, setShowModal] = useState(false);
  const [editingInv, setEditingInv] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activePositions, setActivePositions] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const loading = authLoading || accountsLoading || investmentsLoading;

  const sortedHistory = useMemo(() =>
    [...investmentHistory].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [investmentHistory]
  );

  const allPositionNames = useMemo(() => {
    const names = new Set();
    for (const snap of sortedHistory) {
      if (snap.positions) {
        for (const p of snap.positions) names.add(p.name);
      }
    }
    return [...names];
  }, [sortedHistory]);

  const togglePosition = (name) => {
    setActivePositions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleAnalyze = async () => {
    setAnalysisLoading(true);
    try {
      const provider = typeof window !== 'undefined' ? localStorage.getItem('ai_provider') : null;
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ai_api_key') : null;

      if (!apiKey) {
        addToast({ type: 'error', message: 'Aucune clé AI configurée. Allez dans Paramètres > Config AI.' });
        return;
      }

      if (!investments || investments.length === 0) {
        addToast({ type: 'error', message: 'Aucun investissement à analyser.' });
        return;
      }

      const usedProvider = provider || 'gemini';
      addToast({ type: 'info', message: `Analyse avec ${usedProvider}...` });

      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investments,
          accounts,
          provider: usedProvider,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);

      setAnalysis(data.analysis);
      addToast({ type: 'success', message: 'Analyse terminée !' });
    } catch (err) {
      addToast({ type: 'error', message: `Erreur : ${err.message}` });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const globalChartData = useMemo(() => {
    if (sortedHistory.length === 0) return [];
    if (activePositions.size === 0) {
      return sortedHistory.map((snap) => ({
        date: snap.date ? getMonthLabel(snap.date) : snap.date,
        'Valeur totale': snap.totalValue || 0,
        'Montant investi': snap.totalInvested || 0,
      }));
    }
    return sortedHistory.map((snap) => {
      const point = { date: snap.date ? getMonthLabel(snap.date) : snap.date };
      if (snap.positions) {
        for (const p of snap.positions) {
          if (activePositions.has(p.name)) {
            point[p.name] = p.currentValue || 0;
          }
        }
      }
      return point;
    });
  }, [sortedHistory, activePositions]);

  const sparklineData = useMemo(() => {
    if (sortedHistory.length === 0) return {};
    const result = {};
    for (const name of allPositionNames) {
      result[name] = sortedHistory.map((snap) => {
        const pos = snap.positions?.find((p) => p.name === name);
        return { date: snap.date, value: pos?.currentValue || 0 };
      });
    }
    return result;
  }, [sortedHistory, allPositionNames]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const investmentAccounts = accounts.filter(a => {
    const cat = a.type;
    return ['PEA', 'CTO', 'Crypto', 'Non Coté', 'Assurance-vie'].includes(cat);
  });

  const totals = calculatePortfolioTotals(investments);

  const openAdd = () => {
    setEditingInv(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (inv) => {
    setEditingInv(inv);
    setForm({
      accountId: inv.accountId || '',
      name: inv.name || '',
      type: inv.type || 'ETF',
      quantity: inv.quantity?.toString() || '',
      averageCost: inv.averageCost?.toString() || '',
      currentPrice: inv.currentPrice?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const qty = parseFloat(form.quantity) || 0;
      const cost = parseFloat(form.averageCost) || 0;
      const price = parseFloat(form.currentPrice) || 0;
      const data = {
        accountId: form.accountId,
        name: form.name.trim(),
        type: form.type,
        quantity: qty,
        averageCost: cost,
        currentPrice: price,
        investedAmount: Math.round(qty * cost * 100) / 100,
        currentValue: Math.round(qty * price * 100) / 100,
        gainLoss: Math.round((qty * price - qty * cost) * 100) / 100,
        gainLossPercent: qty * cost > 0 ? (qty * price - qty * cost) / (qty * cost) : 0,
      };

      if (editingInv) {
        await update(editingInv.id, data);
      } else {
        await add(data);
      }
      setShowModal(false);
      addToast(editingInv ? 'Position modifiée' : 'Position ajoutée', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inv) => {
    setConfirmDelete(inv);
  };

  const confirmDeleteInvestment = async () => {
    if (confirmDelete) {
      await remove(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const handleFreeze = async () => {
    const now = getToday();
    const positions = investments.map((inv) => ({
      id: inv.id,
      name: inv.name,
      type: inv.type,
      accountId: inv.accountId,
      investedAmount: inv.investedAmount || 0,
      currentValue: inv.currentValue || 0,
      gainLoss: inv.gainLoss || 0,
      gainLossPercent: inv.gainLossPercent || 0,
    }));

    const snapshot = {
      date: now,
      totalInvested: totals.totalInvested,
      totalValue: totals.totalValue,
      gainLoss: totals.gainLoss,
      gainLossPercent: totals.gainLossPercent,
      positions,
    };
    await addHistory(snapshot);

    const patrimoine = calculatePatrimoine(accounts, investments, credits);
    await addPatrimoineHistory({
      date: now,
      liquidites: patrimoine.liquidites,
      epargne: patrimoine.epargne,
      investissements: patrimoine.investissements,
      totalAssets: patrimoine.totalAssets,
      totalDebts: patrimoine.totalDebts,
      netWorth: patrimoine.netWorth,
    });

    addToast('Positions et patrimoine figés ! Des points d\'historique ont été créés.', 'success');
  };

  const groupedByAccount = {};
  for (const inv of investments) {
    const account = accounts.find(a => a.id === inv.accountId);
    const label = account ? `${account.name} (${account.bank})` : inv.accountId || 'Non assigné';
    if (!groupedByAccount[label]) groupedByAccount[label] = [];
    groupedByAccount[label].push(inv);
  }

  const accountOptions = investmentAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.bank})` }));

  const positionColors = ['#39F6D6', '#9B6BFF', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes investissements</h1>
          <p className="text-sm text-gray-400 mt-1">{investments.length} position{investments.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="violet" onClick={handleFreeze}>Figer mes positions</Button>
          <Button onClick={openAdd}>+ Ajouter</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-gray-400">Montant investi</p>
          <p className="text-lg font-bold text-white mt-1">{formatCurrency(totals.totalInvested)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Valeur actuelle</p>
          <p className="text-lg font-bold text-[#39F6D6] mt-1">{formatCurrency(totals.totalValue)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Plus/moins-value</p>
          <p className={`text-lg font-bold mt-1 ${totals.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totals.gainLoss)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Rendement</p>
          <p className={`text-lg font-bold mt-1 ${totals.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(totals.gainLossPercent)}
          </p>
        </Card>
      </div>

      {sortedHistory.length > 0 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Évolution des investissements</h3>
              <div className="flex gap-1 flex-wrap justify-end">
                {allPositionNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => togglePosition(name)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      activePositions.size === 0 || activePositions.has(name)
                        ? 'text-white'
                        : 'text-gray-500 opacity-40'
                    }`}
                    style={{
                      backgroundColor: activePositions.size === 0 || activePositions.has(name)
                        ? positionColors[i % positionColors.length] + '30'
                        : '#1F2937',
                      borderWidth: '1px',
                      borderColor: activePositions.size === 0 || activePositions.has(name)
                        ? positionColors[i % positionColors.length]
                        : '#374151',
                    }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: positionColors[i % positionColors.length] }}
                    />
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={globalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(v) => formatCurrency(v)}
                />
                {activePositions.size === 0 ? (
                  <>
                    <Line type="monotone" dataKey="Valeur totale" stroke="#39F6D6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Montant investi" stroke="#6B7280" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  </>
                ) : (
                  allPositionNames
                    .filter((name) => activePositions.has(name))
                    .map((name, i) => {
                      const idx = allPositionNames.indexOf(name);
                      return (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={positionColors[idx % positionColors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      );
                    })
                )}
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {allPositionNames.length > 0 && (
            <Card>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Évolution par titre</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allPositionNames.map((name, i) => {
                  const data = sparklineData[name] || [];
                  const lastVal = data.length > 0 ? data[data.length - 1].value : 0;
                  const firstVal = data.length > 0 ? data[0].value : 0;
                  const change = firstVal > 0 ? (lastVal - firstVal) / firstVal : 0;
                  const color = positionColors[i % positionColors.length];
                  return (
                    <div
                      key={name}
                      className="bg-[#0B0F1A] rounded-lg p-3 cursor-pointer hover:bg-[#1F2937]/50 transition-colors"
                      onClick={() => togglePosition(name)}
                      style={{
                        borderWidth: '1px',
                        borderColor: activePositions.has(name) ? color + '60' : '#1F2937',
                      }}
                    >
                      <p className="text-xs text-gray-400 truncate mb-1">{name}</p>
                      <p className="text-sm font-medium text-white">{formatCurrency(lastVal)}</p>
                      <p className={`text-xs mt-0.5 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {change >= 0 ? '+' : ''}{(change * 100).toFixed(1)}%
                      </p>
                      {data.length > 1 && (
                        <ResponsiveContainer width="100%" height={40}>
                          <LineChart data={data}>
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {investments.length > 0 && (
        <PortfolioAnalysis
          analysis={analysis}
          history={[]}
          onAnalyze={handleAnalyze}
          loading={analysisLoading}
        />
      )}

      {investments.length === 0 ? (
        <Card>
          <EmptyState
            icon="📈"
            title="Aucune position"
            description="Ajoutez vos investissements pour suivre votre portefeuille"
            action={<Button onClick={openAdd}>Ajouter une position</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedHistory.length === 0 && (
            <Card>
              <EmptyState
                icon="📸"
                title="Aucun historique"
                description="Cliquez sur 'Figer mes positions' pour créer un premier point d'historique et voir l'évolution"
              />
            </Card>
          )}
          {Object.entries(groupedByAccount).map(([accountLabel, positions]) => {
            const accountTotals = calculatePortfolioTotals(positions);
            return (
              <Card key={accountLabel} padding={false}>
                <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
                  <h3 className="font-medium text-white">{accountLabel}</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">Investi: <span className="text-white">{formatCurrency(accountTotals.totalInvested)}</span></span>
                    <span className="text-gray-400">Valeur: <span className="text-[#39F6D6]">{formatCurrency(accountTotals.totalValue)}</span></span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1F2937]">
                        <th className="text-left text-xs text-gray-400 uppercase py-3 px-4">Titre</th>
                        <th className="text-left text-xs text-gray-400 uppercase py-3 px-4">Type</th>
                        <th className="text-right text-xs text-gray-400 uppercase py-3 px-4">Quantité</th>
                        <th className="text-right text-xs text-gray-400 uppercase py-3 px-4">Revient</th>
                        <th className="text-right text-xs text-gray-400 uppercase py-3 px-4">Cours</th>
                        <th className="text-right text-xs text-gray-400 uppercase py-3 px-4">Valeur</th>
                        <th className="text-right text-xs text-gray-400 uppercase py-3 px-4">P/L</th>
                        <th className="text-right text-xs text-gray-400 uppercase py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((inv) => (
                        <tr key={inv.id} className="border-b border-[#1F2937]/50 hover:bg-[#1F2937]/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{inv.name}</td>
                          <td className="py-3 px-4"><Badge>{inv.type}</Badge></td>
                          <td className="py-3 px-4 text-right text-gray-300">{formatNumber(inv.quantity, 6)}</td>
                          <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(inv.averageCost)}</td>
                          <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(inv.currentPrice)}</td>
                          <td className="py-3 px-4 text-right font-medium text-white">{formatCurrency(inv.currentValue)}</td>
                          <td className={`py-3 px-4 text-right font-medium ${(inv.gainLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(inv.gainLoss)} ({formatPercent(inv.gainLossPercent)})
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => openEdit(inv)} className="text-gray-400 hover:text-white p-1">✏️</button>
                              <button onClick={() => handleDelete(inv)} className="text-gray-400 hover:text-red-400 p-1">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingInv ? 'Modifier la position' : 'Ajouter une position'}>
        <div className="space-y-4">
          <Select
            label="Compte"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            options={accountOptions}
            placeholder="Choisir un compte..."
            required
          />
          <Input
            label="Nom du titre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: MSCI World"
            required
          />
          <Select
            label="Type d'actif"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={INVESTMENT_TYPES}
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Quantité"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              step="0.000001"
              required
            />
            <Input
              label="Prix de revient (€)"
              type="number"
              value={form.averageCost}
              onChange={(e) => setForm({ ...form, averageCost: e.target.value })}
              step="0.01"
              required
            />
            <Input
              label="Cours actuel (€)"
              type="number"
              value={form.currentPrice}
              onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
              step="0.01"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : (editingInv ? 'Enregistrer' : 'Ajouter')}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteInvestment}
        title="Supprimer la position"
        message={`Supprimer la position "${confirmDelete?.name}" ?`}
      />
    </div>
  );
}
