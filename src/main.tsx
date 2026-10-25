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
    : campfire ? <CampfirePreview /> : preview ? <Preview /> : <Suspense fallback={<p style={{ padding: 24 }}>Lighting the fire…</p>}><Campfire3D /></Suspense>,
);

registerSW({ immediate: true });
