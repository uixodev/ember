import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedSheet } from './components/ui/FeedSheet';
import { play, playHeat, unlockAudio } from './sound';
import { HeatIcon } from './components/ui/HeatIcon';
import { Segmented } from './components/ui/Tabs';
import { TopBar } from './components/ui/TopBar';
import { LEVEL_NAMES, formatSpan } from './engine/format';
import { DEFAULT_ACTIVE_HOURS, type Level as HeatLevel } from './engine/heat';
import { planFeed } from './engine/hold';
import type { Area } from './model/types';
import { CampfireWorld, FIRE_STYLES, type DragState, type FireStyle, type LabelPos, type Level, type Size } from './campfire3d/world';
import { CREATURE_IDS, CREATURE_NAMES, type CreatureId } from './campfire3d/creatures';
import { PALETTES, PALETTE_IDS, type PaletteId } from './campfire3d/palettes';
import { STICKS, type StickKind } from './campfire3d/sticks';
import type { FeedEntry } from './store/store';
import './campfire.css';
import './campfire3d.css';

/**
 * DESIGN SAMPLE, not the real app: one fixed screen, no scrolling. Every area is its own campfire.
 * Drag wood from the dock onto a fire, say what you did, log it, and watch it burn.
 * Open with ?campfire3d. All data here is made up.
 */

interface Fire { area: Area; level: Level; progress: number; size: Size; color: PaletteId; style: FireStyle; creature: CreatureId | 'auto' | 'none'; main?: boolean; cool: string }

const mk = (id: string, name: string, level: Level, progress: number, size: Size, cool: string, color: PaletteId, style: FireStyle = 'camp', main = false): Fire => ({
  area: { id, name, place: main ? 'main' : 'side', coolingMinutes: main ? 150 : 1440, sparks: [`Spend 5 minutes on ${name}`], level, levelSince: 0, createdAt: 0 },
  level, progress, size, color, style, creature: 'auto', main, cool,
});

const SAMPLE: Fire[] = [
  mk('js', 'JavaScript', 2, 0.55, 4, '1 h 20', 'classic', 'camp', true),
  mk('clean', 'Cleaning', 3, 0.8, 2, '19 h', 'green', 'inferno'),
  mk('read', 'Reading', 1, 0.2, 2, '5 h', 'crimson', 'camp'),
  mk('draw', 'Drawing', 2, 0.6, 1, '4 days', 'gold', 'candle'),
  mk('guitar', 'Guitar', 0, 0, 2, 'cold', 'sapphire', 'crystal'),
  mk('piano', 'Piano', 3, 0.9, 3, '2 days', 'aurora', 'swirl'),
  mk('run', 'Running', 1, 0.35, 2, '9 h', 'lava', 'torch'),
  mk('es', 'Spanish', 2, 0.4, 3, '11 h', 'sky', 'wisp'),
  mk('cook', 'Cooking', 3, 0.7, 1, '3 days', 'amber', 'inferno'),
  mk('write', 'Writing', 0, 0, 2, 'cold', 'ice', 'crystal'),
  mk('med', 'Meditate', 1, 0.5, 1, '7 h', 'mint', 'wisp'),
  mk('garden', 'Garden', 2, 0.3, 1, '2 days', 'lime', 'candle'),
];
// hand every area a different creature in turn, so the Hot fires don't all get the same one
SAMPLE.forEach((f, i) => { f.creature = CREATURE_IDS[(i + 5) % CREATURE_IDS.length]; });

const SIZE_NAMES: Record<Size, string> = { 1: 'Small', 2: 'Medium', 3: 'Large', 4: 'Huge' };
const HOURS = DEFAULT_ACTIVE_HOURS;
const VIEWS = [{ azimuth: 0, polar: 0.84 }, { azimuth: 0, polar: 0.3 }, { azimuth: Math.PI / 2, polar: 1.2 }];

interface Pending { fireId: string; kind: StickKind; stickId: number | null }
type Panel = null | 'customise' | 'menu';
type Tab = 'size' | 'colour' | 'style' | 'creature';

