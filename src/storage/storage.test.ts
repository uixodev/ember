import { describe, expect, it } from 'vitest';
import { emptyData, exportJson, parseData, parseJson } from './storage';
import type { EmberData } from '../model/types';

const sample = (): EmberData => ({
  ...emptyData(),
  onboarded: true,
  areas: [{
    id: 'a', name: 'JS', place: 'main', coolingMinutes: 150, sparks: ['x'],
    level: 3, levelSince: 1, createdAt: 1,
  }],
  events: [{ id: 'e', type: 'spark', areaId: 'a', at: 5 }],
});

describe('storage parsing', () => {
  it('round-trips through export and import', () => {
    expect(parseJson(exportJson(sample()))).toEqual(sample());
  });
  it('accepts an empty document', () => {
    expect(parseData(emptyData())).not.toBeNull();
  });
  it('rejects garbage, wrong versions and bad areas', () => {
    expect(parseJson('not json')).toBeNull();
    expect(parseData(null)).toBeNull();
    expect(parseData({ ...sample(), version: 2 })).toBeNull();
    expect(parseData({ ...sample(), areas: [{ id: 'a' }] })).toBeNull();
    const bad = sample();
    bad.areas[0].level = 7 as never;
    expect(parseData(bad)).toBeNull();
    expect(parseData({ ...sample(), settings: {} })).toBeNull();
  });
});
