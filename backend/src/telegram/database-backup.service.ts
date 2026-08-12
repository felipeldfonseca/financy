import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { spawn } from 'child_process';
import { gzipSync } from 'zlib';
import * as FormData from 'form-data';

/**
 * The cheapest real backup this deployment can have: a nightly pg_dump,
 * gzipped and delivered as a document to the owner's private Telegram chat.
 * No extra infrastructure, and the copy lives outside the hosting provider —
 * which is the property a backup exists to have.
 *
 * Opt-in twice over: it needs the bot token AND DATABASE_BACKUP_CHAT_ID.
 * Restore: gunzip -c financy-backup-*.sql.gz | psql "$DATABASE_URL"
 */
@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  // 04:00 UTC = 01:00 in Brasília: after the day's movement, before the
  // morning reminders.
  @Cron('0 4 * * *')
  async nightlyBackup(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      this.logger.error(`Database backup failed: ${error.message}`);
    }
  }

  /** Separated from the cron trigger so tests can run a cycle directly. */
  async run(): Promise<boolean> {
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get('DATABASE_BACKUP_CHAT_ID');
    const databaseUrl = this.configService.get('DATABASE_URL');

    if (!botToken || !chatId || !databaseUrl) {
      this.logger.debug(
        'Database backup skipped (needs TELEGRAM_BOT_TOKEN, DATABASE_BACKUP_CHAT_ID and DATABASE_URL)',
      );
      return false;
    }

    const dump = await this.dumpDatabase(databaseUrl);
    const compressed = gzipSync(dump);
    const stamp = new Date().toISOString().slice(0, 10);

    await this.sendDocument(botToken, chatId, compressed, `financy-backup-${stamp}.sql.gz`);

    this.logger.log(
      `Database backup delivered: ${(compressed.length / 1024).toFixed(1)} KiB compressed`,
    );
    return true;
  }

  private dumpDatabase(databaseUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // --no-owner/--no-privileges: restores must work on a fresh instance
      // whose roles differ from the one that wrote the dump.
      const child = spawn('pg_dump', ['--no-owner', '--no-privileges', databaseUrl]);

      const chunks: Buffer[] = [];
      const errors: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));

      child.on('error', (error) =>
        reject(new Error(`pg_dump could not start: ${error.message}`)),
      );
      child.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`pg_dump exited with ${code}: ${Buffer.concat(errors).toString()}`));
        }
      });
    });
  }

  private async sendDocument(
    botToken: string,
    chatId: string,
    content: Buffer,
    filename: string,
  ): Promise<void> {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('document', content, { filename, contentType: 'application/gzip' });

    const response = await lastValueFrom(
      this.httpService.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form, {
        headers: form.getHeaders(),
        maxBodyLength: 64 * 1024 * 1024,
      }),
    );

    if (!response.data?.ok) {
      throw new Error(`Telegram rejected the backup document: ${JSON.stringify(response.data)}`);
    }
  }
}
