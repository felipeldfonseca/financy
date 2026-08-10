import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

/**
 * Boots the real application module with the same middleware, validation and
 * routing production uses, so a request in a test travels the same path a
 * request from the browser does.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  return app;
}

/** A password that satisfies the registration policy. */
export const VALID_PASSWORD = 'Senha@123';

let uniqueCounter = 0;

/**
 * Unique email per call, so specs never collide on the unique constraint.
 * The counter alone is not enough: each spec file gets a fresh module
 * registry, so two files would restart at 1 and pick the same address.
 */
export function uniqueEmail(prefix = 'user'): string {
  uniqueCounter += 1;
  const stamp = process.hrtime.bigint().toString(36);
  return `${prefix}.${stamp}.${uniqueCounter}@example.test`;
}
