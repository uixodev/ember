import fire from '../../assets/fire-3d.png';
import { Button } from './Button';
import { Sheet } from './Sheet';

const RAYS = Array.from({ length: 17 }, (_, i) => i * 22);

/** "Hot again!" — a fire came back from Embers or Cold. */
export function CelebrationSheet({ name, from, onClose }: { name: string; from: 0 | 1; onClose: () => void }) {
  return (
    <Sheet label="Hot again" onClose={onClose}>
      <div className="celebrate-art">
        <svg width="170" height="120" viewBox="0 0 170 120" aria-hidden="true">
          <g fill="#FFF1C2">
            {RAYS.map((r) => <path key={r} transform={`rotate(${r} 85 64)`} d="M85 64 L80 0 L90 0 Z" />)}
          </g>
          <circle cx="85" cy="64" r="40" fill="#FFF6D8" />
        </svg>
        <img src={fire} alt="" width={96} height={96} draggable={false} />
      </div>
      <h2 className="celebrate-title">Hot again!</h2>
      <p>{name} went from {from === 0 ? 'cold' : 'embers'} to hot.<br />One spark tomorrow keeps it there.</p>
      <div className="sheet-actions"><Button variant="navy" block onClick={onClose}>Got it</Button></div>
    </Sheet>
  );
}
