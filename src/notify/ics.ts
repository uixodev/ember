/** A calendar file with one event and an alarm at the start time. Opens in the phone's calendar app. */

const pad = (n: number) => String(n).padStart(2, '0');

function utc(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 characters are folded, as the format requires. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
  return parts.join('\r\n');
}

export function feedEventIcs(opts: { id: string; areaName: string; at: number; suggestion?: string; now?: number }): string {
  const now = opts.now ?? Date.now();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ember//Feed reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.id}-${utc(opts.at)}@ember`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(opts.at)}`,
    `DTEND:${utc(opts.at + 15 * 60_000)}`,
    `SUMMARY:${esc(`Feed ${opts.areaName}`)}`,
    `DESCRIPTION:${esc(opts.suggestion ?? 'A few minutes keeps the fire warm.')}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`Feed ${opts.areaName}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
