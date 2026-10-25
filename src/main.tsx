import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/motion.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { Preview } from './Preview';
import { CampfirePreview } from './CampfirePreview';

const params = new URLSearchParams(location.search);
const preview = params.has('preview');
const campfire = params.has('campfire');
// The campfire app is the main app. ?classic opens the first version, ?preview and ?campfire the old design samples.
const classic = params.has('classic');
// three.js is large, so it loads on its own.
const Campfire3D = lazy(() => import('./Campfire3DPreview'));
createRoot(document.getElementById('root')!).render(
  classic ? <App />
    : campfire ? <CampfirePreview /> : preview ? <Preview /> : <Suspense fallback={null}><Campfire3D /></Suspense>,
);

registerSW({ immediate: true });

// The opening screen in index.html stays until the app says it is ready (the 3D scene sends "ember-ready"),
// for at least a moment so the animation is seen, and never longer than a few seconds.
const splash = document.getElementById('splash');
if (splash) {
  const shownAt = performance.now();
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    window.setTimeout(() => {
      splash.classList.add('out');
      window.setTimeout(() => splash.remove(), 550);
    }, Math.max(0, 1300 - (performance.now() - shownAt)));
  };
  window.addEventListener('ember-ready', hide, { once: true });
  if (classic || campfire || preview) requestAnimationFrame(() => requestAnimationFrame(hide));
  window.setTimeout(hide, 6000);
}
