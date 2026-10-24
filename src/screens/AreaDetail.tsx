import { useEffect, useState } from 'react';
import { HeatIcon } from '../components/ui/HeatIcon';
import { formatLong, formatShort, formatWhen, LEVEL_NAMES } from '../engine/format';
import type { Level, Place } from '../engine/heat';
import { Button, IconButton } from '../components/ui/Button';
import { CoolingStepper } from '../components/ui/CoolingStepper';
import { Flame } from '../components/ui/Flame';
import { EntryList } from '../components/EntryList/EntryList';
import { IconBack, IconEdit, IconPlus, IconTrash } from '../components/ui/Icons';
import { ConfirmSheet } from '../components/ui/Sheets';
import { Segmented, Tabs } from '../components/ui/Tabs';
import { currentStreak, keptDays, longestStreak } from '../model/streaks';
import { useFeedSheet } from '../feed';
import { play, playHeat } from '../sound';
import { back, navigate } from '../router';
import { useStore } from '../store/store';
import { Screen } from './Screen';
import './detail.css';

type Pending = null | { kind: 'move'; place: Place } | { kind: 'delete' };

const PLACE_TABS: { value: Place; label: string }[] = [
  { value: 'main', label: 'Main' }, { value: 'side', label: 'Side' }, { value: 'archive', label: 'Archive' },
];

