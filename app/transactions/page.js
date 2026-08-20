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
import EmptyState from '@/app/components/ui/EmptyState';
import { useToast } from '@/app/components/ui/Toast';
import { formatCurrency } from '@/utils/currency';
import { getToday, getMonthKey, formatDate } from '@/utils/dates';
import { useBudget } from '@/app/hooks/useBudget';

const EMPTY_FORM = {
  date: getToday(),
  accountId: '',
  type: 'Dépense',
  categoryId: '',
  description: '',
  amount: '',
};

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { data: transactions, loading: txLoading, add, remove } = useCollection('transactions');
  const { data: accounts, loading: accLoading } = useCollection('accounts');
  const { data: categories, loading: catLoading } = useCollection('categories');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const loading = authLoading || txLoading || accLoading || catLoading;

  const now = new Date();
  const { budgetItems } = useBudget(transactions, categories, now.getFullYear(), now.getMonth() + 1);

  const selectedBudgetItem = budgetItems.find(b => b.category.id === form.categoryId);
  const budgetRemaining = selectedBudgetItem ? selectedBudgetItem.budgetMonthly - selectedBudgetItem.real : null;

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filterType) result = result.filter(t => t.type === filterType);
    if (filterCategory) result = result.filter(t => t.categoryId === filterCategory);
    if (filterMonth) result = result.filter(t => getMonthKey(t.date) === filterMonth);
    return result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, filterType, filterCategory, filterMonth]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await add({
        date: form.date,
        accountId: form.accountId,
        type: form.type,
        categoryId: form.categoryId,
        description: form.description.trim(),
        amount: parseFloat(form.amount) || 0,
      });
      setForm({ ...EMPTY_FORM, date: getToday() });
      setShowForm(false);
      addToast('Transaction ajoutée', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tx) => {
    setConfirmDelete(tx);
  };

  const confirmDeleteTx = async () => {
    if (confirmDelete) {
      await remove(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  // Get unique months
  const months = [...new Set(transactions.map(t => getMonthKey(t.date)).filter(Boolean))].sort().reverse();

  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));
  const categoryOptions = categories
    .filter(c => c.type === form.type)
    .map(c => ({ value: c.id, label: c.name }));
  const filterCatOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-gray-400 mt-1">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Ajouter</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          options={['Revenu', 'Dépense']}
          placeholder="Tous les types"
          className="w-40"
        />
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={filterCatOptions}
          placeholder="Toutes les catégories"
          className="w-48"
        />
        <Select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          options={months.map(m => ({ value: m, label: m }))}
          placeholder="Tous les mois"
          className="w-40"
        />
      </div>

      {/* Transaction list */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <EmptyState icon="🧾" title="Aucune transaction" description="Ajoutez vos premières transactions" />
        ) : (
          <div className="divide-y divide-[#1F2937]/50">
            {filtered.map((tx) => {
              const category = categories.find(c => c.id === tx.categoryId);
              const account = accounts.find(a => a.id === tx.accountId);
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-[#1F2937]/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white truncate">{tx.description || '(sans description)'}</span>
                      {category && <Badge variant={tx.type === 'Revenu' ? 'success' : 'info'}>{category.name}</Badge>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {tx.date} {account ? `• ${account.name}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${tx.type === 'Revenu' ? 'text-[#39F6D6]' : 'text-[#9B6BFF]'}`}>
                      {tx.type === 'Revenu' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <button onClick={() => handleDelete(tx)} className="text-gray-400 hover:text-red-400 p-1">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add form modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouvelle transaction" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: '' })}
              options={['Revenu', 'Dépense']}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Compte"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              options={accountOptions}
              placeholder="Choisir..."
              required
            />
            <div>
              <Select
                label="Catégorie"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                options={categoryOptions}
                placeholder="Choisir..."
                required
              />
              {budgetRemaining !== null && (
                <p className={`text-xs mt-1 ${budgetRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Budget restant : {formatCurrency(budgetRemaining)}
                </p>
              )}
            </div>
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Courses Carrefour"
          />
          <Input
            label="Montant (€)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            step="0.01"
            min="0"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Ajout...' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteTx}
        title="Supprimer la transaction"
        message={`Supprimer "${confirmDelete?.description}" ?`}
      />
    </div>
  );
}
