import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter, shouldReport } from './sentry-exception.filter';

describe('shouldReport', () => {
  it('stays quiet for the API refusing things as designed', () => {
    expect(shouldReport(new UnauthorizedException())).toBe(false);
    expect(shouldReport(new ForbiddenException())).toBe(false);
    expect(shouldReport(new NotFoundException())).toBe(false);
    expect(shouldReport(new ConflictException())).toBe(false);
    expect(shouldReport(new BadRequestException())).toBe(false);
  });

  it('pages for unexpected errors and 5xx', () => {
    expect(shouldReport(new Error('boom'))).toBe(true);
    expect(shouldReport(new InternalServerErrorException())).toBe(true);
    expect(shouldReport(new TypeError('undefined is not a function'))).toBe(true);
  });
});

describe('SentryExceptionFilter', () => {
  const host = {} as any;
  let capture: jest.SpyInstance;
  let delegate: jest.SpyInstance;

  beforeEach(() => {
    capture = jest.spyOn(Sentry, 'captureException').mockImplementation(() => 'id');
    delegate = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
  });

  afterEach(() => {
    capture.mockRestore();
    delegate.mockRestore();
  });

  it('captures an unexpected error and still delegates the response', () => {
    const error = new Error('database exploded');

    new SentryExceptionFilter().catch(error, host);

    expect(capture).toHaveBeenCalledWith(error);
    expect(delegate).toHaveBeenCalledWith(error, host);
  });

  it('delegates a 404 without reporting it', () => {
    const notFound = new NotFoundException('Bill not found');

    new SentryExceptionFilter().catch(notFound, host);

    expect(capture).not.toHaveBeenCalled();
    // The response path is untouched either way — the default filter always
    // gets to produce the reply.
    expect(delegate).toHaveBeenCalledWith(notFound, host);
  });
});
