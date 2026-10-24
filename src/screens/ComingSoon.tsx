import { EntryList } from '../components/EntryList/EntryList';
import { useStore } from '../store/store';
import { Screen } from './Screen';

/** History: every entry across all areas with its note. The calendar view is phase 2. */
export function History() {
  const { data, now, deleteEvent } = useStore();
  const entries = data.events.filter((e) => data.areas.some((a) => a.id === e.areaId));
  return (
    <Screen tabs>
      <h1>History</h1>
      {entries.length === 0 && (
        <section className="glass" style={{ padding: 20, display: 'grid', gap: 8 }}>
          <h2>Nothing yet</h2>
          <p className="lede">Feed a fire and what you did shows up here, newest first.</p>
        </section>
      )}
      <EntryList events={entries} areas={data.areas} now={now} onDelete={deleteEvent} />
    </Screen>
  );
}

export function Badges() {
  return (
    <Screen tabs>
      <h1>Badges</h1>
      <section className="glass" style={{ padding: 20, display: 'grid', gap: 8 }}>
        <h2>Coming soon</h2>
        <p className="lede">3, 7 and 14-day fires per area will glow here once they are earned.</p>
      </section>
    </Screen>
  );
}