export function AreaDetail({ areaId }: { areaId: string }) {
  const { data, now, heatOf, mainArea, updateArea, moveArea, deleteArea, deleteEvent, setHeat } = useStore();
  const openFeed = useFeedSheet();
  const area = data.areas.find((a) => a.id === areaId);
  const [tab, setTab] = useState<'history' | 'badges'>('history');
  const [pending, setPending] = useState<Pending>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [newSpark, setNewSpark] = useState('');
  const [name, setName] = useState(area?.name ?? '');

  useEffect(() => { if (!area) navigate('/', { replace: true }); }, [area]);
  if (!area) return null;

  const heat = heatOf(area);
  const days = keptDays(data.events, area.id);
  const streak = currentStreak(days, now);
  const longest = longestStreak(days);
  const entries = data.events.filter((e) => e.areaId === area.id);
  const archived = area.place === 'archive';

  const changePlace = (place: Place) => {
    if (place === area.place) return;
    if (place === 'main' && mainArea && mainArea.id !== area.id) setPending({ kind: 'move', place });
    else moveArea(area.id, place);
  };

  const saveSpark = (i: number) => {
    const text = draft.trim();
    const next = area.sparks.slice();
    if (text) next[i] = text; else next.splice(i, 1);
    updateArea(area.id, { sparks: next });
    setEditing(null);
  };
  const addSpark = () => {
    const text = newSpark.trim();
    if (!text) return;
    updateArea(area.id, { sparks: [...area.sparks, text] });
    setNewSpark('');
  };
  const rename = () => {
    const n = name.trim();
    if (n && n !== area.name) updateArea(area.id, { name: n });
    else setName(area.name);
  };

  const headline = streak > 0 ? `${streak}-day fire!` : archived ? 'Resting' : 'Light it today';
  const sub = archived
    ? 'Frozen until you thaw it'
    : streak === 0
      ? area.sparks[0] ?? 'One small spark starts a streak'
      : heat.level === 0 ? area.sparks[0] ?? 'One spark warms it up' : `${LEVEL_NAMES[heat.level]} · cools in ${area.place === 'main' ? formatShort(heat.remainingMinutes) : formatLong(heat.remainingMinutes)}`;

  return (
    <Screen className="detail">
      <div className="screen-head">
        <IconButton label="Back" onClick={() => back('/')}><IconBack size={18} /></IconButton>
        <h1 style={{ textAlign: 'center', fontSize: 17 }}>{area.name}</h1>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-fire"><HeatIcon level={heat.level} size={140} /></div>
      <div className="detail-headline">
        <div className="detail-title">{headline}</div>
        <div className="detail-sub">{sub}</div>
        {area.nextAt && area.nextAt > now && !archived && <div className="detail-next">Next time: {formatWhen(area.nextAt, now)}</div>}
      </div>

      <div className="row detail-actions">
        {archived
          ? <Button block onClick={() => moveArea(area.id, area.archivedFrom === 'main' && !mainArea ? 'main' : 'side')}>Thaw it</Button>
          : <>
            <Button block onClick={() => openFeed(area.id)}>Feed it</Button>
            <Button variant="glass" block onClick={() => openFeed(area.id, { kind: 'big' })}>Log big session</Button>
          </>}
      </div>

      <div className="glass longest">
        <Flame size={34} />
        <div><div className="longest-label">Longest fire</div><div className="longest-value">{longest} {longest === 1 ? 'day' : 'days'}</div></div>
      </div>

      {tab === 'history' ? (
        <>
          <section className="stack" aria-label="Spark list">
            <h2>Spark list</h2>
            <p className="note">These are your templates. Tap one when you feed the fire to fill in your note.</p>
            {area.sparks.length === 0 && <p className="lede">Add one tiny action, like "open the editor and write one line".</p>}
            {area.sparks.map((s, i) => (
              <div key={i} className="spark-row">
                {editing === i ? (
                  <form className="spark-edit" onSubmit={(e) => { e.preventDefault(); saveSpark(i); }}>
                    <input className="field" value={draft} autoFocus maxLength={80} onChange={(e) => setDraft(e.target.value)} aria-label="Spark" />
                    <Button variant="white" small type="submit">Save</Button>
                  </form>
                ) : (
                  <>
                    <span className="spark-text">{s}</span>
                    <IconButton label={`Edit "${s}"`} onClick={() => { setEditing(i); setDraft(s); }}><IconEdit size={18} /></IconButton>
                    <IconButton label={`Delete "${s}"`} onClick={() => { play('delete'); updateArea(area.id, { sparks: area.sparks.filter((_, j) => j !== i) }); }}><IconTrash size={18} /></IconButton>
                  </>
                )}
              </div>
            ))}
            <form className="spark-edit" onSubmit={(e) => { e.preventDefault(); addSpark(); }}>
              <input className="field" value={newSpark} maxLength={80} placeholder="Add a spark" aria-label="New spark" onChange={(e) => setNewSpark(e.target.value)} />
              <IconButton label="Add spark" type="submit" disabled={!newSpark.trim()}><IconPlus size={18} /></IconButton>
            </form>
          </section>

          <section className="stack" aria-label="History">
            <h2>History</h2>
            {entries.length === 0 && <p className="lede">Nothing yet. Feed the fire and what you did shows up here.</p>}
            <EntryList events={entries} now={now} onDelete={deleteEvent} />
          </section>

          <section className="stack" aria-label="Settings">
            <h2>Settings</h2>
            <div>
              <span className="field-label">Heat, set by hand</span>
              <div className="chips left" role="group" aria-label="Heat level">
                {([3, 2, 1, 0] as Level[]).map((l) => (
                  <button key={l} type="button" className={`chip${heat.level === l ? ' on' : ''}`} aria-pressed={heat.level === l} onClick={() => { setHeat(area.id, l); playHeat(l); }}>{LEVEL_NAMES[l]}</button>
                ))}
              </div>
              <p className="note" style={{ marginTop: 6 }}>Changing it here refills the ring and is not logged as feeding.</p>
            </div>
            {!archived && (
              <CoolingStepper place={area.place as 'main' | 'side'} minutes={area.coolingMinutes} onChange={(m) => updateArea(area.id, { coolingMinutes: m })} />
            )}
            <div>
              <span className="field-label">Where it lives</span>
              <Tabs value={area.place} options={PLACE_TABS} onChange={changePlace} />
            </div>
            <label>
              <span className="field-label">Name</span>
              <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            </label>
            <Button variant="danger" block onClick={() => setPending({ kind: 'delete' })}>Delete this fire</Button>
          </section>
        </>
      ) : (
        <section className="glass coming" aria-label="Badges">
          <h2>Badges are coming soon</h2>
          <p className="lede">3, 7 and 14-day fires will glow here once they are earned.</p>
        </section>
      )}

      <div className="detail-seg">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'history', label: 'History' }, { value: 'badges', label: 'Badges' }]} />
      </div>

      {pending?.kind === 'move' && mainArea && (
        <ConfirmSheet
          title={`Make ${area.name} your main fire?`}
          body={`${mainArea.name} moves to the side and keeps the heat it has.`}
          confirmLabel="Make it main"
          onCancel={() => setPending(null)}
          onConfirm={() => { moveArea(area.id, 'main'); setPending(null); }}
        />
      )}
      {pending?.kind === 'delete' && (
        <ConfirmSheet
          title={`Delete ${area.name}?`}
          body="Its sparks and history are removed for good. Archiving keeps them."
          confirmLabel="Delete it" cancelLabel="Keep it"
          onCancel={() => setPending(null)}
          onConfirm={() => { play('delete'); deleteArea(area.id); navigate('/areas', { replace: true }); }}
        />
      )}
    </Screen>
  );
}
