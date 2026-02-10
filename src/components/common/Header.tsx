import type { ViewId } from '../../types';
import './Header.css';

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'ホーム', icon: '📚' },
  { id: 'upload', label: 'PDF読込', icon: '📄' },
  { id: 'settings', label: '設定', icon: '⚙️' },
];

interface HeaderProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export function Header({ activeView, onNavigate }: HeaderProps) {
  const displayView = activeView === 'deck' || activeView === 'study' ? 'home' : activeView;

  return (
    <header className="header">
      <div className="header-inner">
        <button className="header-brand" onClick={() => onNavigate('home')}>
          PDF学習カード
        </button>
        <nav className="header-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`header-nav-item ${displayView === item.id ? 'header-nav-item--active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="header-nav-icon">{item.icon}</span>
              <span className="header-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
