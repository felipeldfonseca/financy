import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGoals1786400000000 implements MigrationInterface {
  name = 'CreateGoals1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'goals',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'targetAmount', type: 'numeric', precision: 12, scale: 2 },
          { name: 'currentAmount', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'currency', type: 'varchar', length: '3', default: "'USD'" },
          { name: 'targetDate', type: 'date', isNullable: true },
          { name: 'color', type: 'varchar', length: '7', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'archived'],
            enumName: 'goals_status_enum',
            default: "'active'",
          },
          { name: 'userId', type: 'uuid' },
          { name: 'contextId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
          },
          {
            // A context takes its goals with it, exactly as it does bills.
            columnNames: ['contextId'],
            referencedTableName: 'contexts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true, // ifNotExist: never crash the boot migration run on an existing table
    );

    await queryRunner.createTable(
      new Table({
        name: 'goal_contributions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'amount', type: 'numeric', precision: 12, scale: 2 },
          { name: 'date', type: 'date' },
          { name: 'goalId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            // The trail belongs to the goal; deleting one deletes the other.
            columnNames: ['goalId'],
            referencedTableName: 'goals',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
          },
        ],
      }),
      true,
    );

    const goals = await queryRunner.getTable('goals');
    if (!goals?.indices.some((index) => index.columnNames.includes('contextId'))) {
      await queryRunner.createIndex(
        'goals',
        new TableIndex({ name: 'IDX_goals_context', columnNames: ['contextId'] }),
      );
    }

    const contributions = await queryRunner.getTable('goal_contributions');
    if (!contributions?.indices.some((index) => index.columnNames.includes('goalId'))) {
      await queryRunner.createIndex(
        'goal_contributions',
        new TableIndex({ name: 'IDX_goal_contributions_goal', columnNames: ['goalId'] }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('goal_contributions', true);
    await queryRunner.dropTable('goals', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."goals_status_enum"`);
  }
}
