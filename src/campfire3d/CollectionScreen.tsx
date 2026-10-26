import { useEffect, useState } from 'react';
import { Segmented } from '../components/ui/Tabs';
import { Gem } from './Gem';
import { Hearth } from './Hearth';
import { Sky } from './Sky';
import {
  CREATURE_GOALS, HEARTH_STAGES, RARITIES, TOTAL_STARS, bestRarity, distinctGemColors, gemCount, gemsOfColor, hearthStage, statsOf,
  type Collection,
} from './collection';
import { CREATURE_IDS, CREATURE_NAMES, type CreatureId } from './creatures';
import { TIERS } from './mastery';
import { PALETTE_IDS, PALETTES } from './palettes';

type Tab = 'hearth' | 'creatures' | 'gems' | 'sky';

/** Everything you have collected, in one place. */
export function CollectionScreen({ collection, fires, creatureIcons, onGround = 0, onClose }: {
  collection: Collection;
  fires: { level: number }[];
  creatureIcons: Partial<Record<CreatureId, string>>;
  /** Gems lying on the ground that you have not picked up yet. */
  onGround?: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('hearth');
  const [color, setColor] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stats = statsOf(collection, fires);
  const hearth = hearthStage(collection.lifetimeXp);
  const have = { creatures: collection.creatures.length, gems: distinctGemColors(collection), stars: Math.min(TOTAL_STARS, collection.levelUps), hearth: hearth.stage };
  const totalGems = Object.values(collection.gems).reduce((a, b) => a + b, 0);

  return (
    <div className="cl-screen" role="dialog" aria-label="Collection">
      <header className="cl-head">
        <div>
          <h2>Collection</h2>
          <p>{have.creatures}/{CREATURE_IDS.length} creatures · {have.gems}/{PALETTE_IDS.length} gem colours · {have.stars}/{TOTAL_STARS} stars · hearth {have.hearth}/{HEARTH_STAGES.length}</p>
        </div>
        <button type="button" className="c3-x cl-x" aria-label="Close the collection" onClick={onClose}>×</button>
      </header>
      <div className="cl-tabs"><Segmented value={tab} onChange={setTab} options={[{ value: 'hearth', label: 'Hearth' }, { value: 'creatures', label: 'Creatures' }, { value: 'gems', label: 'Gems' }, { value: 'sky', label: 'Sky' }]} /></div>

      <div className="cl-body">
        {tab === 'hearth' && (
          <section className="cl-hearth">
            <Hearth stage={hearth.stage} />
            <h3>Great Hearth · {TIERS[hearth.stage - 1].name}</h3>
            <p className="cl-note">Every fire you feed adds to it. {collection.lifetimeXp.toLocaleString('en')} XP in all, kept even if you delete a fire.</p>
            <div className="c3-meter xp" role="progressbar" aria-label="Progress to the next stage" aria-valuemin={0} aria-valuemax={hearth.span} aria-valuenow={hearth.into}><i style={{ width: `${hearth.fraction * 100}%` }} /></div>
            <p className="cl-note">{hearth.toNext > 0 ? `${hearth.toNext.toLocaleString('en')} XP to ${TIERS[hearth.stage].name}` : 'The Great Hearth burns at its brightest.'}</p>
            <div className="cl-stats">
              <span><b>{collection.feeds}</b> feedings</span>
              <span><b>{collection.daysFed}</b> days</span>
              <span><b>{collection.streak}</b> day streak</span>
              <span><b>{collection.bestStreak}</b> best streak</span>
            </div>
          </section>
        )}

        {tab === 'creatures' && (
          <section className="cl-grid creatures">
            {CREATURE_IDS.map((id) => {
              const unlocked = collection.creatures.includes(id);
              const [h, n] = CREATURE_GOALS[id].progress(stats);
              return (
                <article key={id} className={`cl-card${unlocked ? '' : ' locked'}`}>
                  <div className="cl-pic">{creatureIcons[id] ? <img src={creatureIcons[id]} alt="" draggable={false} /> : <span className="cl-pic-fallback">{CREATURE_NAMES[id][0]}</span>}</div>
                  <b>{unlocked ? CREATURE_NAMES[id] : '???'}</b>
                  <span className="cl-goal">{unlocked ? 'Unlocked' : CREATURE_GOALS[id].text}</span>
                  {!unlocked && <div className="c3-meter xp small" aria-hidden="true"><i style={{ width: `${Math.min(100, (h / n) * 100)}%` }} /></div>}
                  {!unlocked && <span className="cl-goal">{Math.min(h, n)} / {n}</span>}
                </article>
              );
            })}
          </section>
        )}

        {tab === 'gems' && (
          <section>
            <p className="cl-note">Wood sometimes drops a gem in the colour of its fire. Bigger wood and a hotter fire drop more, and better ones. {totalGems} gems so far.{onGround > 0 ? ` ${onGround} more ${onGround === 1 ? 'is' : 'are'} lying on the ground by your fires: tap them to pick them up.` : ''}</p>
            <div className="cl-grid gems">
              {PALETTE_IDS.map((id) => {
                const best = bestRarity(collection, id);
                return (
                  <button key={id} type="button" className={`cl-gem${best ? '' : ' empty'}${color === id ? ' on' : ''}`} aria-pressed={color === id} aria-label={`${PALETTES[id].name}: ${gemsOfColor(collection, id)} gems`} onClick={() => setColor((c) => (c === id ? null : id))}>
                    <Gem color={id} rarity={best ?? 'common'} size={44} dim={!best} />
                    <span>{best ? PALETTES[id].name : '?'}</span>
                    {best && <i>{gemsOfColor(collection, id)}</i>}
                  </button>
                );
              })}
            </div>
            {color && (
              <div className="cl-detail">
                <b>{PALETTES[color as keyof typeof PALETTES].name}</b>
                <div className="cl-rarities">
                  {RARITIES.map((r) => (
                    <div key={r.id} className={gemCount(collection, color, r.id) ? '' : 'none'}>
                      <Gem color={color} rarity={r.id} size={34} dim={!gemCount(collection, color, r.id)} />
                      <span>{r.name}</span>
                      <i>{gemCount(collection, color, r.id)}</i>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'sky' && (
          <section>
            <p className="cl-note">Each time a fire gains a level, a star lights up. {collection.levelUps} so far. Eight constellations, one for each design.</p>
            <Sky levelUps={collection.levelUps} />
          </section>
        )}
      </div>
    </div>
  );
}
