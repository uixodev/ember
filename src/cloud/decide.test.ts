import { describe, expect, it } from 'vitest';
import { decideSync, type SyncFacts } from './decide';

const base: SyncFacts = { remoteUpdatedAt: 1000, lastSyncedRemote: 1000, localChanged: false, localHasData: true, remoteHasData: true };
const d = (p: Partial<SyncFacts>) => decideSync({ ...base, ...p });

describe('sync decisions', () => {
  it('does nothing when neither side moved', () => { expect(d({})).toBe('none'); });
  it('pushes this device\'s changes', () => { expect(d({ localChanged: true })).toBe('push'); });
  it('pulls the cloud\'s changes', () => { expect(d({ remoteUpdatedAt: 2000 })).toBe('pull'); });
  it('asks when both moved', () => { expect(d({ remoteUpdatedAt: 2000, localChanged: true })).toBe('ask'); });
  it('uploads to a new, empty cloud', () => {
    expect(d({ remoteUpdatedAt: null, lastSyncedRemote: null })).toBe('push');
    expect(d({ remoteUpdatedAt: null, lastSyncedRemote: null, localHasData: false })).toBe('none');
  });
  it('pulls on a fresh device', () => {
    expect(d({ lastSyncedRemote: null, localHasData: false })).toBe('pull');
  });
  it('asks when a device with its own data meets a cloud with data', () => {
    expect(d({ lastSyncedRemote: null })).toBe('ask');
  });
  it('treats an empty cloud row as no cloud', () => {
    expect(d({ remoteHasData: false })).toBe('push');
    expect(d({ remoteHasData: false, localHasData: false })).toBe('none');
  });
});
