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
const campfire3d = params.has('campfire3d');
// three.js is large, so it only loads for the 3D sample.
const Campfire3D = lazy(() => import('./Campfire3DPreview'));
createRoot(document.getElementById('root')!).render(
  campfire3d ? <Suspense fallback={<p style={{ padding: 24 }}>Lighting the fire…</p>}><Campfire3D /></Suspense>
    : campfire ? <CampfirePreview /> : preview ? <Preview /> : <App />,
);

registerSW({ immediate: true });
