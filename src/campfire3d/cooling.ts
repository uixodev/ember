import type { Size } from './world';

/**
 * How fast a fire cools depends on its size: the bigger the fire, the faster it burns down. Rates are percent of
 * heat lost per day, so a fire at 100% that loses 100% a day is cold after one day.
 *   Huge    once a day
 *   Large   every 2 days
 *   Medium  every 3 days
 *   Small   every 4 days
 */
export const SIZE_RATE: Record<Size, number> = { 1: 25, 2: 100 / 3, 3: 50, 4: 100 };
export const SIZE_COOLS: Record<Size, string> = { 1: 'Every 4 days', 2: 'Every 3 days', 3: 'Every 2 days', 4: 'Once a day' };

/** The speeds you can pick yourself instead, percent per day. */
export const RATES = [10, 20, 35, 50, 75, 100, 150, 200, 300, 480, 720];
export const rateText = (r: number): string => (r > 100 ? `${Math.round(r / 24)}% an hour` : `${Math.round(r * 10) / 10}% a day`);
