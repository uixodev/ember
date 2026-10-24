/**
 * Small vibrations for presses. Works where the browser allows it (Chrome and other browsers on
 * Android). iPhones do not let web pages vibrate, so there it quietly does nothing.
 */
let enabled = true;

export const hapticsSupported = (): boolean => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
  if (!on) vibrate(0);
}

function vibrate(pattern: number | number[]): void {
  if (!enabled || !hapticsSupported()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw before the first tap; ignore */
  }
}

/** A light tick for any button press. */
export const tick = () => vibrate(9);
/** The spark button was held long enough to open the timer. */
export const hold = () => vibrate([14, 35, 22]);
/** A feeding was logged. A level up gets a longer, rising pattern. */
export const fed = (levelUp: boolean) => vibrate(levelUp ? [16, 40, 20, 40, 48] : [14, 36, 22]);

const PRESSABLE = 'button, summary, a, [role="tab"], [role="radio"], select, label.feed-check, .area-card-open';

/** One listener for the whole app: every enabled button gives a tick when pressed. */
export function installPressHaptics(): () => void {
  const on = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const el = (e.target as Element | null)?.closest?.(PRESSABLE);
    if (!el || (el as HTMLButtonElement).disabled || el.classList.contains('spark-btn')) return;
    tick();
  };
  document.addEventListener('pointerdown', on, { passive: true });
  return () => document.removeEventListener('pointerdown', on);
}
