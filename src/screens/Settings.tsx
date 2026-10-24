import { useRef, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { IconBack } from '../components/ui/Icons';
import { ConfirmSheet } from '../components/ui/Sheets';
import { back } from '../router';
import { exportJson } from '../storage/storage';
import { useStore } from '../store/store';
import { Screen, minutesToTime, timeToMinutes } from './Screen';

export function Settings() {
  const { data, setActiveHours, importJson, resetAll } = useStore();
  const { start, end } = data.settings.activeHours;
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [reset, setReset] = useState(false);

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ember-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Backup saved to your downloads.');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMessage(importJson(await f.text()) ? 'Backup imported.' : 'That file is not an Ember backup, nothing was changed.');
    if (file.current) file.current.value = '';
  };

  return (
    <Screen>
      <div className="screen-head">
        <IconButton label="Back" onClick={() => back('/areas')}><IconBack size={18} /></IconButton>
        <h1>Settings</h1>
      </div>

      <section className="stack">
        <h2>Active hours</h2>
        <p className="lede">Your main fire only cools between these times. An end earlier than the start, like 10:00 until 01:00, crosses midnight.</p>
        <div className="time-row">
          <label><span className="field-label">From</span>
            <input className="field" type="time" value={minutesToTime(start)} required onChange={(e) => e.target.value && setActiveHours({ start: timeToMinutes(e.target.value), end })} />
          </label>
          <label><span className="field-label">Until</span>
            <input className="field" type="time" value={minutesToTime(end)} required onChange={(e) => e.target.value && setActiveHours({ start, end: timeToMinutes(e.target.value) })} />
          </label>
        </div>
      </section>

      <section className="stack">
        <h2>Your data</h2>
        <p className="lede">Everything lives on this device only. Save a backup before you switch phones or clear browser data.</p>
        <Button variant="glass" block onClick={download}>Export a backup</Button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="glass" block onClick={() => file.current?.click()}>Import a backup</Button>
        {message && <p className="note" role="status">{message}</p>}
        <Button variant="danger" block onClick={() => setReset(true)}>Reset all data</Button>
      </section>

      {reset && (
        <ConfirmSheet
          title="Reset everything?" body="All areas, sparks and history on this device are deleted. Export a backup first if you might want them back."
          confirmLabel="Delete everything" cancelLabel="Keep my data"
          onCancel={() => setReset(false)}
          onConfirm={() => { resetAll(); setReset(false); location.hash = '/'; }}
        />
      )}
    </Screen>
  );
}
