import { useState } from 'react';
import { apiRequest } from '../api.js';

function validateForm(mode, email, password) {
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  if (mode === 'register' && password.length < 8) {
    return 'Use at least 8 characters for your password.';
  }
  if (!password || password.length > 128) {
    return 'Enter a password with no more than 128 characters.';
  }
  return '';
}

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const validationError = validateForm(mode, email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest(`/auth/${mode}`, {
        method: 'POST',
        token: null,
        body: { email: email.trim(), password },
      });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="About TaskFlow">
        <a className="brand brand-light" href="#top" aria-label="TaskFlow home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>taskflow</span>
        </a>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">A clearer way to work</span>
          <h1>Make room for your best work.</h1>
          <p>Keep every next step in sight, and move your day forward with confidence.</p>
          <div className="story-preview" aria-hidden="true">
            <div className="preview-top"><span /><span /><span /><i>Today at a glance</i></div>
            <div className="preview-stat-row"><b>12</b><b>04</b><b>08</b></div>
            <div className="preview-lines"><span /><span /><span /></div>
          </div>
        </div>
        <p className="story-footnote">A little more focus. A lot more flow.</p>
      </section>

      <section className="auth-panel" id="top">
        <div className="auth-mobile-brand">
          <span className="brand-mark" aria-hidden="true">T</span> taskflow
        </div>
        <div className="auth-card">
          <span className="eyebrow">{isRegister ? 'GET STARTED' : 'WELCOME BACK'}</span>
          <h2>{isRegister ? 'Create your account' : 'Sign in to TaskFlow'}</h2>
          <p className="auth-description">
            {isRegister ? 'Start organizing your work in one calm place.' : 'Pick up right where you left off.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="auth-email">Email address</label>
            <input
              autoComplete="email"
              autoFocus
              id="auth-email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            <div className="label-row">
              <label htmlFor="auth-password">Password</label>
              {!isRegister && <span className="label-hint">Your account password</span>}
            </div>
            <input
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              id="auth-password"
              maxLength={128}
              minLength={isRegister ? 8 : 1}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
              required
              type="password"
              value={password}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary auth-submit" disabled={submitting} type="submit">
              {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to TaskFlow?'}{' '}
            <button className="text-button" onClick={() => changeMode(isRegister ? 'login' : 'register')} type="button">
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className="auth-privacy">Your workspace is private to your account.</p>
        </div>
      </section>
    </main>
  );
}
