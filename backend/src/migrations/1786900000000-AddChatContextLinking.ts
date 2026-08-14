import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddChatContextLinking1786900000000 implements MigrationInterface {
  name = 'AddChatContextLinking1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded like every schema change here. Existing mappings keep today's
    // behavior (auto-enroll on message); only chats linked to a pre-existing
    // context are created with it off.
    if (!(await queryRunner.hasColumn('chat_contexts', 'auto_enroll'))) {
      await queryRunner.addColumn(
        'chat_contexts',
        new TableColumn({
          name: 'auto_enroll',
          type: 'boolean',
          isNullable: false,
          default: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_contexts" DROP COLUMN IF EXISTS "auto_enroll"`);
  }
}
