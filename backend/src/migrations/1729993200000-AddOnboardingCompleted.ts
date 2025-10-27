import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOnboardingCompleted1729993200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
