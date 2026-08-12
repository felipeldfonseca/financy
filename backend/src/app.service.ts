import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getHello() {
    return {
      message: 'Welcome to Financy API',
      version: '1.0.0',
      documentation: '/api/docs',
    };
  }

  /**
   * What an uptime monitor should watch. A process that answers while its
   * database is gone is not healthy — it just hasn't noticed yet — so the
   * check queries the database and fails loudly (503) when it cannot.
   */
  async getHealth() {
    const database = await this.checkDatabase();

    const body = {
      status: database ? 'ok' : 'degraded',
      database: database ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    if (!database) {
      throw new ServiceUnavailableException(body);
    }

    return body;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      // Bounded so a hung connection turns into "down" instead of a monitor
      // request that never returns.
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('database health check timed out')), 3000).unref?.(),
        ),
      ]);
      return true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return false;
    }
  }
}
