import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/**
 * Reports what deserves a page — unexpected errors and 5xx — and stays
 * invisible for everything else. Expected refusals (401, 403, 404, 409,
 * validation 400s) are the API working as designed, not incidents.
 *
 * Responses are untouched: after deciding whether to report, the default
 * Nest filter produces exactly the reply it always did. The whole e2e suite
 * runs behind this filter, which is the proof.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (shouldReport(exception)) {
      // A no-op unless SENTRY_DSN initialized the SDK at boot.
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}

export function shouldReport(exception: unknown): boolean {
  if (exception instanceof HttpException) {
    return exception.getStatus() >= 500;
  }

  return true;
}
