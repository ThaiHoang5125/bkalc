import './theme';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LegacyGate } from './components/Legacy';
import { loadData } from './persist';
import type { Loaded } from './persist';
import { useLang } from './i18n';
import { startPresence } from './online';
import './locales/en';
import './styles.css';

function Root() {
  useLang();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => { void loadData().then(setLoaded); }, []);
  if (!loaded) return <div className="loading">…</div>;
  if (loaded.locked) return <LegacyGate accounts={loaded.locked} onDone={(data) => setLoaded({ locked: null, data })} />;
  return <App initial={loaded.data} />;
}

startPresence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
