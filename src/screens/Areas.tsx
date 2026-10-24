import { useState } from 'react';
import { formatLong, formatShort } from '../engine/format';
import type { Place } from '../engine/heat';
import { AreaCard } from '../components/AreaCard/AreaCard';
import { Button, IconButton } from '../components/ui/Button';
import { IconGear } from '../components/ui/Icons';
import { Tabs } from '../components/ui/Tabs';
import { coolingLabel, fedText, fedToday } from '../model/labels';
import { navigate } from '../router';
import { useStore } from '../store/store';
import { Screen } from './Screen';
import './areas.css';

const EMPTY: Record<Place, string> = {
  main: 'No main fire. Pick one area to put in the spotlight.',
  side: 'Nothing on the side yet. Small fires you keep warm with one action a cycle live here.',
  archive: 'Nothing archived. Paused fires rest here and never cool.',
};

export function Areas() {
  const { data, now, heatOf, spark, moveArea, mainArea } = useStore();
  const [place, setPlace] = useState<Place>('main');
  const list = data.areas.filter((a) => a.place === place);

  return (
    <Screen tabs>
      <div className="screen-head">
        <h1>Areas</h1>
        <IconButton label="Settings" onClick={() => navigate('/settings')}><IconGear size={20} /></IconButton>
      </div>
      <Tabs
        value={place} onChange={setPlace}
        options={[{ value: 'main', label: 'Main' }, { value: 'side', label: 'Side' }, { value: 'archive', label: 'Archive' }]}
      />
      {list.length === 0 ? (
        <p className="lede areas-empty">{EMPTY[place]}</p>
      ) : (
        <div className="areas-grid">
          {list.map((a) => {
            const h = heatOf(a);
            const archived = a.place === 'archive';
            const status = archived
              ? 'frozen'
              : h.level === 0 ? 'cold' : `cools in ${a.place === 'main' ? formatShort(h.remainingMinutes) : formatLong(h.remainingMinutes)}`;
            return (
              <AreaCard
                key={a.id} name={a.name} heat={h} tag={coolingLabel(a)}
                status={archived ? status : `${status}, ${fedText(data.events, a.id, now)}`}
                variant={archived ? 'sunken' : 'glass'} action={archived ? 'thaw' : 'feed'}
                fed={fedToday(data.events, a.id, now)}
                onOpen={() => navigate(`/area/${a.id}`)}
                onAction={() => (archived ? moveArea(a.id, a.archivedFrom === 'main' && !mainArea ? 'main' : 'side') : spark(a.id))}
              />
            );
          })}
        </div>
      )}
      <div className="grow" />
      <Button block onClick={() => navigate('/new')}>New area</Button>
    </Screen>
  );
}
