import type { Size } from './world';

/**
 * How fast a fire cools depends on its size: the bigger the fire, the faster it burns down. Rates are percent of
 * heat lost per day, so a fire at 100% that loses 300% a day goes cold in about 8 hours.
 *   Huge   3 times a day
 *   Large  2 times a day
 *   Medium once a day
 *   Small  once every 2 to 3 days
 */
export const SIZE_RATE: Record<Size, number> = { 1: 40, 2: 100, 3: 200, 4: 300 };
export const SIZE_COOLS: Record<Size, string> = { 1: 'Once in 2–3 days', 2: 'Once a day', 3: 'Twice a day', 4: '3 times a day' };

/** The speeds you can pick yourself instead, percent per day. */
export const RATES = [10, 20, 35, 50, 75, 100, 150, 200, 300, 480, 720];
export const rateText = (r: number): string => (r > 100 ? `${Math.round(r / 24)}% an hour` : `${r}% a day`);
