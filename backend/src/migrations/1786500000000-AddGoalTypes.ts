import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoalTypes1786500000000 implements MigrationInterface {
  name = 'AddGoalTypes1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded like every schema change here: a database that already has any
    // of these pieces is stepped around, never crashed into on boot.
    if (!(await queryRunner.hasColumn('goals', 'goalType'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'goalType',
          type: 'enum',
          enum: ['target', 'recurring'],
          enumName: 'goals_goaltype_enum',
          default: "'target'", // every existing goal is an event goal
        }),
      );
    }

    if (!(await queryRunner.hasColumn('goals', 'monthlyTarget'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'monthlyTarget',
          type: 'numeric',
          precision: 12,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    // A monthly habit may have no finish line at all.
    const table = await queryRunner.getTable('goals');
    const targetAmount = table?.findColumnByName('targetAmount');
    if (targetAmount && !targetAmount.isNullable) {
      await queryRunner.query(`ALTER TABLE "goals" ALTER COLUMN "targetAmount" DROP NOT NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN IF EXISTS "monthlyTarget"`);
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN IF EXISTS "goalType"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."goals_goaltype_enum"`);
    await queryRunner.query(`ALTER TABLE "goals" ALTER COLUMN "targetAmount" SET NOT NULL`);
  }
}
