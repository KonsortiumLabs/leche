export const CONSENT_VERSION = '2026-11-11-v1';
export const CONSENT_TEXT = 'Email me LÈCHE development and launch updates. I can unsubscribe at any time.';

export function toCsv(rows) {
  if (!rows.length) return 'email\r\n';
  const keys = Object.keys(rows[0]);
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [keys.map(cell).join(','), ...rows.map(row => keys.map(k => cell(row[k])).join(','))].join('\r\n');
}
