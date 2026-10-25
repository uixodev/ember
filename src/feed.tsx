import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { FeedSheet, type FeedKind } from './components/ui/FeedSheet';
import { useStore } from './store/store';

interface Request {
  areaId: string;
  kind: FeedKind;
  prefill?: string;
  minutes?: number;
  onLogged?: () => void;
}

interface Options {
  /** "big" logs a big session instead of a spark. */
  kind?: FeedKind;
  prefill?: string;
  /** Minutes to start with, e.g. from the timer. */
  minutes?: number;
  onLogged?: () => void;
}

const Ctx = createContext<(areaId: string, opts?: Options) => void>(() => {});

/** Open the "Feed it" sheet from anywhere. */
export const useFeedSheet = () => useContext(Ctx);

export function FeedHost({ children }: { children: ReactNode }) {
  const { data, spark, big, updateArea } = useStore();
  const [req, setReq] = useState<Request | null>(null);
  const open = useCallback((areaId: string, opts?: Options) => setReq({ areaId, kind: opts?.kind ?? 'spark', ...opts }), []);
  const area = req ? data.areas.find((a) => a.id === req.areaId) : undefined;

  return (
    <Ctx.Provider value={open}>
      {children}
      {req && area && area.place !== 'archive' && (
        <FeedSheet
          area={area} hours={data.settings.activeHours} kind={req.kind} prefill={req.prefill} prefillMinutes={req.minutes} onClose={() => setReq(null)}
          onConfirm={(entry, saveTemplate) => {
            if (saveTemplate) updateArea(area.id, { sparks: [...area.sparks, entry.note] });
            if (req.kind === 'big') big(area.id, entry);
            else spark(area.id, entry);
            setReq(null);
            req.onLogged?.();
          }}
        />
      )}
    </Ctx.Provider>
  );
}
