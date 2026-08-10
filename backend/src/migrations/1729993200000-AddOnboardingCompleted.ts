import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOnboardingCompleted1729993200000 implements MigrationInterface {
  name = 'AddOnboardingCompleted1729993200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard against databases where the column already exists (e.g. created
    // by TypeORM synchronize in development) so a fresh migration run on an
    // existing database cannot crash the boot sequence.
    if (await queryRunner.hasColumn('users', 'onboardingCompleted')) {
      return;
    }

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'onboardingCompleted',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'onboardingCompleted');
  }
}
