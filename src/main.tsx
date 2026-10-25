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
createRoot(document.getElementById('root')!).render(campfire ? <CampfirePreview /> : preview ? <Preview /> : <App />);

registerSW({ immediate: true });
