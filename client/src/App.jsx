import { useCallback, useEffect, useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import TaskDashboard from './components/TaskDashboard.jsx';
import { apiRequest, clearToken, getToken, saveToken } from './api.js';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getToken()));

  const endSession = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('taskflow:unauthorized', handleUnauthorized);

    const token = getToken();
    if (!token) {
      return () => window.removeEventListener('taskflow:unauthorized', handleUnauthorized);
    }

    apiRequest('/auth/me', { token })
      .then((result) => setUser(result.user))
      .catch(() => endSession())
      .finally(() => setCheckingSession(false));

    return () => window.removeEventListener('taskflow:unauthorized', handleUnauthorized);
  }, [endSession]);

  function handleAuthenticated(result) {
    saveToken(result.token);
    setUser(result.user);
  }

  if (checkingSession) {
    return <main className="session-loading"><span className="spinner" />Checking your workspace…</main>;
  }

  if (!user) return <AuthPage onAuthenticated={handleAuthenticated} />;

  return <TaskDashboard onLogout={endSession} user={user} />;
}

export default App;
