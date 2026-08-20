export function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date = new Date(utc_value * 1000);
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return formatDate(localDate);
}

export function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthLabel(dateStr) {
  if (!dateStr) return '';
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const d = parseDate(dateStr);
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function getFirstDayOfMonth(dateStr) {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function getToday() {
  return formatDate(new Date());
}

export function getMonthKey(dateStr) {
  if (!dateStr) return null;
  return dateStr.substring(0, 7);
}
