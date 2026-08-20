export function formatCurrency(amount, showSign = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (showSign && amount > 0) return `+${formatter.format(amount)}`;
  return formatter.format(amount);
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
