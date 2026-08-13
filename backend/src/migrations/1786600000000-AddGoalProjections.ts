import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoalProjections1786600000000 implements MigrationInterface {
  name = 'AddGoalProjections1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded like every schema change here: a database that already has any
    // of these pieces is stepped around, never crashed into on boot.
    if (!(await queryRunner.hasColumn('goals', 'expectedMonthlyGrowthRate'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'expectedMonthlyGrowthRate',
          type: 'numeric',
          precision: 6,
          scale: 3,
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('goal_contributions', 'kind'))) {
      await queryRunner.addColumn(
        'goal_contributions',
        new TableColumn({
          name: 'kind',
          type: 'enum',
          enum: ['deposit', 'adjustment'],
          enumName: 'goal_contributions_kind_enum',
          default: "'deposit'", // every existing entry was a real deposit
        }),
      );
    }

    if (!(await queryRunner.hasColumn('goal_contributions', 'note'))) {
      await queryRunner.addColumn(
        'goal_contributions',
        new TableColumn({
          name: 'note',
          type: 'varchar',
          length: '300',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goal_contributions" DROP COLUMN IF EXISTS "note"`);
    await queryRunner.query(`ALTER TABLE "goal_contributions" DROP COLUMN IF EXISTS "kind"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."goal_contributions_kind_enum"`);
    await queryRunner.query(
      `ALTER TABLE "goals" DROP COLUMN IF EXISTS "expectedMonthlyGrowthRate"`,
    );
  }
}
