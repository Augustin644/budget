'use client';
import { useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import Table from '@/app/components/ui/Table';
import Badge from '@/app/components/ui/Badge';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import EmptyState from '@/app/components/ui/EmptyState';
import { useToast } from '@/app/components/ui/Toast';
import { formatCurrency } from '@/utils/currency';
import { formatDate, getToday } from '@/utils/dates';
import { ACCOUNT_TYPES, ACCOUNT_CATEGORIES } from '@/lib/constants';
import { getAccountDisplayValue } from '@/utils/patrimoine';

const EMPTY_ACCOUNT = {
  bank: '',
  name: '',
  type: 'Compte courant',
  owner: 'Moi',
  balance: '',
  interestRate: '',
  notes: '',
};

export default function ComptesPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { data: accounts, loading, add, update, remove } = useCollection('accounts');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const openAdd = () => {
    setEditingAccount(null);
    setForm(EMPTY_ACCOUNT);
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setForm({
      bank: account.bank || '',
      name: account.name || '',
      type: account.type || 'Compte courant',
      owner: account.owner || 'Moi',
      balance: account.balance?.toString() || '',
      interestRate: account.interestRate?.toString() || '',
      notes: account.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        bank: form.bank.trim(),
        name: form.name.trim(),
        type: form.type,
        owner: form.owner.trim(),
        balance: parseFloat(form.balance) || 0,
        interestRate: parseFloat(form.interestRate) || 0,
        notes: form.notes.trim(),
        category: ACCOUNT_CATEGORIES[form.type] || 'Autre',
      };

      if (editingAccount) {
        await update(editingAccount.id, data);
      } else {
        await add(data);
      }
      setShowModal(false);
      addToast(editingAccount ? 'Compte modifié' : 'Compte ajouté', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account) => {
    setConfirmDelete(account);
  };

  const confirmDeleteAccount = async () => {
    if (confirmDelete) {
      await remove(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const totalLiquidites = accounts.filter(a => ACCOUNT_CATEGORIES[a.type] === 'Liquidités').reduce((s, a) => s + (a.balance || 0), 0);
  const totalEpargne = accounts.filter(a => ACCOUNT_CATEGORIES[a.type] === 'Épargne').reduce((s, a) => s + (a.balance || 0), 0);
  const totalInvest = accounts.filter(a => ACCOUNT_CATEGORIES[a.type] === 'Investissement').reduce((s, a) => s + getAccountDisplayValue(a), 0);
  const totalAll = totalLiquidites + totalEpargne + totalInvest;

  const columns = [
    {
      key: 'name',
      label: 'Nom',
      render: (v, row) => (
        <div>
          <div className="font-medium text-white">{v}</div>
          <div className="text-xs text-gray-500">{row.bank}</div>
        </div>
      ),
    },
    { key: 'type', label: 'Type', render: (v) => <Badge>{v}</Badge> },
    {
      key: 'balance',
      label: 'Solde',
      align: 'right',
      render: (v) => <span className="font-medium text-white">{formatCurrency(v)}</span>,
    },
    {
      key: 'interestRate',
      label: 'Taux',
      align: 'right',
      render: (v) => (v ? `${(v * 100).toFixed(2)}%` : '—'),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>✏️</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>🗑️</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes comptes</h1>
          <p className="text-sm text-gray-400 mt-1">{accounts.length} compte{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd}>+ Ajouter</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalAll)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Liquidités</p>
          <p className="text-lg font-bold text-[#39F6D6] mt-1">{formatCurrency(totalLiquidites)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Épargne</p>
          <p className="text-lg font-bold text-[#9B6BFF] mt-1">{formatCurrency(totalEpargne)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Investissements</p>
          <p className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(totalInvest)}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-[#1F2937]">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Tous les comptes</h3>
        </div>
        <Table columns={columns} data={accounts} emptyMessage="Aucun compte" />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAccount ? 'Modifier le compte' : 'Ajouter un compte'}>
        <div className="space-y-4">
          <Select
            label="Banque"
            value={form.bank}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
            options={['Boursorama', 'Crédit Mutuel', 'Trade Republic', 'Bricks', 'Tokimo', 'Autre']}
            placeholder="Choisir une banque..."
            required
          />
          <Input
            label="Nom du compte"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Livret A"
            required
          />
          <Select
            label="Type de compte"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={ACCOUNT_TYPES}
            required
          />
          <Input
            label="Solde actuel (€)"
            type="number"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
            step="0.01"
            required
          />
          <Input
            label="Taux d'intérêt annuel (%)"
            type="number"
            value={form.interestRate}
            onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
            step="0.0001"
            min="0"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes optionnelles"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : (editingAccount ? 'Enregistrer' : 'Ajouter')}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Supprimer le compte"
        message={`Supprimer le compte "${confirmDelete?.name}" ?`}
      />
    </div>
  );
}
