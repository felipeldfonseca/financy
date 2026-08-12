import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBills1786200000000 implements MigrationInterface {
  name = 'CreateBills1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'bills',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'amount',
            type: 'numeric',
            precision: 12,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'dueDate',
            type: 'date',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'dashboardCategory',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'merchantName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['open', 'paid', 'canceled'],
            enumName: 'bills_status_enum',
            default: "'open'",
          },
          {
            name: 'installmentNumber',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'installmentTotal',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'recurrenceRule',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'paidTransactionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'contextId',
            type: 'uuid',
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
          },
          {
            // A context takes its bills with it, exactly as it does members.
            columnNames: ['contextId'],
            referencedTableName: 'contexts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            // Deleting the settlement expense only unlinks it from the bill.
            columnNames: ['paidTransactionId'],
            referencedTableName: 'transactions',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true, // ifNotExist: never crash the boot migration run on an existing table
    );

    const table = await queryRunner.getTable('bills');
    const hasIndex = table?.indices.some(
      (index) => index.columnNames.includes('contextId') && index.columnNames.includes('dueDate'),
    );
    if (!hasIndex) {
      await queryRunner.createIndex(
        'bills',
        new TableIndex({
          name: 'IDX_bills_context_due_date',
          columnNames: ['contextId', 'dueDate'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bills', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bills_status_enum"`);
  }
}
