import { describe, expect, it } from 'vitest';
import { feedEventIcs } from './ics';

const at = Date.UTC(2026, 9, 25, 18, 30);

describe('feedEventIcs', () => {
  const text = feedEventIcs({ id: 'abc', areaName: 'Reading, daily', at, suggestion: 'Read one page;\nthen stop', now: Date.UTC(2026, 9, 24, 12) });
  it('is a calendar with one event and an alarm at the start', () => {
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(text.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(text).toContain('DTSTART:20261025T183000Z');
    expect(text).toContain('DTEND:20261025T184500Z');
    expect(text).toContain('DTSTAMP:20261024T120000Z');
    expect(text).toContain('BEGIN:VALARM\r\nTRIGGER:PT0S\r\nACTION:DISPLAY');
  });
  it('escapes commas, semicolons and new lines', () => {
    expect(text).toContain('SUMMARY:Feed Reading\\, daily');
    expect(text).toContain('DESCRIPTION:Read one page\;\\nthen stop');
  });
  it('uses CRLF line endings and folds long lines', () => {
    expect(text.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    expect(text).not.toMatch(/[^\r]\n/);
    const long = feedEventIcs({ id: 'x', areaName: 'A', at, suggestion: 'word '.repeat(40) });
    expect(long.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });
});
