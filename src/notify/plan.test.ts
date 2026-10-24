import { describe, expect, it } from 'vitest';
import type { Area } from '../model/types';
import { nextActiveMoment, planDue } from './plan';

const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m).getTime();
const day = { start: 8 * 60, end: 23 * 60 };

const area = (over: Partial<Area>): Area => ({
  id: 'a', name: 'JavaScript', place: 'main', coolingMinutes: 150, sparks: ['Do one array exercise'],
  level: 2, levelSince: at(1, 9), createdAt: at(1, 9), ...over,
});

describe('nextActiveMoment', () => {
  it('keeps a time inside the active hours', () => {
    expect(nextActiveMoment(at(1, 12), day)).toBe(at(1, 12));
  });
  it('moves late night to the next morning and early morning to the same morning', () => {
    expect(nextActiveMoment(at(1, 23, 30), day)).toBe(at(2, 8));
    expect(nextActiveMoment(at(2, 5), day)).toBe(at(2, 8));
  });
  it('works with a window that crosses midnight', () => {
    const night = { start: 10 * 60, end: 60 };
    expect(nextActiveMoment(at(2, 3), night)).toBe(at(2, 10));
    expect(nextActiveMoment(at(2, 0, 30), night)).toBe(at(2, 0, 30));
  });
  it('always-active hours never move a time', () => {
    expect(nextActiveMoment(at(1, 3), { start: 0, end: 0 })).toBe(at(1, 3));
  });
});

describe('planDue', () => {
  it('warns before a Warm fire drops to Embers', () => {
    // Warm, 150 min per level from 09:00, so it drops to Embers at 11:30. 15 min warning = 11:15.
    const [d] = planDue([area({})], at(1, 10), day, 15);
    expect(d.at).toBe(at(1, 11, 15));
    expect(d.title).toBe('JavaScript is about to cool');
    expect(d.body).toContain('Embers');
    expect(d.body).toContain('Do one array exercise');
    expect(d.path).toBe('/area/a');
  });
  it('stays quiet about a Hot fire dropping to Warm', () => {
    expect(planDue([area({ level: 3 })], at(1, 10), day, 15)).toEqual([]);
  });
  it('warns about Embers dropping to Cold', () => {
    const [d] = planDue([area({ level: 1 })], at(1, 10), day, 15);
    expect(d.body).toContain('Cold');
  });
  it('does not nag a fire that is already cold, or an archived one', () => {
    expect(planDue([area({ level: 0 }), area({ id: 'b', place: 'archive' })], at(1, 10), day, 15)).toEqual([]);
  });
  it('never schedules a warning at night for a side fire', () => {
    // Daily side fire, Warm since 09:00 the day before at 23:50: drops to Embers 23:50, warning 23:35 -> next morning.
    const side = area({ place: 'side', coolingMinutes: 1440, levelSince: at(1, 23, 50) });
    const [d] = planDue([side], at(2, 12), day, 15);
    expect(d.at).toBe(at(3, 8));
  });
  it('a main fire waiting out the night warns inside the next morning', () => {
    // 22:00, 90 minutes left of cooling: 60 tonight, 30 tomorrow, so it drops at 08:30. Warning 08:15.
    const [d] = planDue([area({ levelSince: at(1, 22) - 60 * 60_000 })], at(1, 22), day, 15);
    expect(d.at).toBe(at(2, 8, 15));
  });
  it('reminds at a next time you chose, exactly then, even at night', () => {
    const items = planDue([area({ level: 3, nextAt: at(2, 23, 30) })], at(1, 10), day, 15);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ at: at(2, 23, 30), title: 'Time to feed JavaScript', body: 'Do one array exercise' });
  });
  it('ignores a next time in the past', () => {
    expect(planDue([area({ level: 3, nextAt: at(1, 9) })], at(1, 10), day, 15)).toEqual([]);
  });
  it('lists reminders in time order with ids that stay the same between plans', () => {
    const a = planDue([area({ nextAt: at(1, 12) })], at(1, 10), day, 15);
    const b = planDue([area({ nextAt: at(1, 12) })], at(1, 10, 5), day, 15);
    expect(a.map((x) => x.at)).toEqual([...a.map((x) => x.at)].sort((x, y) => x - y));
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });
  it('a lead of zero says it is cooling now', () => {
    expect(planDue([area({})], at(1, 10), day, 0)[0].title).toBe('JavaScript is cooling');
  });
});
