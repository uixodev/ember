import { useRef } from 'react';
import { usePath } from './router';
import { StoreProvider, useStore } from './store/store';
import { Button } from './components/ui/Button';
import { Screen } from './screens/Screen';
import { Setup } from './screens/Setup';

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
  const { data, loadStatus } = useStore();
  const path = usePath();
  if (loadStatus === 'corrupt' || loadStatus === 'unavailable') return <StorageProblem />;
  if (!data.onboarded) return <Setup />;
  return <Screen><p className="lede">Route {path} comes next.</p></Screen>;
}

export function App() {
  return (
    <StoreProvider>
      <Routes />
    </StoreProvider>
  );
}
