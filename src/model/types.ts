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
  createdAt: number;
}

export interface AreaEvent {
  id: string;
  type: 'spark' | 'big';
  areaId: string;
  at: number;
  minutes?: number;
  note?: string;
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
