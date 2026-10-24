import { useMemo, useState } from 'react';
import { formatSpan, formatWhen } from '../../engine/format';
import { planFeed, type Effort } from '../../engine/hold';
import type { Area } from '../../model/types';
import { useStore, type FeedEntry } from '../../store/store';
import { Button } from './Button';
import { EffortField, MinutesField, NextField, nextAtOf, type NextChoice } from './FeedFields';
import { Sheet } from './Sheet';

export type FeedKind = 'spark' | 'big';

/**
 * "Feed it": write what you did, how long it took and how hard it was. The more time and effort,
 * the longer the fire holds. You can also pick when you plan to come back.
 * The area's spark list works as templates for the note.
 */
export function FeedSheet({ area, kind = 'spark', prefill = '', prefillMinutes, onConfirm, onClose }: {
  area: Area;
  kind?: FeedKind;
  prefill?: string;
  prefillMinutes?: number;
  onConfirm: (entry: FeedEntry & { note: string }, saveAsTemplate: boolean) => void;
  onClose: () => void;
}) {
  const { data } = useStore();
  const big = kind === 'big';
  const [note, setNote] = useState(prefill);
  const [minutes, setMinutes] = useState(String(prefillMinutes ?? (big ? 60 : 5)));
  const [effort, setEffort] = useState<Effort>(3);
  const [next, setNext] = useState<NextChoice>({ kind: 'auto' });
  const [save, setSave] = useState(false);
  const now = useMemo(() => Date.now(), []);

  const trimmed = note.trim();
  const mins = Math.round(Number(minutes));
  const minsOk = Number.isFinite(mins) && mins >= 1 && mins <= 1440;
  const isNew = !big && trimmed.length > 0 && !area.sparks.includes(trimmed);
  const hours = data.settings.activeHours;

  const nextAt = nextAtOf(next);
  const plan = planFeed(area, { minutes: minsOk ? mins : 1, effort, nextAt }, now, hours);
  const autoPlan = planFeed(area, { minutes: minsOk ? mins : 1, effort }, now, hours);
  const canSubmit = minsOk && (big || trimmed.length > 0) && !(next.kind === 'pick');

  return (
    <Sheet label={big ? `Log a big session for ${area.name}` : `Feed ${area.name}`} onClose={onClose}>
      <h2>{big ? 'Log a big session' : `Feed ${area.name}`}</h2>
      <p>{big ? 'Takes the fire straight to Hot.' : 'What did you do? One line is enough.'}</p>
      <form
        className="sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onConfirm({ note: trimmed, minutes: mins, effort, nextAt }, save && isNew);
        }}
      >
        <textarea
          className="sheet-field feed-note" value={note} maxLength={160} autoFocus
          placeholder={big ? 'Built the todo list (optional)' : 'Wrote a function that sorts the list'} aria-label="What did you do?"
          onChange={(e) => setNote(e.target.value)}
        />
        {!big && area.sparks.length > 0 && (
          <div>
            <p className="feed-templates-title">Your templates, tap to use</p>
            <div className="chips light left" role="group" aria-label="Spark templates">
              {area.sparks.map((s, i) => (
                <button key={i} type="button" className={`chip${trimmed === s ? ' on' : ''}`} title={s} onClick={() => setNote(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <MinutesField value={minutes} onChange={setMinutes} />
        <EffortField value={effort} onChange={setEffort} />
        <NextField
          value={next} onChange={setNext} now={now} startMinutes={hours.start}
          autoText={`about ${formatWhen(autoPlan.nextAt, now)}`}
        />
        {isNew && (
          <label className="feed-check">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
            Save this as a template
          </label>
        )}
        <div className="sheet-foot">
          <p className="feed-plan" aria-live="polite">
            {minsOk
              ? <>The fire holds for <b>{formatSpan(plan.holdMinutes)}</b>, so the next feeding is due <b>{formatWhen(plan.nextAt, now)}</b>.</>
              : 'Enter between 1 and 1440 minutes.'}
          </p>
          <Button variant="navy" block type="submit" disabled={!canSubmit}>{big ? 'Log big session' : 'Log it'}</Button>
        </div>
      </form>
    </Sheet>
  );
}
