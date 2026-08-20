export function sanitizeTimestamps(data) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (value && typeof value === 'object' && value.toDate) {
      const d = value.toDate();
      sanitized[key] = formatDateLocal(d);
    } else if (value instanceof Date) {
      sanitized[key] = formatDateLocal(value);
    } else if (value && typeof value === 'object' && '_seconds' in value) {
      const d = new Date(value._seconds * 1000);
      sanitized[key] = formatDateLocal(d);
    }
  }

  return sanitized;
}

function formatDateLocal(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
