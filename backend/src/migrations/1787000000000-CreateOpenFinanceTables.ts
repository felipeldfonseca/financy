import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

/**
 * Open Finance spike (Phase 0): bank_connections + bank_accounts tables and
 * the transaction columns that make bank sync idempotent.
 *
 * Everything is guarded (ifNotExist / IF NOT EXISTS / column checks) because
 * production runs migrations on boot and development uses synchronize, which
 * may have already created parts of this schema from the entities.
 */
export class CreateOpenFinanceTables1787000000000 implements MigrationInterface {
  name = 'CreateOpenFinanceTables1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'bank_connections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['pluggy'],
            default: `'pluggy'`,
          },
          {
            name: 'providerItemId',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'institutionId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'institutionName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'institutionImageUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['connected', 'updating', 'login_error', 'consent_expired', 'error'],
            default: `'connected'`,
          },
          {
            name: 'consentExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastSyncedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastError',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'contextId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['contextId'],
            referencedTableName: 'contexts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'bank_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'connectionId',
            type: 'uuid',
          },
          {
            name: 'providerAccountId',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['checking', 'savings', 'credit_card', 'unknown'],
            default: `'unknown'`,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'maskedNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: `'BRL'`,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 14,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'balanceUpdatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['connectionId'],
            referencedTableName: 'bank_connections',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        uniques: [
          {
            name: 'UQ_bank_accounts_connection_provider_account',
            columnNames: ['connectionId', 'providerAccountId'],
          },
        ],
      }),
      true,
    );

    // transactions.accountId — nullable so manual/Telegram entries are untouched;
    // SET NULL keeps imported history when a bank is disconnected.
    const transactionsTable = await queryRunner.getTable('transactions');

    if (transactionsTable && !transactionsTable.findColumnByName('accountId')) {
      await queryRunner.addColumn(
        'transactions',
        new TableColumn({
          name: 'accountId',
          type: 'uuid',
          isNullable: true,
        }),
      );
      await queryRunner.createForeignKey(
        'transactions',
        new TableForeignKey({
          columnNames: ['accountId'],
          referencedTableName: 'bank_accounts',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    if (transactionsTable && !transactionsTable.findColumnByName('providerTransactionId')) {
      await queryRunner.addColumn(
        'transactions',
        new TableColumn({
          name: 'providerTransactionId',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    // The idempotency backbone: a provider transaction can only exist once per
    // bank account. Partial index so the millions of manual transactions with
    // NULL providerTransactionId stay out of it.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_transactions_account_provider_tx"
      ON "transactions" ("accountId", "providerTransactionId")
      WHERE "providerTransactionId" IS NOT NULL
    `);

    // Add 'open_finance' to the inputMethod enum. The type name is looked up
    // at runtime instead of hardcoded so this works regardless of how TypeORM
    // named it when the column was created.
    const enumTypeRows: Array<{ typname: string }> = await queryRunner.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'transactions'
        AND a.attname = 'inputMethod'
        AND t.typtype = 'e'
    `);
    if (enumTypeRows.length > 0) {
      await queryRunner.query(
        `ALTER TYPE "${enumTypeRows[0].typname}" ADD VALUE IF NOT EXISTS 'open_finance'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_transactions_account_provider_tx"`,
    );

    const transactionsTable = await queryRunner.getTable('transactions');
    if (transactionsTable) {
      const accountFk = transactionsTable.foreignKeys.find(fk =>
        fk.columnNames.includes('accountId'),
      );
      if (accountFk) {
        await queryRunner.dropForeignKey('transactions', accountFk);
      }
      if (transactionsTable.findColumnByName('accountId')) {
        await queryRunner.dropColumn('transactions', 'accountId');
      }
      if (transactionsTable.findColumnByName('providerTransactionId')) {
        await queryRunner.dropColumn('transactions', 'providerTransactionId');
      }
    }

    await queryRunner.dropTable('bank_accounts', true);
    await queryRunner.dropTable('bank_connections', true);
    // Note: PostgreSQL cannot remove a value from an enum type; the extra
    // 'open_finance' inputMethod value is left in place on revert.
  }
}
