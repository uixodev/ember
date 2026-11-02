import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { parseSaved, toJson, type Saved } from '../campfire3d/saved';
import { getClient } from './client';
import { decideSync } from './decide';

const REMOTE_KEY = 'ember:cloud:remote';
const HASH_KEY = 'ember:cloud:hash';

const read = (k: string): string | null => { try { return window.localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null): void => { try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch { /* it only means the next sync asks again */ } };

/** A short fingerprint of the data, to tell whether it changed since the last sync. */
function fingerprint(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `${text.length}:${h}`;
}

const hasData = (s: Saved): boolean => s.fires.length > 0 || s.events.length > 0;

export type CloudState =
  | { kind: 'off' }
  | { kind: 'signed-out'; sent: boolean; busy: boolean; error: string | null }
  | { kind: 'signed-in'; email: string; busy: boolean; lastSync: number | null; error: string | null; conflict: Saved | null };

/**
 * Keeps the data on this device in step with the signed-in person's row in Supabase.
 * `getSaved` reads the current data, `apply` replaces it (after a pull), and `version` changes whenever the data does.
 */
export function useCloud(enabled: boolean, getSaved: () => Saved, apply: (s: Saved) => void, version: unknown) {
  const client = enabled ? getClient() : null;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!client);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [conflict, setConflict] = useState<{ remote: Saved; at: number } | null>(null);
  const getRef = useRef(getSaved); getRef.current = getSaved;
  const applyRef = useRef(apply); applyRef.current = apply;
  const running = useRef(false);

  useEffect(() => {
    if (!client) return;
    let alive = true;
    void client.auth.getSession().then(({ data }) => { if (alive) { setSession(data.session); setReady(true); } });
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [client]);

  const remember = useCallback((remoteAt: string, text: string) => {
    write(REMOTE_KEY, String(Date.parse(remoteAt)));
    write(HASH_KEY, fingerprint(text));
    setLastSync(Date.now());
  }, []);

  const push = useCallback(async (userId: string, text: string): Promise<void> => {
    if (!client) return;
    const { data, error: err } = await client.from('ember_state').upsert({ user_id: userId, data: JSON.parse(text) }, { onConflict: 'user_id' }).select('updated_at').single();
    if (err) throw err;
    remember((data as { updated_at: string }).updated_at, text);
  }, [client, remember]);

  const syncNow = useCallback(async (): Promise<void> => {
    if (!client || !session || running.current) return;
    running.current = true;
    setBusy(true); setError(null);
    try {
      const userId = session.user.id;
      const { data: row, error: err } = await client.from('ember_state').select('data, updated_at').eq('user_id', userId).maybeSingle();
      if (err) throw err;
      const local = getRef.current();
      const text = toJson(local);
      const remote = row ? parseSaved(JSON.stringify((row as { data: unknown }).data)) : null;
      const remoteAt = row ? Date.parse((row as { updated_at: string }).updated_at) : null;
      const lastRemote = read(REMOTE_KEY), lastHash = read(HASH_KEY);
      const action = decideSync({
        remoteUpdatedAt: remoteAt, lastSyncedRemote: lastRemote === null ? null : Number(lastRemote),
        localChanged: lastHash === null ? true : lastHash !== fingerprint(text),
        localHasData: hasData(local), remoteHasData: remote !== null && hasData(remote),
      });
      if (action === 'push') await push(userId, text);
      else if (action === 'pull' && remote && row) { applyRef.current(remote); remember((row as { updated_at: string }).updated_at, toJson(remote)); }
      else if (action === 'ask' && remote) setConflict({ remote, at: remoteAt ?? 0 });
      else if (row) remember((row as { updated_at: string }).updated_at, text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the cloud.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [client, session, push, remember]);

  // sync when signing in, when coming back to the app, and a little after the data changes
  useEffect(() => { if (session) void syncNow(); }, [session, syncNow]);
  useEffect(() => {
    if (!session) return;
    const onShow = () => { if (document.visibilityState === 'visible') void syncNow(); };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [session, syncNow]);
  useEffect(() => {
    if (!session || conflict) return;
    const t = window.setTimeout(() => void syncNow(), 4000);
    return () => window.clearTimeout(t);
  }, [version, session, conflict, syncNow]);

  const signIn = useCallback(async (email: string) => {
    if (!client) return;
    setBusy(true); setError(null);
    const { error: err } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } });
    setBusy(false);
    if (err) setError(err.message); else setSent(true);
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    write(REMOTE_KEY, null); write(HASH_KEY, null);
    setSent(false); setConflict(null); setLastSync(null);
  }, [client]);

  /** After "ask": keep the cloud's copy, or keep this device's and overwrite the cloud. */
  const resolve = useCallback(async (keep: 'cloud' | 'device') => {
    if (!conflict || !session) return;
    const c = conflict;
    setConflict(null); setBusy(true); setError(null);
    try {
      if (keep === 'cloud') { applyRef.current(c.remote); write(REMOTE_KEY, String(c.at)); write(HASH_KEY, fingerprint(toJson(c.remote))); setLastSync(Date.now()); }
      else await push(session.user.id, toJson(getRef.current()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the cloud.');
    } finally {
      setBusy(false);
    }
  }, [conflict, session, push]);

  const state: CloudState = !client || !ready ? { kind: 'off' }
    : !session ? { kind: 'signed-out', sent, busy, error }
    : { kind: 'signed-in', email: session.user.email ?? 'you', busy, lastSync, error, conflict: conflict?.remote ?? null };

  return { state, signIn, signOut, syncNow, resolve };
}
