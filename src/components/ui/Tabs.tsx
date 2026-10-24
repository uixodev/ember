import './ui.css';

/** Big pill tabs that switch between groups (Main / Side / Archive). */
export function Tabs<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value} type="button" role="tab" aria-selected={o.value === value}
          className={`tab${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  );
}

/** Small navy segmented control (History / Badges). */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value} type="button" role="tab" aria-selected={o.value === value}
          className={`seg-item${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  );
}
