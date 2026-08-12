import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * Error monitoring is opt-in: without REACT_APP_SENTRY_DSN nothing
 * initializes and the boundary below is just a plain error boundary.
 */
export function initSentry(): boolean {
  const dsn = process.env.REACT_APP_SENTRY_DSN;

  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });

  return true;
}

/**
 * The last line between a render crash and a blank white page: the crash is
 * reported (when Sentry is on) and the user gets a way back instead of a
 * dead screen. Deliberately theme- and i18n-free — those providers may be
 * exactly what crashed.
 */
export const MonitoredErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary
    fallback={
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontFamily: 'sans-serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 18, margin: 0 }}>Algo deu errado. / Something went wrong.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer' }}
        >
          Recarregar / Reload
        </button>
      </div>
    }
  >
    {children}
  </Sentry.ErrorBoundary>
);
