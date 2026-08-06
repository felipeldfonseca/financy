import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateChatContexts1786000000000 implements MigrationInterface {
  name = 'CreateChatContexts1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The ChatContext entity was registered in the Telegram module but never
    // added to the connection entity list, so neither synchronize nor any
    // migration ever created its table. Create it to match the entity.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'chat_contexts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'chat_id',
            type: 'bigint',
          },
          {
            name: 'chat_type',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'chat_title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'context_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['context_id'],
            referencedTableName: 'contexts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true, // ifNotExist: never crash the boot migration run on an existing table
    );

    const table = await queryRunner.getTable('chat_contexts');
    const hasIndex = table?.indices.some(
      (index) => index.columnNames.includes('chat_id') && index.columnNames.includes('chat_type'),
    );
    if (!hasIndex) {
      await queryRunner.createIndex(
        'chat_contexts',
        new TableIndex({
          name: 'IDX_chat_contexts_chat_id_chat_type',
          columnNames: ['chat_id', 'chat_type'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('chat_contexts', true);
  }
}
