'use client';
import { useState } from 'react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { formatCurrency } from '@/utils/currency';

export default function PortfolioAnalysis({ analysis, onAnalyze, loading }) {
  const [expanded, setExpanded] = useState(true);

  if (!analysis && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse IA</h3>
          <Button size="sm" onClick={onAnalyze}>Analyser mon patrimoine</Button>
        </div>
        <Card>
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🧮</span>
            <p className="text-gray-400 mb-2">Analysez l&apos;ensemble de votre patrimoine avec l&apos;IA</p>
            <p className="text-xs text-gray-500">Comptes, investissements, crédits, revenus, dépenses, budgets</p>
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
              <p className="text-gray-400">Analyse de votre patrimoine en cours...</p>
              <p className="text-xs text-gray-500 mt-1">L&apos;IA examine comptes, investissements, crédits, budgets...</p>
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
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Analyse Patrimoine</h3>
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
            </Card>
          )}

          {analysis.totaux && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Bilan patrimonial</h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Actifs</p>
                  <p className="text-sm font-bold text-[#39F6D6]">{formatCurrency(analysis.totaux.totalActifs || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Crédits</p>
                  <p className="text-sm font-bold text-red-400">{formatCurrency(analysis.totaux.totalCredits || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Patrimoine net</p>
                  <p className="text-sm font-bold text-[#9B6BFF]">{formatCurrency(analysis.totaux.patrimoineNet || 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Liquidités</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(analysis.totaux.liquiditesPure || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Épargne</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(analysis.totaux.epargne || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Invest.</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(analysis.totaux.valeurInvestissements || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Mensualité</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(analysis.totaux.mensualitesCredits || 0)}</p>
                </div>
              </div>
            </Card>
          )}

          {analysis.repartition && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Répartition</h4>
              {analysis.repartition.parType && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(analysis.repartition.parType).map(([type, val]) => (
                    <div key={type} className="bg-[#0B0F1A] rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-400">{type}: </span>
                      <span className="text-sm font-bold text-white">{typeof val === 'number' ? formatCurrency(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
              {analysis.repartition.description && (
                <p className="text-xs text-gray-400">{analysis.repartition.description}</p>
              )}
            </Card>
          )}

          {analysis.fluxFinanciers && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Flux financiers mensuels</h4>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Revenus</p>
                  <p className="text-sm font-bold text-[#39F6D6]">{formatCurrency(analysis.fluxFinanciers.revenuMensuel || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Dépenses</p>
                  <p className="text-sm font-bold text-[#9B6BFF]">{formatCurrency(analysis.fluxFinanciers.depenseMensuelle || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Épargne</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(analysis.fluxFinanciers.epargneMensuelle || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Taux épargne</p>
                  <p className="text-sm font-bold text-[#39F6D6]">{String(analysis.fluxFinanciers.tauxEpargne || 0)}%</p>
                </div>
              </div>
              {analysis.fluxFinanciers.description && (
                <p className="text-xs text-gray-400">{analysis.fluxFinanciers.description}</p>
              )}
            </Card>
          )}

          {analysis.budget && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Analyse budget</h4>
              {analysis.budget.categoriesSuralimentees?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-red-400 mb-1">Dépassements de budget</p>
                  {analysis.budget.categoriesSuralimentees.map((cat, i) => (
                    <div key={i} className="bg-[#0B0F1A] rounded-lg px-3 py-1.5 mb-1 flex justify-between text-xs">
                      <span className="text-gray-400">{safe(cat.nom)}</span>
                      <span className="text-red-400">+{formatCurrency(cat.ecart || 0)} ({formatCurrency(cat.depenseReelle || 0)}/{formatCurrency(cat.budget || 0)})</span>
                    </div>
                  ))}
                </div>
              )}
              {analysis.budget.description && (
                <p className="text-xs text-gray-400 mt-2">{analysis.budget.description}</p>
              )}
            </Card>
          )}

          {analysis.credits && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Crédits</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Restant dû</p>
                  <p className="text-sm font-bold text-red-400">{formatCurrency(analysis.credits.totalRestant || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Mensualité totale</p>
                  <p className="text-sm font-bold text-[#9B6BFF]">{formatCurrency(analysis.credits.mensualiteTotale || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Taux endettement</p>
                  <p className="text-sm font-bold text-white">{String(analysis.credits.chargeEndettement || 0)}%</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Durée restante</p>
                  <p className="text-sm font-bold text-white">{String(analysis.credits.dureeRestanteMois || 0)} mois</p>
                </div>
              </div>
              {analysis.credits.analyse && (
                <p className="text-xs text-gray-400 mb-1">{analysis.credits.analyse}</p>
              )}
              {analysis.credits.optimisation && (
                <p className="text-xs text-[#39F6D6]">Optimisation : {analysis.credits.optimisation}</p>
              )}
            </Card>
          )}

          {analysis.totaux && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Investissements</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Investi</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(analysis.totaux.totalInvesti || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Valeur</p>
                  <p className="text-sm font-bold text-[#39F6D6]">{formatCurrency(analysis.totaux.valeurInvestissements || 0)}</p>
                </div>
                <div className="bg-[#0B0F1A] rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Plus-value</p>
                  <p className={`text-sm font-bold ${(analysis.totaux.plusValue || 0) >= 0 ? 'text-[#39F6D6]' : 'text-red-400'}`}>
                    {formatCurrency(analysis.totaux.plusValue || 0)} ({String(analysis.totaux.plusValuePct || 0)}%)
                  </p>
                </div>
              </div>
            </Card>
          )}

          {analysis.investissements && analysis.investissements.analyse && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-2">Analyse investissements</h4>
              <p className="text-xs text-gray-400">{analysis.investissements.analyse}</p>
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
                      <h5 className="text-sm font-medium text-orange-400">{safe(item.titre, 'Attention')}</h5>
                      {item.severite && <Badge variant={item.severite === 'élevé' ? 'danger' : 'warning'}>{item.severite}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{safe(item.explication)}</p>
                    {item.donnee && <p className="text-xs text-gray-500 mt-1">{item.donnee}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Array.isArray(analysis.actionsRecommandees) && analysis.actionsRecommandees.length > 0 && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Actions recommandées</h4>
              <div className="space-y-3">
                {analysis.actionsRecommandees.map((item, i) => (
                  <div key={i} className="bg-[#0B0F1A] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-medium text-white">{safe(item.titre, 'Action')}</h5>
                      {item.priorite && (
                        <Badge variant={item.priorite === 'haute' ? 'danger' : item.priorite === 'moyenne' ? 'warning' : 'default'}>
                          {item.priorite}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{safe(item.explication)}</p>
                    {item.impact && <p className="text-xs text-[#39F6D6] mt-1">Impact : {item.impact}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {analysis.metriques && (
            <Card>
              <h4 className="text-xs text-gray-500 mb-3">Métriques clés</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.metriques.tauxEndettement != null && (
                  <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">Endettement: </span>
                    <span className={`text-sm font-bold ${Number(analysis.metriques.tauxEndettement) > 35 ? 'text-red-400' : 'text-[#39F6D6]'}`}>{String(analysis.metriques.tauxEndettement)}%</span>
                  </div>
                )}
                {analysis.metriques.tauxEpargne != null && (
                  <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">Épargne: </span>
                    <span className="text-sm font-bold text-[#39F6D6]">{String(analysis.metriques.tauxEpargne)}%</span>
                  </div>
                )}
                {analysis.metriques.reserveLiquiditeMois != null && (
                  <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">Réserve: </span>
                    <span className="text-sm font-bold text-[#9B6BFF]">{String(analysis.metriques.reserveLiquiditeMois)} mois</span>
                  </div>
                )}
                {analysis.metriques.diversification && (
                  <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">Diversification: </span>
                    <span className="text-sm font-bold text-[#39F6D6]">{String(analysis.metriques.diversification)}/10</span>
                  </div>
                )}
                {analysis.metriques.risqueGlobal && (
                  <div className="bg-[#0B0F1A] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">Risque: </span>
                    <span className="text-sm font-bold text-[#9B6BFF]">{String(analysis.metriques.risqueGlobal)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          <p className="text-xs text-gray-600 text-center">
            Analyse générée par IA à titre informatif uniquement.
          </p>
        </>
      )}
    </div>
  );
}
