'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import { formatCurrency } from '@/utils/currency';
import { logOut, changePassword } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function ParametresPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: categories, loading, add, update, remove } = useCollection('categories');
  const { data: accounts } = useCollection('accounts');
  const { data: investments } = useCollection('investments');
  const { data: credits } = useCollection('credits');
  const { data: transactions } = useCollection('transactions');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'Dépense', name: '', budgetMonthly: '', notes: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const router = useRouter();

  const [aiProvider, setAiProvider] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ai_provider') || 'openai';
    return 'openai';
  });
  const [aiApiKey, setAiApiKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ai_api_key') || '';
    return '';
  });
  const [aiSaved, setAiSaved] = useState(false);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400">Connectez-vous pour accéder aux paramètres</p>
      </div>
    );
  }

  const handleSave = async () => {
    const data = {
      type: form.type,
      name: form.name.trim(),
      budgetMonthly: parseFloat(form.budgetMonthly) || 0,
      notes: form.notes.trim(),
    };
    if (editing) {
      await update(editing.id, data);
    } else {
      await add(data);
    }
    setShowAdd(false);
    setEditing(null);
    setForm({ type: 'Dépense', name: '', budgetMonthly: '', notes: '' });
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({
      type: cat.type,
      name: cat.name,
      budgetMonthly: cat.budgetMonthly?.toString() || '',
      notes: cat.notes || '',
    });
    setShowAdd(true);
  };

  const handleDelete = async (cat) => {
    setConfirmDelete(cat);
  };

  const confirmDeleteCategory = async () => {
    if (confirmDelete) {
      await remove(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/auth');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      setPasswordError('Tous les champs sont requis');
      return;
    }
    if (passwordForm.newPass.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(passwordForm.current, passwordForm.newPass);
      setPasswordSuccess('Mot de passe modifié avec succès');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(''); }, 2000);
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Mot de passe actuel incorrect');
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('Le nouveau mot de passe est trop faible');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Reconnectez-vous puis réessayez');
      } else {
        setPasswordError(err.message || 'Une erreur est survenue');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const revenus = categories.filter(c => c.type === 'Revenu');
  const depenses = categories.filter(c => c.type === 'Dépense');

  const handleSaveAI = () => {
    localStorage.setItem('ai_provider', aiProvider);
    localStorage.setItem('ai_api_key', aiApiKey);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-gray-400 mt-1">Gérez votre compte et vos catégories</p>
      </div>

      {/* Compte */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Compte</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)}>Changer mdp</Button>
            <Button variant="danger" size="sm" onClick={handleLogout}>Déconnexion</Button>
          </div>
        </div>
      </Card>

      {/* Statistiques */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Résumé des données</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-[#0B0F1A] rounded-lg p-3">
            <p className="text-xs text-gray-500">Comptes</p>
            <p className="text-lg font-bold text-white">{accounts.length}</p>
          </div>
          <div className="bg-[#0B0F1A] rounded-lg p-3">
            <p className="text-xs text-gray-500">Investissements</p>
            <p className="text-lg font-bold text-white">{investments.length}</p>
          </div>
          <div className="bg-[#0B0F1A] rounded-lg p-3">
            <p className="text-xs text-gray-500">Crédits</p>
            <p className="text-lg font-bold text-white">{credits.length}</p>
          </div>
          <div className="bg-[#0B0F1A] rounded-lg p-3">
            <p className="text-xs text-gray-500">Transactions</p>
            <p className="text-lg font-bold text-white">{transactions.length}</p>
          </div>
        </div>
        <div className="mt-3">
          <Link href="/export" className="text-sm text-[#39F6D6] hover:underline">Exporter mes données →</Link>
        </div>
      </Card>

      {/* IA - Scanner de relevé */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">🤖 IA - Scanner de relevé</h3>
        <p className="text-xs text-gray-500 mb-4">
          Configurez votre clé API pour analyser vos relevés bancaires avec l&apos;IA.
          Votre clé est stockée localement dans votre navigateur.
        </p>
        <div className="space-y-3">
          <Select
            label="Fournisseur IA"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            options={[
              { value: 'openai', label: 'OpenAI (GPT-4o mini)' },
              { value: 'anthropic', label: 'Anthropic (Claude)' },
              { value: 'mistral', label: 'Mistral AI' },
              { value: 'gemini', label: 'Google Gemini' },
            ]}
          />
          <Input
            label={`Clé API ${aiProvider === 'openai' ? 'OpenAI' : aiProvider === 'anthropic' ? 'Anthropic' : aiProvider === 'mistral' ? 'Mistral' : 'Gemini'}`}
            type="password"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder={`sk-...`}
          />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSaveAI}>
              {aiSaved ? '✅ Sauvegardé' : 'Sauvegarder'}
            </Button>
            {aiApiKey && (
              <span className="text-xs text-[#39F6D6]">Clé configurée</span>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Link href="/scan" className="text-sm text-[#39F6D6] hover:underline">Scanner un relevé →</Link>
        </div>
      </Card>

      {/* Catégories */}
      <Card padding={false}>
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Catégories ({categories.length})</h3>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ type: 'Dépense', name: '', budgetMonthly: '', notes: '' }); setShowAdd(true); }}>+ Ajouter</Button>
        </div>

        <div className="p-4 border-b border-[#1F2937]">
          <h4 className="text-xs text-gray-500 mb-2">Revenus ({revenus.length})</h4>
          <div className="space-y-1">
            {revenus.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 hover:bg-[#1F2937]/30 px-2 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{cat.name}</span>
                  <span className="text-xs text-gray-500">{formatCurrency(cat.budgetMonthly)}/mois</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cat)} className="text-gray-400 hover:text-white p-1 text-xs">✏️</button>
                  <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-400 p-1 text-xs">🗑️</button>
                </div>
              </div>
            ))}
            {revenus.length === 0 && <p className="text-xs text-gray-500 py-2">Aucune catégorie de revenu</p>}
          </div>
        </div>

        <div className="p-4">
          <h4 className="text-xs text-gray-500 mb-2">Dépenses ({depenses.length})</h4>
          <div className="space-y-1">
            {depenses.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 hover:bg-[#1F2937]/30 px-2 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{cat.name}</span>
                  <span className="text-xs text-gray-500">{formatCurrency(cat.budgetMonthly)}/mois</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cat)} className="text-gray-400 hover:text-white p-1 text-xs">✏️</button>
                  <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-400 p-1 text-xs">🗑️</button>
                </div>
              </div>
            ))}
            {depenses.length === 0 && <p className="text-xs text-gray-500 py-2">Aucune catégorie de dépense</p>}
          </div>
        </div>
      </Card>

      {/* Modal catégorie */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? 'Modifier la catégorie' : 'Ajouter une catégorie'} size="sm">
        <div className="space-y-4">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={['Revenu', 'Dépense']}
          />
          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nom de la catégorie"
            required
          />
          <Input
            label="Budget mensuel (€)"
            type="number"
            value={form.budgetMonthly}
            onChange={(e) => setForm({ ...form, budgetMonthly: e.target.value })}
            step="1"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes optionnelles"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAdd(false); setEditing(null); }}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal changement de mot de passe */}
      <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }} title="Changer le mot de passe" size="sm">
        <div className="space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
            placeholder="••••••••"
            required
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={passwordForm.newPass}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
            placeholder="••••••••"
            required
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
            placeholder="••••••••"
            required
          />
          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-emerald-400">{passwordSuccess}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess(''); }}>Annuler</Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? 'En cours...' : 'Modifier'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Supprimer la catégorie"
        message={`Supprimer la catégorie "${confirmDelete?.name}" ?`}
      />
    </div>
  );
}
