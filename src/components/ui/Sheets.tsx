import { Button } from './Button';
import { Sheet } from './Sheet';

export function ConfirmSheet({ title, body, confirmLabel, cancelLabel = 'Keep it as it is', onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Sheet label={title} onClose={onCancel}>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="sheet-actions">
        <Button variant="navy" block onClick={onConfirm}>{confirmLabel}</Button>
        <button type="button" className="sheet-link" onClick={onCancel}>{cancelLabel}</button>
      </div>
    </Sheet>
  );
}
