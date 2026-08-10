import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The original schema was created by TypeORM's synchronize during the first
 * deployment and never captured as a migration, so the migration history could
 * only ever patch a database that already existed — a fresh one (a new
 * environment, a restore, or CI) could not be built at all.
 *
 * This migration is that missing starting point: the schema as it stood before
 * the incremental migrations that follow. Databases created by the original
 * synchronize already have these tables, so it detects them and steps aside.
 */
export class InitialSchema1729900000000 implements MigrationInterface {
  name = 'InitialSchema1729900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('users')) {
      // Database predates the migration history; the migrations that follow
      // bring it up to date from here.
      return;
    }

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "password" character varying NOT NULL,
        "telegramUserId" character varying,
        "telegramUsername" character varying,
        "language" character varying NOT NULL DEFAULT 'en',
        "timezone" character varying NOT NULL DEFAULT 'UTC',
        "defaultCurrency" character varying NOT NULL DEFAULT 'USD',
        "isActive" boolean NOT NULL DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "emailVerifiedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."contexts_type_enum" AS ENUM('personal', 'family', 'business', 'shared_living', 'trip', 'project', 'friends', 'shared')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contexts_visibility_enum" AS ENUM('private', 'invite_only', 'public')`,
    );

    await queryRunner.query(`
      CREATE TABLE "contexts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" character varying(500),
        "type" "public"."contexts_type_enum" NOT NULL DEFAULT 'personal',
        "visibility" "public"."contexts_visibility_enum" NOT NULL DEFAULT 'invite_only',
        "defaultCurrency" character varying(3) NOT NULL DEFAULT 'USD',
        "timezone" character varying(50),
        "settings" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "color" character varying(7),
        "icon" character varying(50),
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c97319410dbb694c31c8feef53a" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."context_members_role_enum" AS ENUM('owner', 'admin', 'member', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."context_members_status_enum" AS ENUM('active', 'invited', 'suspended', 'left')`,
    );

    await queryRunner.query(`
      CREATE TABLE "context_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role" "public"."context_members_role_enum" NOT NULL DEFAULT 'member',
        "status" "public"."context_members_status_enum" NOT NULL DEFAULT 'invited',
        "joinedAt" TIMESTAMP,
        "leftAt" TIMESTAMP,
        "invitedAt" TIMESTAMP,
        "invitedById" uuid,
        "inviteMessage" character varying(500),
        "inviteToken" character varying(100),
        "inviteExpiresAt" TIMESTAMP,
        "permissions" jsonb,
        "settings" jsonb,
        "contextId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_647e918b542ff90ba1855bc6e69" UNIQUE ("contextId", "userId"),
        CONSTRAINT "PK_cea5df91d26f487ca0c6347c149" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('expense', 'income', 'transfer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'confirmed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_inputmethod_enum" AS ENUM('manual', 'telegram', 'voice', 'ocr', 'api')`,
    );

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "amount" numeric(12,2) NOT NULL,
        "description" character varying NOT NULL,
        "type" "public"."transactions_type_enum" NOT NULL DEFAULT 'expense',
        "category" character varying,
        "subcategory" character varying,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "date" date NOT NULL,
        "time" TIME,
        "merchantName" character varying,
        "location" character varying,
        "notes" character varying,
        "receiptUrl" character varying,
        "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending',
        "inputMethod" "public"."transactions_inputmethod_enum" NOT NULL DEFAULT 'manual',
        "metadata" json,
        "originalText" character varying,
        "isRecurring" boolean NOT NULL DEFAULT false,
        "recurringPattern" character varying,
        "exchangeRate" numeric(12,2),
        "originalAmount" numeric(12,2),
        "originalCurrency" character varying,
        "userId" uuid NOT NULL,
        "contextId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "contexts" ADD CONSTRAINT "FK_1d482457d92eb7f056a2f5d1a93" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "context_members" ADD CONSTRAINT "FK_b29a7fd168849780015fcd002b2" FOREIGN KEY ("contextId") REFERENCES "contexts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "context_members" ADD CONSTRAINT "FK_2c75855d3d8a3623519e439e7fc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "context_members" ADD CONSTRAINT "FK_b6ab1d38693d45d3e997d18a3ab" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_3be29613d8768e395c147671290" FOREIGN KEY ("contextId") REFERENCES "contexts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "context_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contexts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transactions_inputmethod_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transactions_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."context_members_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."context_members_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contexts_visibility_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contexts_type_enum"`);
  }
}
