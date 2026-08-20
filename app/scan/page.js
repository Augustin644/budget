'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Badge from '@/app/components/ui/Badge';
import EmptyState from '@/app/components/ui/EmptyState';
import Modal from '@/app/components/ui/Modal';
import { extractTextFromPDF } from '@/utils/pdf';
import { formatCurrency } from '@/utils/currency';
import { getToday } from '@/utils/dates';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4o mini)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'gemini', label: 'Google Gemini' },
];

function normalizeText(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
}

function deduplicateInternal(transactions) {
  const seen = new Set();
  return transactions.filter((t) => {
    const key = `${t.date}|${t.amount}|${normalizeText(t.description)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ScanPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: accounts } = useCollection('accounts');
  const { data: categories } = useCollection('categories');
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload');
  const [extractedText, setExtractedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const router = useRouter();

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ai_api_key') || '' : '';
  const aiProvider = typeof window !== 'undefined' ? localStorage.getItem('ai_provider') || 'openai' : 'openai';

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  if (!apiKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scanner un relevé</h1>
          <p className="text-sm text-gray-400 mt-1">Analysez vos relevés bancaires avec l&apos;IA</p>
        </div>
        <Card>
          <EmptyState
            icon="🔑"
            title="Clé API non configurée"
            description="Configurez votre clé API IA dans les paramètres pour utiliser cette fonctionnalité"
            action={<Button onClick={() => router.push('/parametres')}>Aller aux paramètres</Button>}
          />
        </Card>
      </div>
    );
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setStep('extracting');

    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.length < 20) {
        throw new Error('Le PDF ne contient pas assez de texte. Il est peut-être basé sur une image.');
      }
      setExtractedText(text);
      setStep('review');
    } catch (err) {
      setError(`Erreur lors de l'extraction : ${err.message}`);
      setStep('upload');
    }
  };

  const handleAnalyze = async () => {
    if (!extractedText) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          provider: aiProvider,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'analyse');

      const deduplicated = deduplicateInternal(data.transactions);
      setTransactions(deduplicated.map((t, i) => ({
        ...t,
        id: i,
        accountId: '',
        categoryId: '',
        selected: true,
      })));
      setStep('preview');
      if (data.transactions.length !== deduplicated.length) {
        setError(`${data.transactions.length - deduplicated.length} doublon(s) supprimé(s) automatiquement`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTransactionChange = (id, field, value) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const toggleTransaction = (id) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleImport = async () => {
    const selected = transactions.filter((t) => t.selected);
    if (selected.length === 0) return;

    setImporting(true);
    try {
      const path = `users/${user.uid}`;
      let batch = writeBatch(db);
      let ops = 0;

      const accountSnap = await getDocs(collection(db, `${path}/accounts`));
      const accountMap = {};
      accountSnap.forEach((d) => { accountMap[d.data().name] = d.id; });

      const catSnap = await getDocs(collection(db, `${path}/categories`));
      const catMap = {};
      catSnap.forEach((d) => { catMap[d.data().name] = d.id; });

      const existingSnap = await getDocs(collection(db, `${path}/transactions`));
      const existingKeys = new Set();
      existingSnap.forEach((d) => {
        const tx = d.data();
        existingKeys.add(`${tx.date}|${tx.amount}|${normalizeText(tx.description)}`);
      });

      let skipped = 0;

      for (const tx of selected) {
        const key = `${tx.date}|${tx.amount}|${normalizeText(tx.description)}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        const ref = doc(collection(db, `${path}/transactions`));
        batch.set(ref, {
          date: tx.date,
          accountId: tx.accountId || '',
          type: tx.type,
          categoryId: tx.categoryId || catMap[tx.categoryName] || '',
          description: tx.description,
          amount: parseFloat(tx.amount) || 0,
          createdAt: getToday(),
          updatedAt: getToday(),
        });
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }

      if (ops > 0) await batch.commit();

      setResult({ count: selected.length - skipped, skipped });
      setTransactions([]);
      setStep('done');
    } catch (err) {
      setError(`Erreur lors de l'import : ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setExtractedText('');
    setTransactions([]);
    setError(null);
    setResult(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const accountOptions = accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.bank})` }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: `[${c.type}] ${c.name}` }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scanner un relevé</h1>
          <p className="text-sm text-gray-400 mt-1">Uploadez un relevé bancaire PDF et laissez l&apos;IA extraire les transactions</p>
        </div>
        {step !== 'upload' && (
          <Button variant="secondary" size="sm" onClick={reset}>Nouveau scan</Button>
        )}
      </div>

      {error && (
        <Card className={error.includes('doublon') ? 'border-yellow-500/30' : 'border-red-500/30'}>
          <p className={error.includes('doublon') ? 'text-yellow-400 text-sm' : 'text-red-400 text-sm'}>{error}</p>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <div className="text-center py-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-4xl mb-4 block">📄</span>
            <p className="text-gray-400 mb-2">Sélectionnez un relevé bancaire au format PDF</p>
            <p className="text-xs text-gray-500 mb-4">
              Fonctionne avec les relevés de la plupart des banques françaises
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>Choisir un fichier PDF</Button>
          </div>
        </Card>
      )}

      {/* Step 2: Extracting */}
      {step === 'extracting' && (
        <Card>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <span className="text-4xl mb-4 block">⏳</span>
              <p className="text-gray-400">Extraction du texte du PDF...</p>
              <p className="text-xs text-gray-500 mt-1">{fileName}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Review text */}
      {step === 'review' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Texte extrait</h3>
              <Badge>{extractedText.length} caractères</Badge>
            </div>
            <div className="bg-[#0B0F1A] rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{extractedText}</pre>
            </div>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={reset}>Annuler</Button>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Preview transactions */}
      {step === 'preview' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Transactions détectées ({transactions.filter((t) => t.selected).length}/{transactions.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setTransactions((prev) => prev.map((t) => ({ ...t, selected: true })))}>
                  Tout cocher
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setTransactions((prev) => prev.map((t) => ({ ...t, selected: false })))}>
                  Tout décocher
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    tx.selected ? 'border-[#39F6D6]/30 bg-[#39F6D6]/5' : 'border-[#1F2937] bg-[#0B0F1A] opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={tx.selected}
                      onChange={() => toggleTransaction(tx.id)}
                      className="mt-1 accent-[#39F6D6]"
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input
                        type="date"
                        value={tx.date}
                        onChange={(e) => handleTransactionChange(tx.id, 'date', e.target.value)}
                        className="text-xs"
                      />
                      <Input
                        value={tx.description}
                        onChange={(e) => handleTransactionChange(tx.id, 'description', e.target.value)}
                        className="text-xs"
                      />
                      <Input
                        type="number"
                        value={tx.amount}
                        onChange={(e) => handleTransactionChange(tx.id, 'amount', e.target.value)}
                        step="0.01"
                        className="text-xs"
                      />
                      <Select
                        value={tx.type}
                        onChange={(e) => handleTransactionChange(tx.id, 'type', e.target.value)}
                        options={['Revenu', 'Dépense']}
                        className="text-xs"
                      />
                    </div>
                    <span className={`text-sm font-medium whitespace-nowrap ${tx.type === 'Revenu' ? 'text-[#39F6D6]' : 'text-[#9B6BFF]'}`}>
                      {tx.type === 'Revenu' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount) || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('review')}>Retour</Button>
            <Button onClick={handleImport} disabled={importing || transactions.filter((t) => t.selected).length === 0}>
              {importing ? 'Import...' : `Importer ${transactions.filter((t) => t.selected).length} transactions`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 'done' && result && (
        <Card className="border-[#39F6D6]/30">
          <div className="text-center py-6">
            <span className="text-4xl mb-4 block">✅</span>
            <h3 className="text-lg font-medium text-[#39F6D6] mb-2">Import terminé !</h3>
            <p className="text-gray-400">{result.count} transactions importées</p>
            {result.skipped > 0 && (
              <p className="text-sm text-yellow-400 mt-1">{result.skipped} doublon(s) ignoré(s) (déjà en base)</p>
            )}
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="secondary" onClick={reset}>Scanner un autre relevé</Button>
              <Button onClick={() => router.push('/transactions')}>Voir les transactions</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Comment ça marche</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
            <span className="text-xl block mb-1">1</span>
            <p className="text-gray-400 text-xs">Upload du PDF</p>
          </div>
          <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
            <span className="text-xl block mb-1">2</span>
            <p className="text-gray-400 text-xs">Extraction du texte</p>
          </div>
          <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
            <span className="text-xl block mb-1">3</span>
            <p className="text-gray-400 text-xs">Analyse IA</p>
          </div>
          <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
            <span className="text-xl block mb-1">4</span>
            <p className="text-gray-400 text-xs">Import</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
