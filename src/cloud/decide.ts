/**
 * Cloud sync decisions, kept free of any network code so they can be tested.
 *
 * The app keeps working offline from this device's storage. The cloud holds one copy of everything. Each side
 * remembers whether it changed: here by comparing with what was last synced, in the cloud by the row's `updated_at`
 * (set by the database). After every successful sync both are remembered, so the next sync knows who has moved on.
 */
export interface SyncFacts {
  /** When the cloud row was last written, or null when there is no row yet. */
  remoteUpdatedAt: number | null;
  /** The cloud time seen at the last sync on this device, or null if this device never synced. */
  lastSyncedRemote: number | null;
  /** Has this device's data changed since the last sync? */
  localChanged: boolean;
  localHasData: boolean;
  remoteHasData: boolean;
}

export type SyncAction = 'none' | 'push' | 'pull' | 'ask';

export function decideSync(f: SyncFacts): SyncAction {
  if (f.remoteUpdatedAt === null || !f.remoteHasData) return f.localHasData ? 'push' : 'none';
  // the cloud has something
  if (f.lastSyncedRemote === null) {
    // this device has never synced with it
    return f.localHasData ? 'ask' : 'pull';
  }
  const cloudMoved = f.remoteUpdatedAt > f.lastSyncedRemote;
  const localMoved = f.localChanged;
  if (cloudMoved && localMoved) return 'ask';
  if (cloudMoved) return 'pull';
  if (localMoved) return 'push';
  return 'none';
}
