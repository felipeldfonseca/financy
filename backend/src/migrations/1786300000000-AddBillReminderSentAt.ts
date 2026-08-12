import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBillReminderSentAt1786300000000 implements MigrationInterface {
  name = 'AddBillReminderSentAt1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard against databases where the column already exists (e.g. created
    // by TypeORM synchronize in development) so a fresh migration run on an
    // existing database cannot crash the boot sequence.
    if (await queryRunner.hasColumn('bills', 'reminderSentAt')) {
      return;
    }

    await queryRunner.addColumn(
      'bills',
      new TableColumn({
        name: 'reminderSentAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bills', 'reminderSentAt');
  }
}
