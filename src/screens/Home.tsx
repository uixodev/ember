import { useMemo } from 'react';
import { formatLong, formatShort, formatWhen, LEVEL_NAMES } from '../engine/format';
import { FireRing } from '../components/FireRing/FireRing';
import { SparkButton } from '../components/SparkButton/SparkButton';
import { AreaCard } from '../components/AreaCard/AreaCard';
import { TopBar } from '../components/ui/TopBar';
import { WeekRow } from '../components/ui/WeekRow';
import { Button } from '../components/ui/Button';
import { coolingLabel, fedToday } from '../model/labels';
import { currentStreak, keptDays, sparksToday, weekRow } from '../model/streaks';
import { useFeedSheet } from '../feed';
import { navigate } from '../router';
import { useStore } from '../store/store';
import { Screen } from './Screen';
import './home.css';

export function Home() {
  const { data, now, heatOf, mainArea } = useStore();
  const openFeed = useFeedSheet();
  const { events } = data;

  const sides = useMemo(() => {
    return data.areas
      .filter((a) => a.place === 'side')
      .map((a) => ({ area: a, heat: heatOf(a) }))
      // coldest first: lowest level, then least time left
      .sort((x, y) => x.heat.level - y.heat.level || x.heat.remainingMinutes - y.heat.remainingMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.areas, now]);

  const heat = mainArea ? heatOf(mainArea) : undefined;
  const streak = mainArea ? currentStreak(keptDays(events, mainArea.id), now) : 0;
  const open = (id: string) => navigate(`/area/${id}`);

  return (
    <Screen tabs>
      <TopBar
        initial={(mainArea?.name ?? 'E').charAt(0)} streak={streak} level={heat?.level ?? 3} sparksToday={sparksToday(events, now)}
        onStreak={mainArea ? () => open(mainArea.id) : undefined}
      />

      {mainArea && heat ? (
        <>
          <div className="home-fire">
            <div className="home-fire-tap" onClick={() => open(mainArea.id)}>
              <FireRing
                level={heat.level} size={250} progress={heat.progress} paused={heat.paused}
                urgent={heat.level > 0 && heat.remainingMinutes <= 15}
                flareKey={events.length}
                label={{
                  name: mainArea.name, title: LEVEL_NAMES[heat.level],
                  sub: heat.level === 0 ? 'one spark warms it' : `cools in ${formatShort(heat.remainingMinutes)}`,
                }}
                action={<SparkButton size={64} level={heat.level} onTap={() => openFeed(mainArea.id)} onHold={() => navigate(`/spark/${mainArea.id}`)} />}
              />
            </div>
          </div>
          {mainArea.nextAt && mainArea.nextAt > now && <p className="home-hint home-next">Next time: {formatWhen(mainArea.nextAt, now)}</p>}
          {heat.level === 0 && mainArea.sparks[0] && <p className="home-hint">Smallest spark: {mainArea.sparks[0]}</p>}
          <WeekRow days={weekRow(events, mainArea.id, now)} />
        </>
      ) : (
        <section className="glass home-empty">
          <h2>No main fire right now</h2>
          <p className="lede">Pick one area to put in the spotlight.</p>
          <Button block onClick={() => navigate('/areas')}>Choose a main fire</Button>
        </section>
      )}

      {sides.length === 0 ? (
        <button type="button" className="glass home-empty add-side" onClick={() => navigate('/new')}>
          <h2>Add something to keep warm on the side</h2>
        </button>
      ) : (
        <div className="side-row" aria-label="On the side">
          {sides.map(({ area, heat: h }, i) => (
            <AreaCard
              key={area.id} name={area.name} heat={h} tag={coolingLabel(area)}
              status={h.level === 0 ? 'cold' : `cools in ${formatLong(h.remainingMinutes)}`}
              variant={i === 0 ? 'sunrise' : 'glass'} fed={fedToday(events, area.id, now)}
              onOpen={() => open(area.id)} onAction={() => openFeed(area.id)}
            />
          ))}
        </div>
      )}
      {sides.length > 0 && sides[0].heat.level === 0 && sides[0].area.sparks[0] && (
        <p className="home-hint">{sides[0].area.name}: {sides[0].area.sparks[0]}</p>
      )}
    </Screen>
  );
}
