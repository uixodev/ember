import { navigate } from '../../router';
import { IconAreas, IconBadges, IconHistory, IconHome } from './Icons';
import './ui.css';

const TABS = [
  { path: '/', label: 'Home', Icon: IconHome },
  { path: '/areas', label: 'Areas', Icon: IconAreas },
  { path: '/history', label: 'History', Icon: IconHistory },
  { path: '/badges', label: 'Badges', Icon: IconBadges },
];

export function TabBar({ path }: { path: string }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ path: p, label, Icon }) => (
        <button
          key={p} type="button" className={p === path ? 'on' : ''}
          aria-current={p === path ? 'page' : undefined} onClick={() => navigate(p)}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  );
}
