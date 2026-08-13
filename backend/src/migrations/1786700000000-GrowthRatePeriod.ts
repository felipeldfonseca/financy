import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class GrowthRatePeriod1786700000000 implements MigrationInterface {
  name = 'GrowthRatePeriod1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The rate is now stored exactly as quoted, with a period column saying
    // whether that was % a.m. or % a.a. — yearly being the default people
    // actually think in. Guarded, as every schema change here.
    if (!(await queryRunner.hasColumn('goals', 'expectedGrowthRate'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'expectedGrowthRate',
          type: 'numeric',
          precision: 7,
          scale: 3,
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('goals', 'growthRatePeriod'))) {
      await queryRunner.addColumn(
        'goals',
        new TableColumn({
          name: 'growthRatePeriod',
          type: 'enum',
          enum: ['monthly', 'yearly'],
          enumName: 'goals_growthrateperiod_enum',
          default: "'yearly'",
        }),
      );
    }

    // Rates recorded before this change were quoted per month — carry them
    // over with the period that keeps their meaning, then retire the column.
    if (await queryRunner.hasColumn('goals', 'expectedMonthlyGrowthRate')) {
      await queryRunner.query(
        `UPDATE "goals"
            SET "expectedGrowthRate" = "expectedMonthlyGrowthRate",
                "growthRatePeriod" = 'monthly'
          WHERE "expectedMonthlyGrowthRate" IS NOT NULL`,
      );
      await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "expectedMonthlyGrowthRate"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    // Back to a monthly-only column: monthly rates copy over, yearly ones
    // are converted to their monthly equivalent.
    await queryRunner.query(
      `UPDATE "goals"
          SET "expectedMonthlyGrowthRate" = CASE
                WHEN "growthRatePeriod" = 'monthly' THEN "expectedGrowthRate"
                ELSE (power(1 + "expectedGrowthRate" / 100, 1.0 / 12) - 1) * 100
              END
        WHERE "expectedGrowthRate" IS NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN IF EXISTS "growthRatePeriod"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."goals_growthrateperiod_enum"`);
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN IF EXISTS "expectedGrowthRate"`);
  }
}
