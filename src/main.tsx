import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { Preview } from './Preview';

const preview = new URLSearchParams(location.search).has('preview');
createRoot(document.getElementById('root')!).render(preview ? <Preview /> : <App />);
