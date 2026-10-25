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
// Once you have opened the campfire app it stays your home screen (also when installed). ?classic goes back.
let remembered = false;
try {
  if (params.has('classic')) window.localStorage.removeItem('ember:ui');
  if (params.has('campfire3d')) window.localStorage.setItem('ember:ui', 'campfire');
  remembered = window.localStorage.getItem('ember:ui') === 'campfire';
} catch { /* storage blocked: the link still works */ }
const campfire3d = params.has('campfire3d') || (remembered && !preview && !params.has('campfire') && !params.has('classic'));
// three.js is large, so it only loads for the 3D sample.
const Campfire3D = lazy(() => import('./Campfire3DPreview'));
createRoot(document.getElementById('root')!).render(
  campfire3d ? <Suspense fallback={<p style={{ padding: 24 }}>Lighting the fire…</p>}><Campfire3D /></Suspense>
    : campfire ? <CampfirePreview /> : preview ? <Preview /> : <App />,
);

registerSW({ immediate: true });
