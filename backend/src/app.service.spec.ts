import { ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * The health check's contract with the uptime monitor: 200 only while the
 * database answers, 503 the moment it does not — an app that responds while
 * its data is unreachable must not look healthy.
 */
describe('AppService health', () => {
  it('reports ok with the database up', async () => {
    const service = new AppService({ query: async () => [{ '?column?': 1 }] } as any);

    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.database).toBe('up');
    expect(health.uptime).toEqual(expect.any(Number));
  });

  it('turns a database failure into a 503, not a green light', async () => {
    const service = new AppService({
      query: async () => {
        throw new Error('connection refused');
      },
    } as any);

    await expect(service.getHealth()).rejects.toThrow(ServiceUnavailableException);

    try {
      await service.getHealth();
    } catch (error) {
      expect(error.getResponse()).toMatchObject({ status: 'degraded', database: 'down' });
    }
  });

  it('treats a hung connection as down instead of hanging the monitor', async () => {
    jest.useFakeTimers();
    try {
      const service = new AppService({
        query: () => new Promise(() => undefined), // never settles
      } as any);

      const pending = expect(service.getHealth()).rejects.toThrow(ServiceUnavailableException);
      await jest.advanceTimersByTimeAsync(3100);
      await pending;
    } finally {
      jest.useRealTimers();
    }
  });
});
