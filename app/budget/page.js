'use client';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import { useBudget, useYearToDateBudget } from '@/app/hooks/useBudget';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import MonthPicker from '@/app/components/ui/MonthPicker';
import Badge from '@/app/components/ui/Badge';
import EmptyState from '@/app/components/ui/EmptyState';
import { formatCurrency } from '@/utils/currency';

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: transactions, loading: txLoading } = useCollection('transactions');
  const { data: categories, loading: catLoading, update: updateCategory, add: addCategory } = useCollection('categories');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('Dépense');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [viewMode, setViewMode] = useState('month');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const loading = authLoading || txLoading || catLoading;

  const { budgetItems, totalRevenus, totalDepenses, solde } = useBudget(transactions, categories, year, month);
  const ytdBudget = useYearToDateBudget(transactions, categories, year, month);

  const handleBudgetChange = useCallback((catId, value) => {
    const numValue = parseFloat(value) || 0;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateCategory(catId, { budgetMonthly: numValue });
    }, 500);
  }, [updateCategory]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      await addCategory({
        type: newCatType,
        name: newCatName.trim(),
        budgetMonthly: parseFloat(newCatBudget) || 0,
        notes: '',
      });
      setNewCatName('');
      setNewCatType('Dépense');
      setNewCatBudget('');
      setShowAddCategory(false);
    } finally {
      setSaving(false);
    }
  };

  const depenses = budgetItems.filter(b => b.category.type === 'Dépense');
  const revenus = budgetItems.filter(b => b.category.type === 'Revenu');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget mensuel</h1>
          <p className="text-sm text-gray-400 mt-1">Suivi de vos revenus et dépenses</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-[#1F2937]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs ${viewMode === 'month' ? 'bg-[#39F6D6] text-[#0B0F1A]' : 'bg-[#111827] text-gray-400'}`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 text-xs ${viewMode === 'year' ? 'bg-[#39F6D6] text-[#0B0F1A]' : 'bg-[#111827] text-gray-400'}`}
            >
              Année
            </button>
          </div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-gray-400">Revenus</p>
          <p className="text-lg font-bold text-[#39F6D6] mt-1">{formatCurrency(totalRevenus)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Dépenses</p>
          <p className="text-lg font-bold text-[#9B6BFF] mt-1">{formatCurrency(totalDepenses)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Solde</p>
          <p className={`text-lg font-bold mt-1 ${solde >= 0 ? 'text-[#39F6D6]' : 'text-red-400'}`}>{formatCurrency(solde)}</p>
        </Card>
      </div>

      {viewMode === 'month' ? (
        <>
          {/* Revenus */}
          <Card padding={false}>
            <div className="p-4 border-b border-[#1F2937]">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Revenus</h3>
            </div>
            <div className="divide-y divide-[#1F2937]/50">
              {revenus.map((item) => (
                <div key={item.category.id} className="flex items-center justify-between p-4 hover:bg-[#1F2937]/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white">{item.category.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right w-24">
                      <input
                        type="number"
                        value={item.budgetMonthly || ''}
                        onChange={(e) => handleBudgetChange(item.category.id, e.target.value)}
                        className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded px-2 py-1 text-xs text-right text-white focus:border-[#39F6D6] focus:outline-none"
                        step="1"
                      />
                    </div>
                    <div className="text-right w-24 text-sm text-[#39F6D6]">{formatCurrency(item.real)}</div>
                    <div className="text-right w-20">
                      <Badge variant={item.ecart >= 0 ? 'success' : 'danger'}>
                        {formatCurrency(item.ecart)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Dépenses */}
          <Card padding={false}>
            <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Dépenses</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(true)}>+ Catégorie</Button>
            </div>
            <div className="divide-y divide-[#1F2937]/50">
              {depenses.map((item) => (
                <div key={item.category.id} className={`flex items-center justify-between p-4 transition-colors ${item.isOverBudget ? 'bg-red-500/5' : 'hover:bg-[#1F2937]/20'}`}>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm text-white">{item.category.name}</span>
                    {item.isOverBudget && <Badge variant="danger">Dépassement</Badge>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right w-24">
                      <input
                        type="number"
                        value={item.budgetMonthly || ''}
                        onChange={(e) => handleBudgetChange(item.category.id, e.target.value)}
                        className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded px-2 py-1 text-xs text-right text-white focus:border-[#39F6D6] focus:outline-none"
                        step="1"
                      />
                    </div>
                    <div className="text-right w-24 text-sm text-[#9B6BFF]">{formatCurrency(item.real)}</div>
                    <div className="text-right w-20">
                      <Badge variant={item.ecart >= 0 ? 'success' : 'danger'}>
                        {formatCurrency(item.ecart)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 font-medium">
                <span className="text-white">Total dépenses</span>
                <div className="flex items-center gap-4">
                  <div className="text-right w-24 text-sm text-gray-400">{formatCurrency(depenses.reduce((s, b) => s + b.budgetMonthly, 0))}</div>
                  <div className="text-right w-24 text-sm text-[#9B6BFF]">{formatCurrency(totalDepenses)}</div>
                  <div className="text-right w-20">
                    <Badge variant={totalDepenses <= depenses.reduce((s, b) => s + b.budgetMonthly, 0) ? 'success' : 'danger'}>
                      {formatCurrency(depenses.reduce((s, b) => s + b.budgetMonthly, 0) - totalDepenses)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* Year view */
        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Vue annuelle — {year}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="text-left py-2 px-2 text-gray-400">Catégorie</th>
                  <th className="text-right py-2 px-2 text-gray-400">Budget/mois</th>
                  <th className="text-right py-2 px-2 text-gray-400">Cumul budget</th>
                  <th className="text-right py-2 px-2 text-gray-400">Cumul réel</th>
                  <th className="text-right py-2 px-2 text-gray-400">Reste sur l&apos;année</th>
                </tr>
              </thead>
              <tbody>
                {categories.filter(c => c.type === 'Dépense').map((cat) => {
                  const ytd = ytdBudget[cat.id] || { cumulBudget: 0, cumulReal: 0, reste: 0 };
                  return (
                    <tr key={cat.id} className="border-b border-[#1F2937]/30">
                      <td className="py-2 px-2 text-white">{cat.name}</td>
                      <td className="py-2 px-2 text-right text-gray-300">{formatCurrency(cat.budgetMonthly)}</td>
                      <td className="py-2 px-2 text-right text-gray-300">{formatCurrency(ytd.cumulBudget)}</td>
                      <td className="py-2 px-2 text-right text-[#9B6BFF]">{formatCurrency(ytd.cumulReal)}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={ytd.reste >= 0 ? 'success' : 'danger'}>
                          {formatCurrency(ytd.reste)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add category modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title="Ajouter une catégorie" size="sm">
        <div className="space-y-4">
          <Select
            label="Type"
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value)}
            options={['Revenu', 'Dépense']}
          />
          <Input
            label="Nom"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Ex: Scolarité"
            required
          />
          <Input
            label="Budget mensuel (€)"
            type="number"
            value={newCatBudget}
            onChange={(e) => setNewCatBudget(e.target.value)}
            step="1"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddCategory(false)}>Annuler</Button>
            <Button onClick={handleAddCategory} disabled={saving}>{saving ? 'Ajout...' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
