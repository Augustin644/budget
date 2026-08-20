'use client';
import { useState, useRef } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import EmptyState from '@/app/components/ui/EmptyState';
import { excelSerialToDate, getToday } from '@/utils/dates';
import { calculateRemainingBalance, calculateEndDate } from '@/utils/amortization';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { ACCOUNT_CATEGORIES } from '@/lib/constants';

export default function ImportPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const parsed = parseWorkbook(workbook, XLSX);
      setPreview(parsed);
    } catch (err) {
      setError(`Erreur lors de la lecture du fichier : ${err.message}`);
    }
  };

  const parseWorkbook = (workbook, XLSX) => {
    const sheets = {};
    for (const name of workbook.SheetNames) {
      sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null });
    }

    const categories = [];
    const catSheet = sheets['Catégories'];
    if (catSheet) {
      for (let i = 4; i < catSheet.length; i++) {
        const row = catSheet[i];
        if (row && row[0] && row[1]) {
          categories.push({
            type: row[0],
            name: row[1],
            budgetMonthly: parseFloat(row[2]) || 0,
            notes: row[3] || '',
          });
        }
      }
    }

    const accounts = [];
    const accSheet = sheets['Comptes'];
    if (accSheet) {
      for (let i = 4; i < 17; i++) {
        const row = accSheet[i];
        if (row && row[1]) {
          const type = row[2] || 'Compte courant';
          accounts.push({
            bank: row[0] || '',
            name: row[1],
            type,
            owner: row[3] || 'Moi',
            balance: parseFloat(row[4]) || 0,
            interestRate: parseFloat(row[5]) || 0,
            notes: row[7] || '',
            category: ACCOUNT_CATEGORIES[type] || 'Autre',
          });
        }
      }
    }

    const investments = [];
    const invSheet = sheets['Investissements'];
    if (invSheet) {
      for (let i = 4; i < invSheet.length; i++) {
        const row = invSheet[i];
        if (row && row[0] && row[1] && row[0] !== 'TOTAL' && row[0] !== 'Date') {
          const qty = parseFloat(row[3]) || 0;
          const cost = parseFloat(row[4]) || 0;
          const price = parseFloat(row[6]) || 0;
          investments.push({
            accountName: row[0],
            name: row[1],
            type: row[2] || 'Autre',
            quantity: qty,
            averageCost: cost,
            currentPrice: price,
            investedAmount: Math.round(qty * cost * 100) / 100,
            currentValue: parseFloat(row[7]) || Math.round(qty * price * 100) / 100,
            gainLoss: parseFloat(row[8]) || Math.round((qty * price - qty * cost) * 100) / 100,
            gainLossPercent: parseFloat(row[9]) || (qty * cost > 0 ? (qty * price - qty * cost) / (qty * cost) : 0),
          });
        }
      }
    }

    const credits = [];
    const credSheet = sheets['Crédits'];
    if (credSheet) {
      for (let i = 4; i < 15; i++) {
        const row = credSheet[i];
        if (row && row[0] && row[0] !== 'TOTAL') {
          const principal = parseFloat(row[2]) || 0;
          const annualRate = parseFloat(row[3]) || 0;
          const durationMonths = parseInt(row[4]) || 0;
          const startDate = excelSerialToDate(row[5]);
          const monthlyPayment = parseFloat(row[6]) || 0;
          const insurance = parseFloat(row[7]) || 0;
          credits.push({
            name: row[0],
            bank: row[1] || '',
            principal,
            annualRate,
            durationMonths,
            startDate,
            monthlyPayment,
            insurance,
            totalMonthly: monthlyPayment + insurance,
            remainingBalance: calculateRemainingBalance(principal, annualRate, durationMonths, startDate ? new Date(startDate) : new Date()),
            endDate: startDate && durationMonths ? calculateEndDate(new Date(startDate), durationMonths) : '',
          });
        }
      }
    }

    const transactions = [];
    const txSheet = sheets['Transactions'];
    if (txSheet) {
      for (let i = 4; i < txSheet.length; i++) {
        const row = txSheet[i];
        if (row && row[0]) {
          const date = excelSerialToDate(row[0]);
          const type = row[2];
          if (!type || (type !== 'Revenu' && type !== 'Dépense')) continue;
          transactions.push({
            date,
            accountName: row[1] || '',
            type,
            categoryName: row[3] || '',
            description: row[4] || '',
            amount: parseFloat(row[5]) || 0,
          });
        }
      }
    }

    return {
      categories,
      accounts,
      investments,
      credits,
      transactions,
      warnings: generateWarnings(categories, accounts, investments, credits, transactions),
    };
  };

  const generateWarnings = (categories, accounts, investments, credits, transactions) => {
    const warnings = [];
    const catNames = new Set(categories.map(c => c.name));

    for (const tx of transactions) {
      if (tx.categoryName && !catNames.has(tx.categoryName)) {
        warnings.push(`Transaction "${tx.description}" utilise la catégorie inconnue "${tx.categoryName}"`);
      }
    }

    return [...new Set(warnings)].slice(0, 20);
  };

  const handleImport = async () => {
    if (!preview || !user) return;
    setImporting(true);
    setError(null);

    try {
      const path = `users/${user.uid}`;
      let batch = writeBatch(db);
      let ops = 0;
      const BATCH_LIMIT = 450;

      const flushBatch = async () => {
        if (ops > 0) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      };

      for (const cat of preview.categories) {
        const ref = doc(collection(db, `${path}/categories`));
        batch.set(ref, { ...cat, createdAt: getToday(), updatedAt: getToday() });
        ops++;
        if (ops >= BATCH_LIMIT) await flushBatch();
      }

      const accountIdMap = {};
      for (const acc of preview.accounts) {
        const ref = doc(collection(db, `${path}/accounts`));
        const { _originalBalance, _posValue, ...cleanAcc } = acc;
        batch.set(ref, { ...cleanAcc, createdAt: getToday(), updatedAt: getToday() });
        accountIdMap[acc.name] = ref.id;
        ops++;
        if (ops >= BATCH_LIMIT) await flushBatch();
      }

      await flushBatch();

      for (const cred of preview.credits) {
        const ref = doc(collection(db, `${path}/credits`));
        batch.set(ref, { ...cred, createdAt: getToday(), updatedAt: getToday() });
        ops++;
        if (ops >= BATCH_LIMIT) await flushBatch();
      }

      await flushBatch();

      for (const inv of preview.investments) {
        const ref = doc(collection(db, `${path}/investments`));
        const { accountName, ...cleanInv } = inv;
        batch.set(ref, { ...cleanInv, accountId: accountIdMap[accountName] || '', createdAt: getToday(), updatedAt: getToday() });
        ops++;
        if (ops >= BATCH_LIMIT) await flushBatch();
      }

      await flushBatch();

      const catSnap = await getDocs(collection(db, `${path}/categories`));
      const catIdMap = {};
      catSnap.forEach(d => { catIdMap[d.data().name] = d.id; });

      for (const tx of preview.transactions) {
        const ref = doc(collection(db, `${path}/transactions`));
        batch.set(ref, {
          date: tx.date,
          accountId: accountIdMap[tx.accountName] || '',
          type: tx.type,
          categoryId: catIdMap[tx.categoryName] || '',
          description: tx.description,
          amount: tx.amount,
          createdAt: getToday(),
          updatedAt: getToday(),
        });
        ops++;
        if (ops >= BATCH_LIMIT) await flushBatch();
      }

      await flushBatch();

      setResult({
        categories: preview.categories.length,
        accounts: preview.accounts.length,
        investments: preview.investments.length,
        credits: preview.credits.length,
        transactions: preview.transactions.length,
      });

      setPreview(null);
    } catch (err) {
      setError(`Erreur lors de l'import : ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Import Excel</h1>
        <p className="text-sm text-gray-400 mt-1">Importez votre fichier de suivi financier</p>
      </div>

      <Card>
        <div className="text-center py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="text-4xl mb-4 block">📥</span>
          <p className="text-gray-400 mb-4">Sélectionnez votre fichier Excel (.xlsx)</p>
          <Button onClick={() => fileInputRef.current?.click()}>Choisir un fichier</Button>
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {result && (
        <Card className="border-[#39F6D6]/30">
          <h3 className="text-lg font-medium text-[#39F6D6] mb-3">Import terminé !</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div><span className="text-gray-400">Catégories:</span> <span className="text-white">{result.categories}</span></div>
            <div><span className="text-gray-400">Comptes:</span> <span className="text-white">{result.accounts}</span></div>
            <div><span className="text-gray-400">Investissements:</span> <span className="text-white">{result.investments}</span></div>
            <div><span className="text-gray-400">Crédits:</span> <span className="text-white">{result.credits}</span></div>
            <div><span className="text-gray-400">Transactions:</span> <span className="text-white">{result.transactions}</span></div>
          </div>
        </Card>
      )}

      {preview && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-medium text-white mb-4">Aperçu des données détectées</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-4">
              <div><span className="text-gray-400">Catégories:</span> <span className="text-white">{preview.categories.length}</span></div>
              <div><span className="text-gray-400">Comptes:</span> <span className="text-white">{preview.accounts.length}</span></div>
              <div><span className="text-gray-400">Investissements:</span> <span className="text-white">{preview.investments.length}</span></div>
              <div><span className="text-gray-400">Crédits:</span> <span className="text-white">{preview.credits.length}</span></div>
              <div><span className="text-gray-400">Transactions:</span> <span className="text-white">{preview.transactions.length}</span></div>
            </div>

            {preview.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-amber-400 mb-2">Avertissements</h4>
                <div className="space-y-1">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-400/80">⚠ {w}</p>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Comptes</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.accounts.map((acc, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-white">{acc.name} ({acc.bank})</span>
                    <span className="text-[#39F6D6]">{acc.balance.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Investissements</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.investments.map((inv, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-white">{inv.name}</span>
                    <span className="text-[#39F6D6]">{inv.currentValue.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPreview(null)}>Annuler</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Import en cours...' : `Importer ${preview.transactions.length} transactions`}
            </Button>
          </div>
        </div>
      )}

      {!preview && !result && (
        <Card>
          <EmptyState
            icon="📊"
            title="Prêt à importer"
            description="Le fichier Excel sera analysé et toutes les données seront transférées dans l'application"
          />
        </Card>
      )}
    </div>
  );
}
