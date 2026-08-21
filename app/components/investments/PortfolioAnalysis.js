'use client';
import { useState } from 'react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';

export default function PortfolioAnalysis({ analysis, onAnalyze, loading }) {
  const [expanded, setExpanded] = useState(true);

  if (!analysis && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse IA</h3>
          <Button size="sm" onClick={onAnalyze}>Analyser</Button>
        </div>
        <Card>
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-gray-400 mb-2">Analysez votre portefeuille avec l&apos;IA</p>
            <p className="text-xs text-gray-500">Cliquez &quot;Analyser&quot; pour lancer un diagnostic</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse IA</h3>
          <Button size="sm" disabled>Analyse en cours...</Button>
        </div>
        <Card>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-400">Analyse en cours...</p>
              <p className="text-xs text-gray-500 mt-1">L&apos;IA examine votre portefeuille</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const safe = (val, fallback = '') => val || fallback;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse IA</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Réduire' : 'Développer'}
          </Button>
          <Button size="sm" onClick={onAnalyze}>Re-analyser</Button>
        </div>
      </div>

      {!expanded ? (
        <Card>
          <p className="text-sm text-gray-300 line-clamp-2">{safe(analysis.resume, 'Analyse disponible')}</p>
        </Card>
      ) : (
        <>
          {analysis.resume && (
            <Card className="border-[#39F6D6]/20">
              <h4 className="text-xs text-gray-500 mb-2">Résumé</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.resume}</p>
              {analysis.metriques && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.metriques.diversification && (
                    <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Diversification: </span>
                      <span className="text-sm font-bold text-[#39F6D6]">{analysis.metriques.diversification}</span>
                    </div>
                  )}
                  {analysis.metriques.risqueGlobal && (
                    <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Risque: </span>
                      <span className="text-sm font-bold text-[#9B6BFF]">{analysis.metriques.risqueGlobal}</span>
                    </div>
                  )}
                  {analysis.metriques.coutEstime && (
                    <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Frais: </span>
                      <span className="text-sm font-bold text-white">{analysis.metriques.coutEstime}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {analysis.repartition?.parType && Object.keys(analysis.repartition.parType).length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-2">Répartition</h4>
              {analysis.repartition.description && (
                <p className="text-sm text-gray-300 mb-3">{analysis.repartition.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.repartition.parType).map(([type, pct]) => (
                  <div key={type} className="flex items-center gap-2 bg-[#0B0F1A] rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-400">{type}</span>
                    <span className="text-sm font-bold text-white">{String(pct)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Array.isArray(analysis.pointsForts) && analysis.pointsForts.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Points forts</h4>
              <div className="space-y-3">
                {analysis.pointsForts.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-medium text-[#39F6D6]">{safe(item.titre, 'Point fort')}</h5>
                      {item.donnee && <Badge variant="success">{item.donnee}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{safe(item.explication)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Array.isArray(analysis.pointsAttention) && analysis.pointsAttention.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Points d&apos;attention</h4>
              <div className="space-y-3">
                {analysis.pointsAttention.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-medium text-orange-400">{safe(item.titre, 'Point d\'attention')}</h5>
                      {item.severite && <Badge variant={item.severite === 'élevé' ? 'danger' : 'warning'}>{item.severite}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{safe(item.explication)}</p>
                    {item.donnee && <p className="text-xs text-gray-500 mt-1">{item.donnee}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Array.isArray(analysis.axesAmelioration) && analysis.axesAmelioration.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Axes d&apos;amelioration</h4>
              <div className="space-y-3">
                {analysis.axesAmelioration.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <h5 className="text-sm font-medium text-[#9B6BFF]">{safe(item.titre, 'Axe')}</h5>
                    <p className="text-xs text-gray-400 mt-1">{safe(item.explication)}</p>
                    {(item.avantages?.length > 0 || item.inconvenients?.length > 0) && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {item.avantages?.length > 0 && (
                          <div>
                            <p className="text-xs text-[#39F6D6] mb-1">Avantages</p>
                            <ul className="text-xs text-gray-400 space-y-0.5">
                              {item.avantages.map((a, j) => <li key={j}>- {String(a)}</li>)}
                            </ul>
                          </div>
                        )}
                        {item.inconvenients?.length > 0 && (
                          <div>
                            <p className="text-xs text-red-400 mb-1">Inconvenients</p>
                            <ul className="text-xs text-gray-400 space-y-0.5">
                              {item.inconvenients.map((a, j) => <li key={j}>- {String(a)}</li>)}
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

          <p className="text-xs text-gray-600 text-center">
            Analyse generee par IA a titre informatif uniquement.
          </p>
        </>
      )}
    </div>
  );
}
