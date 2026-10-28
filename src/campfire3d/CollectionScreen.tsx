import { useEffect, useState } from 'react';
import { Gem } from './Gem';
import { RARITIES, bestRarity, distinctGemColors, gemCount, gemsOfColor, type Collection } from './collection';
import { PALETTE_IDS, PALETTES, type PaletteId } from './palettes';

/** The gems you have collected: one slot for each fire colour. Tap a slot to see how many of each kind. */
export function CollectionScreen({ collection, onGround = 0, onClose }: {
  collection: Collection;
  /** Gems lying on the ground that you have not picked up yet. */
  onGround?: number;
  onClose: () => void;
}) {
  const [color, setColor] = useState<PaletteId | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalGems = Object.values(collection.gems).reduce((a, b) => a + b, 0);

  return (
    <div className="cl-screen" role="dialog" aria-label="Gems">
      <header className="cl-head">
        <div>
          <h2>Gems</h2>
          <p>{totalGems} gems · {distinctGemColors(collection)} of {PALETTE_IDS.length} colours</p>
        </div>
        <button type="button" className="c3-x cl-x" aria-label="Close the gems" onClick={onClose}>×</button>
      </header>

      <div className="cl-body">
        <p className="cl-note">
          Wood sometimes drops a gem in the colour of its fire. Bigger wood and a hotter fire drop more, and better ones.
          {onGround > 0 ? ` ${onGround} ${onGround === 1 ? 'is' : 'are'} lying on the ground by your fires: tap ${onGround === 1 ? 'it' : 'them'} to pick up.` : ''}
        </p>
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
            <b>{PALETTES[color].name}</b>
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
      </div>
    </div>
  );
}
