import { useState } from 'react';
import { DEFAULT_MAIN_COOLING, SIDE_COOLING, type Place } from '../engine/heat';
import { Button, IconButton } from '../components/ui/Button';
import { CoolingStepper } from '../components/ui/CoolingStepper';
import { IconBack } from '../components/ui/Icons';
import { ConfirmSheet } from '../components/ui/Sheets';
import { Tabs } from '../components/ui/Tabs';
import { back, navigate } from '../router';
import { useStore } from '../store/store';
import { Screen } from './Screen';
import './areas.css';

export function NewArea() {
  const { addArea, mainArea } = useStore();
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place>('side');
  const [cooling, setCooling] = useState<number>(SIDE_COOLING.threeDays);
  const [sparks, setSparks] = useState(['']);
  const [confirm, setConfirm] = useState(false);

  const choosePlace = (p: Place) => {
    setPlace(p);
    if (p === 'main') setCooling(DEFAULT_MAIN_COOLING);
    else if (place === 'main') setCooling(SIDE_COOLING.threeDays);
  };

  const create = () => {
    const list = sparks.map((s) => s.trim()).filter(Boolean);
    const id = addArea({
      name, place, coolingMinutes: cooling,
      sparks: list.length ? list : [`Spend 5 minutes on ${name.trim()}`],
    });
    navigate(place === 'archive' ? '/areas' : `/area/${id}`, { replace: true });
  };

  const submit = () => {
    if (!name.trim()) return;
    if (place === 'main' && mainArea) setConfirm(true);
    else create();
  };

  return (
    <Screen className="new-area">
      <div className="screen-head">
        <IconButton label="Back" onClick={() => back('/areas')}><IconBack size={18} /></IconButton>
        <h1>New area</h1>
      </div>
      <form className="stack grow" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input className="field" value={name} maxLength={40} placeholder="Cleaning" aria-label="Name" onChange={(e) => setName(e.target.value)} autoFocus />
        <Tabs
          value={place} onChange={choosePlace}
          options={[{ value: 'main', label: 'Main' }, { value: 'side', label: 'On the side' }, { value: 'archive', label: 'Archive' }]}
        />
        {place !== 'archive' && <CoolingStepper place={place} minutes={cooling} onChange={setCooling} />}
        <section className="bonfire">
          <div className="bonfire-title">Smallest possible spark</div>
          {sparks.map((s, i) => (
            <input
              key={i} className="field" value={s} maxLength={80} aria-label={`Spark ${i + 1}`}
              placeholder={i === 0 ? 'Clear one surface' : 'Another tiny action'}
              onChange={(e) => setSparks(sparks.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          {sparks.length < 5 && <button type="button" className="link" onClick={() => setSparks([...sparks, ''])}>+ add another spark</button>}
        </section>
        <div className="grow" />
        <Button block type="submit" disabled={!name.trim()}>Light this fire</Button>
      </form>
      {confirm && mainArea && (
        <ConfirmSheet
          title={`Make ${name.trim()} your main fire?`}
          body={`${mainArea.name} moves to the side and keeps the heat it has.`}
          confirmLabel="Make it main" onCancel={() => setConfirm(false)} onConfirm={create}
        />
      )}
    </Screen>
  );
}
