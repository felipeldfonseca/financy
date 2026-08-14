import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoalMonthReminder1786800000000 implements MigrationInterface {
  name = 'AddGoalMonthReminder1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded like every schema change here.
    if (!(await queryRunner.hasColumn('goals', 'monthReminderSentAt'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'monthReminderSentAt',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN IF EXISTS "monthReminderSentAt"`);
  }
}
