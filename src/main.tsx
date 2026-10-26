import './theme';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthGate } from './components/Account';
import { initVault } from './vault';
import type { Session } from './vault';
import { useLang } from './i18n';
import './locales/en';
import './styles.css';

function Root() {
  useLang();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => { void initVault().then(() => setReady(true)); }, []);
  if (!ready) return <div className="loading">…</div>;
  if (!session) return <AuthGate onLogin={setSession} />;
  return <App key={session.id} session={session} onSession={setSession} onLogout={() => setSession(null)} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
