import { useEffect, useState, type CSSProperties } from 'react';
import { LEVEL_NAMES } from '../../engine/format';
import type { FeedInfo } from '../../store/store';
import { FireRing } from '../FireRing/FireRing';
import { Flame } from '../ui/Flame';
import './FeedBurst.css';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Rising sparks. Fixed numbers so the burst looks the same every time. */
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 37) % 100) - 50,            // -50..49 vw-ish offset in px*3
  rise: 190 + ((i * 53) % 150),
  size: 5 + ((i * 7) % 8),
  delay: (i % 9) * 0.07,
  dur: 1.3 + ((i * 11) % 9) / 10,
  tone: i % 3,
}));

/**
 * The reward after feeding a fire: the fire swells and steps up a level, light rings wash out,
 * sparks rise, and the streak number ticks up. Tap anywhere to skip. Plays a still version
 * when the device asks for reduced motion.
 */
export function FeedBurst({ info, onDone }: { info: FeedInfo; onDone: () => void }) {
  const calm = reduced();
  const [level, setLevel] = useState(info.from);
  const [progress, setProgress] = useState(info.fromProgress);
  const [streak, setStreak] = useState(info.prevStreak);
  const levelUp = info.to > info.from;

  useEffect(() => {
    const t = [
      window.setTimeout(() => { setLevel(info.to); setProgress(info.to === 0 ? 0 : 1); }, calm ? 0 : 700),
      window.setTimeout(() => setStreak(info.streak), calm ? 0 : 1250),
      window.setTimeout(onDone, calm ? 2000 : 3400),
    ];
    if (!calm) navigator.vibrate?.([14, 40, 24]);
    return () => t.forEach(window.clearTimeout);
    // The burst plays once for this info; onDone changing identity must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = info.kind === 'big' ? 'Big session!' : levelUp ? 'Level up!' : 'Fed!';

  return (
    <div className={`burst${levelUp ? ' up' : ''}`} role="status" aria-live="polite" onClick={onDone}>
      <div className="burst-scrim" />
      <div className="burst-rays" aria-hidden="true" />
      <div className="burst-stage">
        <div className="burst-flash" aria-hidden="true" />
        {[0, 1, 2].map((i) => <span key={i} className="burst-wave" style={{ '--i': i } as CSSProperties} aria-hidden="true" />)}
        <div className="burst-embers" aria-hidden="true">
          {EMBERS.map((e, i) => (
            <span
              key={i} className={`ember t${e.tone}`}
              style={{ '--x': `${e.x * 3}px`, '--rise': `${e.rise}px`, '--s': `${e.size}px`, '--d': `${e.delay}s`, '--t': `${e.dur}s` } as CSSProperties}
            />
          ))}
        </div>
        <div className="burst-ring">
          <FireRing
            level={level} size={168} progress={progress} flareKey={level}
            label={{ title: LEVEL_NAMES[level] }}
          />
        </div>
      </div>

      <div className="burst-text">
        <div className="burst-headline">{headline}</div>
        {levelUp && <div className="burst-step">{LEVEL_NAMES[info.from]} <span aria-hidden="true">→</span><span className="sr-only"> to </span> {LEVEL_NAMES[info.to]}</div>}
        <div className="burst-area">{info.name}</div>
        {info.note && <div className="burst-note">“{info.note}”</div>}
        <div className="burst-streak">
          <Flame size={26} />
          {info.streak > info.prevStreak
            ? <span><b key={streak} className="burst-num">{streak}</b>-day streak</span>
            : <span>{info.streak}-day streak, kept alive</span>}
        </div>
        <div className="burst-today">{info.sparksToday} {info.sparksToday === 1 ? 'entry' : 'entries'} today</div>
      </div>
    </div>
  );
}
