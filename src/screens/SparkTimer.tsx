import { useEffect, useMemo, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { HeatIcon } from '../components/ui/HeatIcon';
import { IconBack } from '../components/ui/Icons';
import { BigSessionSheet } from '../components/ui/Sheets';
import { Segmented } from '../components/ui/Tabs';
import { useFeedSheet } from '../feed';
import { back, navigate } from '../router';
import { useStore } from '../store/store';
import { Screen } from './Screen';
import './timer.css';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function SparkTimer({ areaId }: { areaId: string }) {
  const { data, big, heatOf } = useStore();
  const openFeed = useFeedSheet();
  const area = data.areas.find((a) => a.id === areaId);
  const started = useMemo(() => Date.now(), []);
  const [tick, setTick] = useState(started);
  const [minutes, setMinutes] = useState<'5' | '10'>('5');
  const [bigMode, setBigMode] = useState(false);
  const [askBig, setAskBig] = useState(false);
  const [pick, setPick] = useState(() => (area ? Math.floor(Math.random() * Math.max(1, area.sparks.length)) : 0));

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!area || area.place === 'archive') navigate('/', { replace: true });
  }, [area]);
  if (!area || area.place === 'archive') return null;

  const elapsed = Math.max(0, Math.floor((tick - started) / 1000));
  const left = Math.max(0, Number(minutes) * 60 - elapsed);
  const sparksList = area.sparks.length ? area.sparks : [`Spend ${minutes} minutes on ${area.name}`];
  const suggestion = sparksList[pick % sparksList.length];
  const shuffle = () => setPick((p) => (sparksList.length > 1 ? (p + 1 + Math.floor(Math.random() * (sparksList.length - 1))) % sparksList.length : p));

  const done = () => openFeed(area.id, { prefill: suggestion, onLogged: () => navigate('/', { replace: true }) });
  const logBig = () => setAskBig(true);

  return (
    <Screen className="timer">
      <div className="screen-head">
        <IconButton label="Back" onClick={() => back('/')}><IconBack size={18} /></IconButton>
        <h1 style={{ textAlign: 'center', fontSize: 17 }}>{bigMode ? 'Big session' : 'Spark'}</h1>
        <span style={{ width: 44 }} />
      </div>

      <button type="button" className="timer-headline" onClick={shuffle} aria-label={`${suggestion}. Tap for another suggestion.`}>
        <span className="timer-title">{suggestion}</span>
        <span className="timer-sub">{sparksList.length > 1 ? 'From your spark list. Tap to shuffle.' : 'From your spark list.'}</span>
      </button>

      <div className="timer-blob-wrap">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className={`blob blob-main${!bigMode && left === 0 ? ' done' : ''}`} role="timer" aria-live="off">
          <HeatIcon level={heatOf(area).level} size={40} />
          <div className="timer-clock">{bigMode ? clock(elapsed) : clock(left)}</div>
          <div className="timer-of">
            {bigMode ? 'keeping going' : left === 0 ? 'time is up, nicely done' : `of ${minutes} minutes`}
          </div>
        </div>
      </div>

      {!bigMode && (
        <div className="timer-length">
          <Segmented value={minutes} onChange={setMinutes} options={[{ value: '5', label: '5 min' }, { value: '10', label: '10 min' }]} />
        </div>
      )}

      <div className="grow" />
      {bigMode ? (
        <Button block onClick={logBig}>Done, log the big session</Button>
      ) : (
        <>
          <Button block onClick={done}>Done, feed the fire</Button>
          <button type="button" className="timer-link" onClick={() => setBigMode(true)}>Keep going as a big session</button>
        </>
      )}
      {askBig && (
        <BigSessionSheet
          initialMinutes={Math.max(1, Math.round(elapsed / 60))}
          onClose={() => setAskBig(false)}
          onSubmit={(m, note) => { big(area.id, m, note); setAskBig(false); navigate('/', { replace: true }); }}
        />
      )}
    </Screen>
  );
}
