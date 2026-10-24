import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { FeedSheet } from './components/ui/FeedSheet';
import { useStore } from './store/store';

interface Request {
  areaId: string;
  prefill?: string;
  onLogged?: () => void;
}

const Ctx = createContext<(areaId: string, opts?: { prefill?: string; onLogged?: () => void }) => void>(() => {});

/** Open the "Feed it" note sheet from anywhere. */
export const useFeedSheet = () => useContext(Ctx);

export function FeedHost({ children }: { children: ReactNode }) {
  const { data, spark, updateArea } = useStore();
  const [req, setReq] = useState<Request | null>(null);
  const open = useCallback((areaId: string, opts?: { prefill?: string; onLogged?: () => void }) => setReq({ areaId, ...opts }), []);
  const area = req ? data.areas.find((a) => a.id === req.areaId) : undefined;

  return (
    <Ctx.Provider value={open}>
      {children}
      {req && area && area.place !== 'archive' && (
        <FeedSheet
          area={area} prefill={req.prefill} onClose={() => setReq(null)}
          onConfirm={(note, saveTemplate) => {
            if (saveTemplate) updateArea(area.id, { sparks: [...area.sparks, note] });
            spark(area.id, note);
            setReq(null);
            req.onLogged?.();
          }}
        />
      )}
    </Ctx.Provider>
  );
}
