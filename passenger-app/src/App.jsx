import { useMemo, useState, useEffect } from 'react';
import ShuttleMap from './components/ShuttleMap';
import ETAPanel from './components/ETAPanel';
import Notification, { useNotifications } from './components/Notification';
import { useShuttleSocket } from './hooks/useShuttleSocket';
import legonStops from './data/legonStops';
import './App.css';

// Helper to find nearest stop
function getNearestStop(shuttlePosition) {
  if (!shuttlePosition) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const stop of legonStops) {
    const dlat = shuttlePosition.lat - stop.coordinates[1];
    const dlng = shuttlePosition.lng - stop.coordinates[0];
    const distance = Math.sqrt(dlat * dlat + dlng * dlng);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  return nearest;
}

function App() {
  const { isConnected, shuttles, shuttlePosition, isShuttleActive } = useShuttleSocket();
  const [isDarkMode, setIsDarkMode] = useState(true);

  const nearestStop = useMemo(() =>
    getNearestStop(shuttlePosition),
    [shuttlePosition]
  );

  const { notification, dismissNotification } = useNotifications(
    shuttlePosition,
    isShuttleActive,
    nearestStop?.name
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
          shuttlePosition={shuttlePosition}
          isActive={isShuttleActive}
        />
      </footer>
    </div>
  );
}

export default App;
