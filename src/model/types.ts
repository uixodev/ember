import type { ActiveHours, Level, Place } from '../engine/heat';

export interface Area {
  id: string;
  name: string;
  place: Place;
  /** Minutes per heat level for the current place. */
  coolingMinutes: number;
  /** Cooling remembered for the other kind of place (main vs side), so moving back restores it. */
  altCoolingMinutes?: number;
  /** Where an archived area came from, so its cooling can be restored on the way back. */
  archivedFrom?: 'main' | 'side';
  sparks: string[];
  level: Level;
  levelSince: number;
  /** How long the fire holds its level after the last feeding, before the first drop. */
  holdMinutes?: number;
  /** A next feeding time you chose yourself. Shown in notes and on the area. */
  nextAt?: number;
  createdAt: number;
}

export interface AreaEvent {
  id: string;
  type: 'spark' | 'big';
  areaId: string;
  at: number;
  minutes?: number;
  /** 1 (barely) to 5 (all in). */
  effort?: number;
  note?: string;
  /** The next time you planned when you logged this. */
  nextAt?: number;
}

export interface Settings {
  activeHours: ActiveHours;
  /** Phase 2, kept in the model so data does not need migrating. */
  ambient: boolean;
}

export interface EmberData {
  version: 1;
  onboarded: boolean;
  areas: Area[];
  events: AreaEvent[];
  settings: Settings;
}
