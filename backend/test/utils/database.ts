import { DataSource, DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../../src/config/typeorm.config';

/**
 * The e2e suite drops every table before it runs. Pointing it at a database
 * that is not obviously a test database would destroy real data, so require
 * the name to say so out loud.
 */
export function requireTestDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is required to run the e2e suite (e.g. postgres://postgres@localhost:5432/financy_test).',
    );
  }

  const databaseName = url.split('/').pop()?.split('?')[0] ?? '';

  if (!/test/i.test(databaseName)) {
    throw new Error(
      `Refusing to run the e2e suite against database "${databaseName}": the suite drops all tables, ` +
        'so its name must contain "test".',
    );
  }

  return url;
}

/**
 * Reuses the application's own entity and migration lists so the suite always
 * covers what the app actually loads.
 */
export function testDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: requireTestDatabaseUrl(),
    entities: dataSourceOptions.entities,
    migrations: dataSourceOptions.migrations,
    synchronize: false,
  };
}

/**
 * Rebuilds the test schema the way production gets built: from an empty
 * database, by running migrations. Anything the migrations forget to create is
 * therefore missing in the tests too.
 */
export async function resetDatabase(): Promise<void> {
  const dataSource = new DataSource(testDataSourceOptions());
  await dataSource.initialize();

  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
