import { useRef, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { IconBack } from '../components/ui/Icons';
import { ConfirmSheet } from '../components/ui/Sheets';
import { back } from '../router';
import { hapticsSupported, tick } from '../haptics';
import { play, soundSupported } from '../sound';
import {
  notificationsSupported, permission, registerBackgroundCheck, requestPermission, showNotification, unregisterBackgroundCheck,
} from '../notify/notify';
import { exportJson } from '../storage/storage';
import { useStore } from '../store/store';
import { Screen, minutesToTime, timeToMinutes } from './Screen';

export function Settings() {
  const { data, setActiveHours, setHaptics, setSounds, setNotify, importJson, resetAll } = useStore();
  const { start, end } = data.settings.activeHours;
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [reset, setReset] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [perm, setPerm] = useState(permission());
  const notifyOn = data.settings.notify.enabled && perm === 'granted';

  const toggleNotify = async () => {
    if (notifyOn) {
      setNotify({ enabled: false });
      void unregisterBackgroundCheck();
      setNotifyMsg('');
      play('off');
      return;
    }
    const result = await requestPermission();
    setPerm(result);
    if (result === 'granted') {
      setNotify({ enabled: true });
      void registerBackgroundCheck();
      setNotifyMsg('');
      play('on');
    } else {
      setNotifyMsg(result === 'unsupported'
        ? "This browser can't show notifications."
        : 'Notifications are blocked for this site. Allow them in your browser or phone settings for Ember, then try again.');
      play('error');
    }
  };

  const sendTest = async () => {
    const ok = await showNotification({ id: `test-${Date.now()}`, title: 'Ember reminders are on', body: 'A small spark keeps it warm. This is how a reminder looks.', path: '/' });
    setNotifyMsg(ok ? 'Sent. Check your notifications.' : 'Could not show it. Check that notifications are allowed for Ember.');
  };

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
    const ok = importJson(await f.text());
    play(ok ? 'on' : 'error');
    setMessage(ok ? 'Backup imported.' : 'That file is not an Ember backup, nothing was changed.');
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
        <h2>Feel</h2>
        <button
          type="button" role="switch" aria-checked={data.settings.haptics} className="switch-row"
          onClick={() => { const next = !data.settings.haptics; setHaptics(next); if (next) window.setTimeout(tick, 0); play(next ? 'on' : 'off'); }}
        >
          <span>
            <span className="switch-title">Vibrate when I press buttons</span>
            <span className="note switch-note">{hapticsSupported() ? 'A tiny tick on every press, a longer one when you feed a fire.' : "This browser can't vibrate (iPhones don't allow it)."}</span>
          </span>
          <span className={`switch${data.settings.haptics ? ' on' : ''}`} aria-hidden="true"><span /></span>
        </button>
        <button
          type="button" role="switch" aria-checked={data.settings.sounds} className="switch-row"
          onClick={() => { const next = !data.settings.sounds; setSounds(next); if (next) window.setTimeout(() => play('on'), 0); }}
        >
          <span>
            <span className="switch-title">Sounds</span>
            <span className="note switch-note">{soundSupported() ? 'Soft clicks, a chime when you feed a fire, a rising sparkle on a level up.' : "This browser can't play sounds."}</span>
          </span>
          <span className={`switch${data.settings.sounds ? ' on' : ''}`} aria-hidden="true"><span /></span>
        </button>
      </section>

      <section className="stack">
        <h2>Reminders</h2>
        <button type="button" role="switch" aria-checked={notifyOn} className="switch-row" onClick={() => void toggleNotify()} disabled={!notificationsSupported()}>
          <span>
            <span className="switch-title">Remind me</span>
            <span className="note switch-note">A heads-up before a fire cools to Embers or Cold, and at any next time you set.</span>
          </span>
          <span className={`switch${notifyOn ? ' on' : ''}`} aria-hidden="true"><span /></span>
        </button>
        {notifyOn && (
          <>
            <div>
              <span className="field-label">Warn me this long before</span>
              <div className="chips left" role="group" aria-label="Warning time">
                {[5, 15, 30, 60].map((m) => (
                  <button key={m} type="button" className={`chip${data.settings.notify.leadMinutes === m ? ' on' : ''}`} onClick={() => setNotify({ leadMinutes: m })}>{m} min</button>
                ))}
              </div>
            </div>
            <Button variant="glass" block onClick={() => void sendTest()}>Send a test notification</Button>
          </>
        )}
        {notifyMsg && <p className="note" role="status">{notifyMsg}</p>}
        <p className="note">
          Honest note: Ember has no server, so your phone can only show these while Ember is open or was used a moment ago.
          On Android, installing it to the home screen lets the browser wake it every few hours to check. For a reminder
          that always rings, open an area and use <b>Add to calendar</b> next to its next time.
        </p>
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
