import { useState } from 'react';
import { FireRing } from './components/FireRing/FireRing';
import { SparkButton } from './components/SparkButton/SparkButton';
import { formatShort, LEVEL_NAMES } from './engine/format';
import type { Level } from './engine/heat';

/** Temporary page for checking FireRing against the design PDF. Open with ?preview. */
export function Preview() {
  const [progress, setProgress] = useState(0.7);
  const [paused, setPaused] = useState(false);
  const [drain, setDrain] = useState<'split' | 'clockwise'>('split');
  const [flare, setFlare] = useState(0);
  const levels: Level[] = [3, 2, 1, 0];
  const mins = progress * 150;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 24, justifyItems: 'center' }}>
      <h1 style={{ font: 'var(--t-title)', margin: 0 }}>FireRing preview</h1>
      <div className="glass" style={{ display: 'grid', gap: 8, width: '100%', padding: 16, borderRadius: 24, background: 'var(--glass)' }}>
        <label>Progress {Math.round(progress * 100)}% ({formatShort(mins)} left)
          <input type="range" min={0} max={1} step={0.01} value={progress} style={{ width: '100%' }}
            onChange={(e) => setProgress(+e.target.value)} />
        </label>
        <label><input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> Paused (outside active hours)</label>
        <label><input type="checkbox" checked={drain === 'clockwise'} onChange={(e) => setDrain(e.target.checked ? 'clockwise' : 'split')} /> Single clockwise arc</label>
      </div>

      <FireRing level={3} size={260} progress={progress} paused={paused} drain={drain} flareKey={flare}
        urgent={mins <= 15}
        label={{ name: 'JavaScript', title: 'Hot', sub: `cools in ${formatShort(mins)}` }}
        action={<SparkButton onTap={() => setFlare((n) => n + 1)} onHold={() => alert('Spark timer')} />} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, padding: '8px 12px 24px' }}>
        {levels.map((l) => (
          <FireRing key={l} level={l} size={130} progress={progress} paused={paused} drain={drain}
            urgent={mins <= 15}
            label={{ name: 'Reading', title: LEVEL_NAMES[l], sub: l ? `cools in ${formatShort(mins)}` : 'one spark warms it' }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {levels.map((l) => <FireRing key={l} level={l} size={44} thin progress={progress} drain={drain} />)}
      </div>
    </div>
  );
}
