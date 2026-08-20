'use client';
import { useAuth } from '@/app/hooks/useAuth';
import { useCollection } from '@/app/hooks/useCollection';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import EmptyState from '@/app/components/ui/EmptyState';
import {
  exportTransactions,
  exportAccounts,
  exportInvestments,
  exportCredits,
  exportCategories,
} from '@/utils/export';

export default function ExportPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: accounts, loading: accountsLoading } = useCollection('accounts');
  const { data: investments, loading: investmentsLoading } = useCollection('investments');
  const { data: credits, loading: creditsLoading } = useCollection('credits');
  const { data: transactions, loading: txLoading } = useCollection('transactions');
  const { data: categories, loading: catLoading } = useCollection('categories');

  const loading = authLoading || accountsLoading || investmentsLoading || creditsLoading || txLoading || catLoading;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Chargement...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-400">Connectez-vous pour continuer</div>;
  }

  const exports = [
    {
      key: 'transactions',
      title: 'Transactions',
      description: `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`,
      icon: '🧾',
      count: transactions.length,
      action: () => exportTransactions(transactions, categories, accounts),
    },
    {
      key: 'accounts',
      title: 'Comptes',
      description: `${accounts.length} compte${accounts.length !== 1 ? 's' : ''}`,
      icon: '🏦',
      count: accounts.length,
      action: () => exportAccounts(accounts),
    },
    {
      key: 'investments',
      title: 'Investissements',
      description: `${investments.length} position${investments.length !== 1 ? 's' : ''}`,
      icon: '📈',
      count: investments.length,
      action: () => exportInvestments(investments, accounts),
    },
    {
      key: 'credits',
      title: 'Crédits',
      description: `${credits.length} crédit${credits.length !== 1 ? 's' : ''}`,
      icon: '💳',
      count: credits.length,
      action: () => exportCredits(credits),
    },
    {
      key: 'categories',
      title: 'Catégories',
      description: `${categories.length} catégorie${categories.length !== 1 ? 's' : ''}`,
      icon: '🏷️',
      count: categories.length,
      action: () => exportCategories(categories),
    },
  ];

  const totalItems = exports.reduce((s, e) => s + e.count, 0);

  const handleExportAll = () => {
    for (const exp of exports) {
      if (exp.count > 0) exp.action();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Export de données</h1>
          <p className="text-sm text-gray-400 mt-1">Téléchargez vos données au format CSV</p>
        </div>
        {totalItems > 0 && (
          <Button variant="violet" onClick={handleExportAll}>Tout exporter</Button>
        )}
      </div>

      {totalItems === 0 ? (
        <Card>
          <EmptyState
            icon="📤"
            title="Aucune donnée à exporter"
            description="Importez d'abord vos données depuis Excel ou ajoutez-les manuellement"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map((exp) => (
            <Card key={exp.key} className="flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{exp.icon}</span>
                  <div>
                    <h3 className="font-medium text-white">{exp.title}</h3>
                    <p className="text-xs text-gray-400">{exp.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={exp.action}
                  disabled={exp.count === 0}
                >
                  Télécharger CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Informations</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Les fichiers CSV utilisent le séparateur <code className="text-[#39F6D6]">;</code> (compatible Excel FR)</li>
          <li>• L&apos;encodage est UTF-8 avec BOM pour une兼容ibilité maximale</li>
          <li>• Les dates sont au format YYYY-MM-DD</li>
          <li>• Les montants sont en euros (€)</li>
        </ul>
      </Card>
    </div>
  );
}
