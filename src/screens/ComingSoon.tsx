import { Screen } from './Screen';

const COPY = {
  history: { title: 'History', line: 'A calendar of every spark and big session, across all your fires, is on its way.' },
  badges: { title: 'Badges', line: '3, 7 and 14-day fires per area will glow here once they are earned.' },
};

export function ComingSoon({ kind }: { kind: 'history' | 'badges' }) {
  return (
    <Screen tabs>
      <h1>{COPY[kind].title}</h1>
      <section className="glass" style={{ padding: 20, display: 'grid', gap: 8 }}>
        <h2>Coming soon</h2>
        <p className="lede">{COPY[kind].line} For now, each area shows its own history.</p>
      </section>
    </Screen>
  );
}
