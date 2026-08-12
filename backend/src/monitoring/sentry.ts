import * as Sentry from '@sentry/node';

/**
 * Error monitoring is opt-in: without SENTRY_DSN nothing initializes and every
 * capture call is a no-op, so local development and tests never talk to the
 * outside world. With it, unhandled errors reach the dashboard with the
 * environment and (when Railway provides it) the exact commit.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    // Error monitoring only — performance tracing costs quota and answers a
    // question nobody is asking yet.
    tracesSampleRate: 0,
  });

  return true;
}
