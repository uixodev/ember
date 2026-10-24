import { useState } from 'react';
import type { Area } from '../../model/types';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * "Feed it": write what you did, then log it. The area's spark list works as templates:
 * tap one to fill the note, then edit it if you like.
 */
export function FeedSheet({ area, prefill = '', onConfirm, onClose }: {
  area: Area;
  prefill?: string;
  onConfirm: (note: string, saveAsTemplate: boolean) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(prefill);
  const [save, setSave] = useState(false);
  const trimmed = note.trim();
  const isNew = trimmed.length > 0 && !area.sparks.includes(trimmed);

  return (
    <Sheet label={`Feed ${area.name}`} onClose={onClose}>
      <h2>Feed {area.name}</h2>
      <p>What did you do? One line is enough.</p>
      <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (trimmed) onConfirm(trimmed, save && isNew); }}>
        <textarea
          className="sheet-field feed-note" value={note} maxLength={160} autoFocus
          placeholder="Wrote a function that sorts the list" aria-label="What did you do?"
          onChange={(e) => setNote(e.target.value)}
        />
        {area.sparks.length > 0 && (
          <div>
            <p className="feed-templates-title">Your templates, tap to use</p>
            <div className="chips light left" role="group" aria-label="Spark templates">
              {area.sparks.map((s, i) => (
                <button key={i} type="button" className={`chip${trimmed === s ? ' on' : ''}`} title={s} onClick={() => setNote(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {isNew && (
          <label className="feed-check">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
            Save this as a template
          </label>
        )}
        <Button variant="navy" block type="submit" disabled={!trimmed}>Log it</Button>
      </form>
    </Sheet>
  );
}
