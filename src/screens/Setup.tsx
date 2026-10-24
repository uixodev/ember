import { useState } from 'react';
import { DEFAULT_ACTIVE_HOURS } from '../engine/heat';
import { play } from '../sound';
import { useStore } from '../store/store';
import { Button, IconButton } from '../components/ui/Button';
import { Flame } from '../components/ui/Flame';
import { IconBack } from '../components/ui/Icons';
import { Screen, minutesToTime, timeToMinutes } from './Screen';

/** First-time setup: main area, optional side areas, active hours. */
export function Setup() {
  const { completeSetup } = useStore();
  const [step, setStep] = useState(0);
  const [main, setMain] = useState('');
  const [sides, setSides] = useState(['', '']);
  const [start, setStart] = useState(minutesToTime(DEFAULT_ACTIVE_HOURS.start));
  const [end, setEnd] = useState(minutesToTime(DEFAULT_ACTIVE_HOURS.end));

  const finish = () => {
    completeSetup(main, sides, { start: timeToMinutes(start), end: timeToMinutes(end) });
    play('ignite');
    location.hash = '/';
  };

  return (
    <Screen>
      <div className="screen-head">
        {step > 0 ? <IconButton label="Back" onClick={() => setStep(step - 1)}><IconBack size={18} /></IconButton> : <span style={{ width: 44 }} />}
        <div className="steps grow" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <span style={{ width: 44 }} />
      </div>

      {step === 0 && (
        <form className="stack grow" onSubmit={(e) => { e.preventDefault(); if (main.trim()) setStep(1); }}>
          <Flame size={96} className="setup-fire" />
          <h1>Name the first thing you want to keep <span className="sun">warm</span></h1>
          <p className="lede">This is your main fire. A few minutes a day keeps it going, so the big work never starts from cold.</p>
          <label>
            <span className="field-label">Main area</span>
            <input className="field" value={main} onChange={(e) => setMain(e.target.value)} placeholder="JavaScript" maxLength={40} autoFocus />
          </label>
          <div className="grow" />
          <Button variant="white" block type="submit" disabled={!main.trim()}>Next: side fires</Button>
        </form>
      )}

      {step === 1 && (
        <form className="stack grow" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
          <h1>Anything to keep warm on the side?</h1>
          <p className="lede">Side fires cool slowly, so one small action a day keeps them alive. You can skip this and add more later.</p>
          {sides.map((s, i) => (
            <input
              key={i} className="field" value={s} aria-label={`Side area ${i + 1}`} maxLength={40}
              placeholder={i === 0 ? 'Cleaning' : 'Reading'}
              onChange={(e) => setSides(sides.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <div className="grow" />
          <Button variant="white" block type="submit">Next: your day</Button>
        </form>
      )}

      {step === 2 && (
        <form className="stack grow" onSubmit={(e) => { e.preventDefault(); finish(); }}>
          <h1>When are you usually up?</h1>
          <p className="lede">Your main fire only cools inside these hours, so it never dies overnight. Change this any time in Settings.</p>
          <div className="time-row">
            <label><span className="field-label">From</span><input className="field" type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
            <label><span className="field-label">Until</span><input className="field" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
          </div>
          <p className="note">An end time earlier than the start works too, for example 10:00 until 01:00.</p>
          <div className="grow" />
          <Button variant="white" block type="submit">Light my first fire</Button>
        </form>
      )}
    </Screen>
  );
}
