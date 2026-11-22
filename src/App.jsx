import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import { useHousehold, joinHousehold } from './lib/useHousehold.js';
import { capturePendingJoin, getPendingJoin, clearPendingJoin } from './lib/pendingJoin.js';
import { useOnline } from './lib/useOnline.js';
import SignIn from './components/SignIn.jsx';
import HouseholdSetup from './components/HouseholdSetup.jsx';
import GroceryList from './components/GroceryList.jsx';
import Pantry from './components/Pantry.jsx';
import Recipes from './components/Recipes.jsx';
import Settings from './components/Settings.jsx';

capturePendingJoin();

const TABS = [
  { id: 'list', label: 'List', icon: '🛒' },
  { id: 'pantry', label: 'Pantry', icon: '🧂' },
  { id: 'recipes', label: 'Recipes', icon: '📖' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

function readTab() {
  try {
    return localStorage.getItem('grocery.tab') || 'list';
  } catch {
    return 'list';
  }
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  if (user === undefined) return <Splash />;
  if (!user) return <SignIn />;
  return <SignedIn user={user} />;
}

function Splash() {
  return (
    <div className="splash">
      <img src="/icon.svg" alt="" width="72" height="72" />
    </div>
  );
}

function SignedIn({ user }) {
  const { loading, household, all, error } = useHousehold(user);
  const [joining, setJoining] = useState(() => getPendingJoin());
  const [joinError, setJoinError] = useState('');
  const [tab, setTab] = useState(readTab);
  const online = useOnline();

  useEffect(() => {
    if (!joining || loading) return;
    if (all.some((h) => h.id === joining)) {
      clearPendingJoin();
      setJoining(null);
      return;
    }
    joinHousehold(user, joining)
      .catch((e) => setJoinError(`That invite link didn't work (${e.code || e.message}).`))
      .finally(() => {
        clearPendingJoin();
        setJoining(null);
      });
  }, [joining, loading, all, user]);

  const pick = (id) => {
    setTab(id);
    try {
      localStorage.setItem('grocery.tab', id);
    } catch {
      /* ignore */
    }
  };

  if (loading || joining) return <Splash />;
  if (!household) return <HouseholdSetup user={user} error={joinError || error} />;

  return (
    <div className="app">
      <header className="topbar">
        <h1>{household.name || 'Groceries'}</h1>
        {!online && <span className="pill offline">Offline · changes will sync</span>}
      </header>
      <main className="content">
        {tab === 'list' && <GroceryList household={household} user={user} />}
        {tab === 'pantry' && <Pantry household={household} user={user} />}
        {tab === 'recipes' && <Recipes household={household} user={user} />}
        {tab === 'settings' && <Settings household={household} user={user} households={all} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => pick(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
