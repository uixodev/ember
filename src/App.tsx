import { useRef } from 'react';
import { usePath } from './router';
import { StoreProvider, useStore } from './store/store';
import { Button } from './components/ui/Button';
import { Screen } from './screens/Screen';
import { Setup } from './screens/Setup';
import { Home } from './screens/Home';
import { AreaDetail } from './screens/AreaDetail';
import { Areas } from './screens/Areas';
import { NewArea } from './screens/NewArea';
import { Settings } from './screens/Settings';
import { Badges, History } from './screens/ComingSoon';
import { FeedHost } from './feed';
import { FeedBurst } from './components/FeedBurst/FeedBurst';
import { CelebrationSheet } from './components/ui/CelebrationSheet';
import { SparkTimer } from './screens/SparkTimer';
import { TabBar } from './components/ui/TabBar';

function StorageProblem() {
  const { loadStatus, importJson, startFresh } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const corrupt = loadStatus === 'corrupt';
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!importJson(await f.text())) alert('That file is not an Ember backup.');
  };
  return (
    <Screen>
      <h1>{corrupt ? 'Your saved data looks damaged' : "Ember can't save on this device"}</h1>
      <p className="lede">
        {corrupt
          ? 'Nothing has been deleted yet. If you have an Ember backup, import it. Otherwise you can start fresh, which replaces the damaged data.'
          : 'Storage is blocked, maybe by a private window. You can still try Ember, but nothing will be remembered after you close it.'}
      </p>
      <div className="grow" />
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {corrupt && <Button block onClick={() => file.current?.click()}>Import a backup</Button>}
      <Button variant="glass" block onClick={startFresh}>{corrupt ? 'Start fresh' : 'Continue without saving'}</Button>
    </Screen>
  );
}

function Routes() {
  const { data, loadStatus, celebration, dismissCelebration, feed, finishFeed } = useStore();
  const path = usePath();
  if (loadStatus === 'corrupt' || loadStatus === 'unavailable') return <StorageProblem />;
  if (!data.onboarded) return <Setup />;
  const tabs = ['/', '/areas', '/history', '/badges'].includes(path);
  let view;
  if (path === '/') view = <Home />;
  else if (path === '/areas') view = <Areas />;
  else if (path === '/new') view = <NewArea />;
  else if (path === '/settings') view = <Settings />;
  else if (path === '/history') view = <History />;
  else if (path === '/badges') view = <Badges />;
  else if (path.startsWith('/spark/')) view = <SparkTimer key={path} areaId={path.slice(7)} />;
  else if (path.startsWith('/area/')) view = <AreaDetail key={path} areaId={path.slice(6)} />;
  else view = <Screen><p className="lede">That page does not exist.</p><a href="#/" style={{ color: '#fff' }}>Back to Home</a></Screen>;
  return (
    <>
      {view}
      {tabs && <TabBar path={path} />}
      {feed && <FeedBurst key={feed.areaId + feed.sparksToday + feed.to} info={feed} onDone={finishFeed} />}
      {celebration && !feed && <CelebrationSheet name={celebration.name} from={celebration.from as 0 | 1} onClose={dismissCelebration} />}
    </>
  );
}

export function App() {
  return (
    <StoreProvider>
      <FeedHost>
        <Routes />
      </FeedHost>
    </StoreProvider>
  );
}
