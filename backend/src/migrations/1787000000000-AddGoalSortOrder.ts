import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoalSortOrder1787000000000 implements MigrationInterface {
  name = 'AddGoalSortOrder1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded like every schema change here. Null means "never dragged":
    // existing goals keep their creation order until someone reorders.
    if (!(await queryRunner.hasColumn('goals', 'sortOrder'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'sortOrder',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN IF EXISTS "sortOrder"`);
  }
}
