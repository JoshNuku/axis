import { useState, useEffect } from 'react';
import ShuttleMap from './components/ShuttleMap';
import ETAPanel from './components/ETAPanel';
import Notification, { useNotifications } from './components/Notification';
import { useShuttleSocket } from './hooks/useShuttleSocket';
import './App.css';

function App() {
  const { isConnected, shuttles, shuttlePosition, isShuttleActive } = useShuttleSocket();
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Get the first (primary) shuttle with all its data
  const primaryShuttle = shuttles[0] || null;

  const { notification, dismissNotification } = useNotifications(
    shuttlePosition,
    isShuttleActive,
    primaryShuttle?.nextStop?.name
  );

  // Load theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('axis-theme');
    if (stored) {
      setIsDarkMode(stored === 'dark');
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('axis-theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <Notification
        notification={notification}
        onDismiss={dismissNotification}
      />

      <header className="app-header">
        <img src="/logos/axis-high-resolution-logo-transparent.png" alt="Axis" className="app-logo" />
        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
            <span className="status-dot"></span>
            <span>{isConnected ? 'Live' : '...'}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <ShuttleMap
          shuttles={shuttles}
          isDarkMode={isDarkMode}
        />
      </main>

      <footer className="app-footer">
        <ETAPanel
          shuttle={primaryShuttle}
          isActive={isShuttleActive}
        />
      </footer>
    </div>
  );
}

export default App;