export default function Campfire3DPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<CampfireWorld | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewIndex = useRef(0);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);
  const [creaturesAll, setCreaturesAll] = useState(false);
  const [held, setHeld] = useState<StickKind | null>(null);
  const [icons, setIcons] = useState<Partial<Record<StickKind, string>>>({});
  const [count, setCount] = useState(5);
  const [fires, setFires] = useState<Fire[]>(SAMPLE);
  const [sel, setSel] = useState<string | null>('js');
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [tab, setTab] = useState<Tab>('size');

  const shown = useMemo(() => fires.slice(0, count), [fires, count]);
  const chosen = shown.find((f) => f.area.id === sel);
  const pendingFire = pending ? shown.find((f) => f.area.id === pending.fireId) : undefined;
  const overFire = drag?.overFire ? shown.find((f) => f.area.id === drag.overFire) : undefined;

  // The page is one fixed screen: nothing to scroll.
  useEffect(() => {
    document.documentElement.classList.add('c3-lock');
    return () => document.documentElement.classList.remove('c3-lock');
  }, []);

  const onFrame = useCallback((_labels: LabelPos[]) => {}, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const world = new CampfireWorld(canvas, {
        onFrame,
        onSelectFire: (id) => { if (id) setSel(id); },
        onDrag: (s) => setDrag(s.dragging ? s : null),
        onDrop: (fireId, kind, stickId) => { play('wood'); setHint(false); setPending({ fireId, kind, stickId }); },
        onInteract: () => setHint(false),
        reducedMotion: reduced,
      });
      worldRef.current = world;
      (window as unknown as { __world: CampfireWorld }).__world = world;
      const t = window.setTimeout(() => setIcons(world.renderIcons()), 250);
      return () => { window.clearTimeout(t); world.dispose(); worldRef.current = null; };
    } catch {
      setFailed(true);
    }
  }, [onFrame]);

  // keep the fires centred in the part of the screen the controls leave free
  useEffect(() => {
    const measure = () => worldRef.current?.setInsets(topRef.current?.offsetHeight ?? 0, bottomRef.current?.offsetHeight ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (topRef.current) ro.observe(topRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, [failed]);

  useEffect(() => {
    worldRef.current?.setFires(shown.map((f) => ({ id: f.area.id, level: f.level, progress: f.progress, size: f.size, color: f.color, style: f.style, creature: f.creature })));
  }, [shown]);
  useEffect(() => { worldRef.current?.setSelected(sel); }, [sel]);
  useEffect(() => { worldRef.current?.setCreaturesAlways(creaturesAll); }, [creaturesAll]);

  const cancelPending = () => {
    if (pending?.stickId) worldRef.current?.returnStick(pending.stickId);
    setPending(null);
  };

  const confirm = (entry: FeedEntry & { note: string }) => {
    if (!pending || !pendingFire) return;
    const fire = pendingFire;
    const plan = planFeed(fire.area, { minutes: entry.minutes ?? 5, effort: entry.effort ?? 3, nextAt: entry.nextAt }, Date.now(), HOURS);
    const to = Math.min(3, fire.level + 1) as Level;
    play('woodBurn'); window.setTimeout(() => playHeat(to), 450);
    if (pending.stickId) worldRef.current?.consumeStick(pending.stickId); else worldRef.current?.flare(fire.area.id);
    setFires((all) => all.map((f) => (f.area.id === fire.area.id ? { ...f, level: to, progress: 1, cool: formatSpan(plan.holdMinutes) } : f)));
    setPending(null);
  };

  const feedWithoutWood = () => { if (chosen) setPending({ fireId: chosen.area.id, kind: 'branch', stickId: null }); };


  const patch = (change: Partial<Fire>) => { if (chosen) setFires((all) => all.map((f) => (f.area.id === chosen.area.id ? { ...f, ...change } : f))); };
  const shuffle = () => setFires((all) => all.map((f) => { const lv = ((Math.random() * 4) | 0) as Level; return { ...f, level: lv, progress: lv ? 0.2 + Math.random() * 0.75 : 0, cool: lv ? 'a while' : 'cold' }; }));
  const mixSizes = () => setFires((all) => all.map((f) => ({ ...f, size: (1 + ((Math.random() * 4) | 0)) as Size })));
  const nextView = () => { viewIndex.current = (viewIndex.current + 1) % VIEWS.length; worldRef.current?.flyTo(VIEWS[viewIndex.current]); };

  // wood from the dock: pick it up here, carry it into the scene
  const grab = (kind: StickKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanel(null);
    unlockAudio();
    worldRef.current?.beginTrayDrag(kind, e.clientX, e.clientY, e.pointerId);
    setHeld(kind);
    setHint(false);
  };
  const carry = (e: React.PointerEvent) => { worldRef.current?.moveTrayDrag(e.clientX, e.clientY); };
  const release = (drop: boolean) => () => { worldRef.current?.endTrayDrag(drop); setHeld(null); };
  const useWood = (kind: StickKind) => (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && chosen) { e.preventDefault(); setPending({ fireId: chosen.area.id, kind, stickId: null }); }
  };

  const warm = shown.length ? Math.max(...shown.map((f) => f.level)) : 0;
  const stageH = stageRef.current?.clientHeight ?? 700;
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="c3-app" ref={stageRef}>
      {failed ? (
        <div className="c3-fail"><b>3D isn't available on this device</b><span>Open the flat version instead: add ?campfire to the address.</span></div>
      ) : (
        <>
          <canvas ref={canvasRef} className="c3-canvas" aria-label="Your campfires" />
          {shown.length === 0 && <div className="camp-empty"><b>No fires yet</b><span>Add an area to light its fire.</span></div>}
          {drag && (
            <div className={`c3-chip${overFire ? ' ready' : ''}`} style={{ left: Math.max(70, Math.min(drag.x, (stageRef.current?.clientWidth ?? 390) - 70)), top: Math.min(drag.y, stageH - 150) }} aria-hidden="true">
              <b>{STICKS[drag.kind ?? 'branch'].name}</b>
              <span>{overFire ? `Let go to feed ${overFire.area.name}` : `${STICKS[drag.kind ?? 'branch'].blurb}, about ${STICKS[drag.kind ?? 'branch'].minutes} min`}</span>
            </div>
          )}
        </>
      )}

      <div className="c3-top" ref={topRef}>
        <TopBar initial="J" streak={4} sparksToday={3} level={warm as HeatLevel} />
        {chosen && (
          <div className="c3-title" aria-live="polite">
            <h1>{chosen.area.name}{chosen.main ? ' · main' : ''}</h1>
            <span className={`c3-state lv${chosen.level}`}><HeatIcon level={chosen.level} size={18} />{LEVEL_NAMES[chosen.level as HeatLevel]}</span>
          </div>
        )}
      </div>
      <div className="c3-side">
        <button type="button" className="c3-round" aria-label="Change the view" onClick={nextView}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
        </button>
        <button type="button" className={`c3-round${panel === 'menu' ? ' on' : ''}`} aria-label="More options" aria-expanded={panel === 'menu'} onClick={() => togglePanel('menu')}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" /><circle cx="16" cy="7" r="2.4" fill="currentColor" /><circle cx="8" cy="17" r="2.4" fill="currentColor" /></svg>
        </button>
      </div>
      {hint && !drag && !panel && <div className="c3-hint" aria-hidden="true">Drag wood from the dock onto a fire</div>}

      <div className="c3-bottom" ref={bottomRef}>
        {panel === 'customise' && chosen && (
          <section className="c3-panel" aria-label={`Customise ${chosen.area.name}`}>
            <div className="c3-panel-head">
              <b>{chosen.area.name}</b>
              <button type="button" className="c3-x" aria-label="Close" onClick={() => setPanel(null)}>×</button>
            </div>
            <Segmented value={tab} onChange={setTab} options={[{ value: 'size', label: 'Size' }, { value: 'colour', label: 'Colour' }, { value: 'style', label: 'Style' }, { value: 'creature', label: 'Creature' }]} />
            <div className="c3-panel-body">
              {tab === 'size' && (
                <div className="camp-size-row" role="radiogroup" aria-label="Fire size">
                  {([1, 2, 3, 4] as Size[]).map((z) => (
                    <button key={z} type="button" role="radio" aria-checked={chosen.size === z} aria-label={SIZE_NAMES[z]} className={`camp-size-btn${chosen.size === z ? ' on' : ''}`} onClick={() => patch({ size: z })}>
                      <i style={{ height: 6 + z * 4, width: 12 + z * 6, borderRadius: '50%' }} /><span>{SIZE_NAMES[z]}</span>
                    </button>
                  ))}
                </div>
              )}
              {tab === 'colour' && (
                <div className="c3-swatches" role="radiogroup" aria-label="Fire colour">
                  {PALETTE_IDS.map((id) => (
                    <button key={id} type="button" role="radio" aria-checked={chosen.color === id} aria-label={PALETTES[id].name} title={PALETTES[id].name}
                      className={`c3-swatch${chosen.color === id ? ' on' : ''}`} style={{ background: PALETTES[id].swatch }} onClick={() => patch({ color: id })} />
                  ))}
                </div>
              )}
              {tab === 'style' && (
                <div className="chips left" role="radiogroup" aria-label="Fire style">
                  {FIRE_STYLES.map((x) => (
                    <button key={x.id} type="button" role="radio" aria-checked={chosen.style === x.id} className={`chip${chosen.style === x.id ? ' on' : ''}`} onClick={() => patch({ style: x.id })}>{x.name}</button>
                  ))}
                </div>
              )}
              {tab === 'creature' && (
                <>
                  <div className="chips left" role="radiogroup" aria-label="Creature on top">
                    {(['auto', 'none', ...CREATURE_IDS] as const).map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={chosen.creature === c} className={`chip${chosen.creature === c ? ' on' : ''}`} onClick={() => patch({ creature: c })}>
                        {c === 'auto' ? 'Auto' : c === 'none' ? 'None' : CREATURE_NAMES[c]}
                      </button>
                    ))}
                  </div>
                  <span className="camp-size-note">A creature of fire stands on a fire when it is Hot.</span>
                </>
              )}
            </div>
          </section>
        )}

        {panel === 'menu' && (
          <section className="c3-panel" aria-label="More options">
            <div className="c3-panel-head"><b>Try it</b><button type="button" className="c3-x" aria-label="Close" onClick={() => setPanel(null)}>×</button></div>
            <label className="c3-range"><span>Areas: <b>{count}</b></span>
              <input type="range" min={0} max={12} value={count} onChange={(e) => { const n = +e.target.value; setCount(n); if (sel && !fires.slice(0, n).some((f) => f.area.id === sel)) setSel(null); }} />
            </label>
            <div className="c3-switches">
              <button type="button" role="switch" aria-checked={creaturesAll} className={`c3-pill${creaturesAll ? ' on' : ''}`} onClick={() => setCreaturesAll((n) => !n)}>Creatures everywhere</button>
              <button type="button" className="c3-pill" onClick={shuffle}>Shuffle heats</button>
              <button type="button" className="c3-pill" onClick={mixSizes}>Mix sizes</button>
            </div>
            <span className="camp-size-note">Design sample, not the real app yet. All data is made up.</span>
          </section>
        )}

        {chosen && !drag && (
          <div className="c3-focus">
            <div className="c3-focus-text"><b>{chosen.level === 0 ? 'One spark warms it' : `Cools in ${chosen.cool}`}</b></div>
            <button type="button" className="c3-act primary" onClick={feedWithoutWood}>Feed it</button>
            <button type="button" className={`c3-act${panel === 'customise' ? ' on' : ''}`} aria-expanded={panel === 'customise'} onClick={() => togglePanel('customise')}>Customise</button>
          </div>
        )}

        <section className="c3-dock" aria-label="Your wood">
          {(Object.keys(STICKS) as StickKind[]).map((k) => (
            <button key={k} type="button" className={`c3-slot${held === k ? ' held' : ''}`}
              aria-label={`${STICKS[k].name}, about ${STICKS[k].minutes} minutes. Drag onto a fire, or press Enter to feed the selected fire.`}
              onPointerDown={grab(k)} onPointerMove={carry} onPointerUp={release(true)} onPointerCancel={release(false)} onKeyDown={useWood(k)}>
              <span className="c3-slot-img">{icons[k] ? <img src={icons[k]} alt="" draggable={false} /> : <i className={`c3-slot-fallback ${k}`} />}</span>
              <b>{STICKS[k].name}</b>
              <span>{STICKS[k].minutes} min</span>
            </button>
          ))}
        </section>
      </div>

      {pending && pendingFire && (
        <FeedSheet
          area={pendingFire.area} hours={HOURS}
          prefillMinutes={STICKS[pending.kind].minutes} prefillEffort={STICKS[pending.kind].effort}
          onClose={cancelPending}
          onConfirm={(entry) => confirm(entry)}
        />
      )}
    </div>
  );
}
