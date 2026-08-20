'use client';
import { useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Modal from '@/app/components/ui/Modal';
import Badge from '@/app/components/ui/Badge';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import EmptyState from '@/app/components/ui/EmptyState';
import { useToast } from '@/app/components/ui/Toast';
import { formatCurrency } from '@/utils/currency';
import { generateAmortizationSchedule, calculateRemainingBalance, calculateEndDate, getCreditRemainingBalance } from '@/utils/amortization';

const EMPTY_FORM = {
  name: '',
  bank: '',
  principal: '',
  annualRate: '',
  durationMonths: '',
  startDate: '',
  monthlyPayment: '',
  insurance: '',
};

export default function CreditsPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { data: credits, loading, add, update, remove } = useCollection('credits');
  const [showModal, setShowModal] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const openAdd = () => {
    setEditingCredit(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (credit) => {
    setEditingCredit(credit);
    setForm({
      name: credit.name || '',
      bank: credit.bank || '',
      principal: credit.principal?.toString() || '',
      annualRate: credit.annualRate?.toString() || '',
      durationMonths: credit.durationMonths?.toString() || '',
      startDate: credit.startDate || '',
      monthlyPayment: credit.monthlyPayment?.toString() || '',
      insurance: credit.insurance?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const principal = parseFloat(form.principal) || 0;
      const annualRate = parseFloat(form.annualRate) || 0;
      const durationMonths = parseInt(form.durationMonths) || 0;
      const startDate = form.startDate;
      const monthlyPayment = parseFloat(form.monthlyPayment) || 0;
      const insurance = parseFloat(form.insurance) || 0;

      const remainingBalance = calculateRemainingBalance(principal, annualRate, durationMonths, startDate);

      const data = {
        name: form.name.trim(),
        bank: form.bank.trim(),
        principal,
        annualRate,
        durationMonths,
        startDate,
        monthlyPayment,
        insurance,
        totalMonthly: monthlyPayment + insurance,
        remainingBalance,
        endDate: calculateEndDate(startDate, durationMonths),
      };

      if (editingCredit) {
        await update(editingCredit.id, data);
      } else {
        await add(data);
      }
      setShowModal(false);
      addToast(editingCredit ? 'Crédit modifié' : 'Crédit ajouté', 'success');
    } catch (err) {
      addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (credit) => {
    setConfirmDelete(credit);
  };

  const confirmDeleteCredit = async () => {
    if (confirmDelete) {
      await remove(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const totalMensualites = credits.reduce((s, c) => s + (c.totalMonthly || c.monthlyPayment || 0), 0);
  const totalDettes = credits.reduce((s, c) => s + getCreditRemainingBalance(c), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes crédits</h1>
          <p className="text-sm text-gray-400 mt-1">{credits.length} crédit{credits.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd}>+ Ajouter</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-gray-400">Total dettes</p>
          <p className="text-lg font-bold text-red-400 mt-1">{formatCurrency(totalDettes)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400">Mensualités totales</p>
          <p className="text-lg font-bold text-[#9B6BFF] mt-1">{formatCurrency(totalMensualites)}</p>
        </Card>
      </div>

      {credits.length === 0 ? (
        <Card>
          <EmptyState
            icon="💳"
            title="Aucun crédit"
            description="Ajoutez vos crédits pour suivre le capital restant dû"
            action={<Button onClick={openAdd}>Ajouter un crédit</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {credits.map((credit) => {
            const isExpanded = expandedId === credit.id;
            const { schedule } = credit.startDate && credit.durationMonths
              ? generateAmortizationSchedule(credit.principal, credit.annualRate || 0, credit.durationMonths, credit.startDate)
              : { schedule: [] };
            const isPaidOff = getCreditRemainingBalance(credit) <= 0;

            return (
              <Card key={credit.id} padding={false} className={isPaidOff ? 'opacity-60' : ''}>
                <div
                  className="p-4 cursor-pointer hover:bg-[#1F2937]/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : credit.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{credit.name}</span>
                          {isPaidOff && <Badge variant="success">Soldé</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">{credit.bank}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">{formatCurrency(getCreditRemainingBalance(credit))}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(credit.totalMonthly || credit.monthlyPayment)}/mois</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(credit); }} className="text-gray-400 hover:text-white p-1">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(credit); }} className="text-gray-400 hover:text-red-400 p-1">🗑️</button>
                      </div>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {isExpanded && schedule.length > 0 && (
                  <div className="border-t border-[#1F2937] p-4">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Tableau d&apos;amortissement</h4>
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#1F2937]">
                            <th className="text-left py-2 px-2 text-gray-400">Mois</th>
                            <th className="text-left py-2 px-2 text-gray-400">Date</th>
                            <th className="text-right py-2 px-2 text-gray-400">Mensualité</th>
                            <th className="text-right py-2 px-2 text-gray-400">Intérêts</th>
                            <th className="text-right py-2 px-2 text-gray-400">Capital</th>
                            <th className="text-right py-2 px-2 text-gray-400">Restant dû</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.map((row) => (
                            <tr key={row.month} className="border-b border-[#1F2937]/30">
                              <td className="py-1.5 px-2 text-gray-300">{row.month}</td>
                              <td className="py-1.5 px-2 text-gray-300">{row.date}</td>
                              <td className="py-1.5 px-2 text-right text-gray-300">{formatCurrency(row.payment)}</td>
                              <td className="py-1.5 px-2 text-right text-amber-400">{formatCurrency(row.interest)}</td>
                              <td className="py-1.5 px-2 text-right text-[#39F6D6]">{formatCurrency(row.capitalAmortized)}</td>
                              <td className="py-1.5 px-2 text-right text-white font-medium">{formatCurrency(getCreditRemainingBalance(row))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCredit ? 'Modifier le crédit' : 'Ajouter un crédit'}>
        <div className="space-y-4">
          <Input
            label="Nom du crédit"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Crédit étudiant"
            required
          />
          <Input
            label="Banque / Organisme"
            value={form.bank}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
            placeholder="Ex: Crédit Mutuel"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capital emprunté (€)"
              type="number"
              value={form.principal}
              onChange={(e) => setForm({ ...form, principal: e.target.value })}
              step="0.01"
              required
            />
            <Input
              label="Taux annuel (%)"
              type="number"
              value={form.annualRate}
              onChange={(e) => setForm({ ...form, annualRate: e.target.value })}
              step="0.001"
              min="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Durée (mois)"
              type="number"
              value={form.durationMonths}
              onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
              min="1"
              required
            />
            <Input
              label="Date de début"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mensualité hors assurance (€)"
              type="number"
              value={form.monthlyPayment}
              onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })}
              step="0.01"
              min="0"
            />
            <Input
              label="Assurance mensuelle (€)"
              type="number"
              value={form.insurance}
              onChange={(e) => setForm({ ...form, insurance: e.target.value })}
              step="0.01"
              min="0"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : (editingCredit ? 'Enregistrer' : 'Ajouter')}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteCredit}
        title="Supprimer le crédit"
        message={`Supprimer le crédit "${confirmDelete?.name}" ?`}
      />
    </div>
  );
}
