'use client';
import { useState } from 'react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { formatCurrency } from '@/utils/currency';

const SEVERITY_COLORS = {
  faible: 'text-yellow-400',
  moyen: 'text-orange-400',
  élevé: 'text-red-400',
};

const SEVERITY_BADGE = {
  faible: 'warning',
  moyen: 'warning',
  élevé: 'danger',
};

export default function PortfolioAnalysis({ analysis, history, onAnalyze, loading }) {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

  const display = selectedHistory || analysis;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse du portefeuille</h3>
        <div className="flex gap-2">
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setShowHistory(!showHistory); setSelectedHistory(null); }}>
              {showHistory ? 'Retour' : `Historique (${history.length})`}
            </Button>
          )}
          <Button size="sm" onClick={onAnalyze} disabled={loading}>
            {loading ? 'Analyse en cours...' : 'Analyser'}
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-400">Analyse en cours...</p>
              <p className="text-xs text-gray-500 mt-1">L&apos;IA examine votre portefeuille</p>
            </div>
          </div>
        </Card>
      )}

      {!loading && !display && !showHistory && (
        <Card>
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-gray-400 mb-2">Aucune analyse disponible</p>
            <p className="text-xs text-gray-500 mb-4">Cliquez &quot;Analyser&quot; pour lancer un diagnostic de votre portefeuille</p>
          </div>
        </Card>
      )}

      {showHistory && (
        <Card>
          <h4 className="text-xs text-gray-500 mb-3">Analyses précédentes</h4>
          <div className="space-y-2">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => { setSelectedHistory(h); setShowHistory(false); }}
                className="w-full text-left p-3 rounded-lg border border-[#1F2937] hover:border-[#39F6D6]/30 hover:bg-[#39F6D6]/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{h.date}</span>
                  <Badge>{h.analysis?.metriques?.risqueGlobal || '—'}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{h.analysis?.resume}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {display && !loading && (
        <>
          {/* Résumé */}
          <Card className="border-[#39F6D6]/20">
            <h4 className="text-xs text-gray-500 mb-2">Résumé</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{display.resume}</p>
            {display.metriques && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Diversification</p>
                  <p className="text-sm font-bold text-[#39F6D6]">{display.metriques.diversification}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Risque global</p>
                  <p className="text-sm font-bold text-[#9B6BFF]">{display.metriques.risqueGlobal}</p>
                </div>
                {display.metriques.coutEstime && (
                  <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Frais estimés</p>
                    <p className="text-sm font-bold text-white">{display.metriques.coutEstime}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Répartition */}
          {display.repartition && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-2">Répartition</h4>
              <p className="text-sm text-gray-300 mb-3">{display.repartition.description}</p>
              {display.repartition.parType && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(display.repartition.parType).map(([type, pct]) => (
                    <div key={type} className="flex items-center gap-2 bg-[#0B0F1A] rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-400">{type}</span>
                      <span className="text-sm font-bold text-white">{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Points forts */}
          {display.pointsForts?.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">✅ Points forts</h4>
              <div className="space-y-3">
                {display.pointsForts.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-medium text-[#39F6D6]">{item.titre}</h5>
                      {item.donnee && <Badge variant="success">{item.donnee}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.explication}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Points d'attention */}
          {display.pointsAttention?.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">⚠️ Points d&apos;attention</h4>
              <div className="space-y-3">
                {display.pointsAttention.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className={`text-sm font-medium ${SEVERITY_COLORS[item.severite] || 'text-orange-400'}`}>{item.titre}</h5>
                      {item.severite && <Badge variant={SEVERITY_BADGE[item.severite] || 'warning'}>{item.severite}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.explication}</p>
                    {item.donnee && <p className="text-xs text-gray-500 mt-1">Donnée : {item.donnee}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Axes d'amélioration */}
          {display.axesAmelioration?.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">💡 Axes d&apos;amélioration</h4>
              <div className="space-y-3">
                {display.axesAmelioration.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <h5 className="text-sm font-medium text-[#9B6BFF]">{item.titre}</h5>
                    <p className="text-xs text-gray-400 mt-1">{item.explication}</p>
                    {(item.avantages?.length > 0 || item.inconvenients?.length > 0) && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {item.avantages?.length > 0 && (
                          <div>
                            <p className="text-xs text-[#39F6D6] mb-1">Avantages</p>
                            <ul className="text-xs text-gray-400 space-y-0.5">
                              {item.avantages.map((a, j) => <li key={j}>• {a}</li>)}
                            </ul>
                          </div>
                        )}
                        {item.inconvenients?.length > 0 && (
                          <div>
                            <p className="text-xs text-red-400 mb-1">Inconvénients</p>
                            <ul className="text-xs text-gray-400 space-y-0.5">
                              {item.inconvenients.map((a, j) => <li key={j}>• {a}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-600 text-center">
            Analyse générée par IA à titre informatif uniquement. Ne constitue pas un conseil financier.
          </p>
        </>
      )}
    </div>
  );
}
