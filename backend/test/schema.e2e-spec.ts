import { DataSource } from 'typeorm';
import { testDataSourceOptions } from './utils/database';

/**
 * Production runs migrations and nothing else — no synchronize. An entity
 * change that no migration creates therefore reaches production as a column
 * the database does not have, which is exactly how registration stayed broken
 * for months. This suite fails the build in that situation.
 */
describe('Database schema (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // global-setup has dropped the schema and re-run every migration.
    dataSource = new DataSource(testDataSourceOptions());
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it('creates a schema that fully satisfies the entity model', async () => {
    const pendingChanges = await dataSource.driver.createSchemaBuilder().log();

    // Any query here is a change the entities need but no migration makes.
    expect(pendingChanges.upQueries.map((query) => query.query)).toEqual([]);
  });

  it.each(['users', 'transactions', 'contexts', 'context_members', 'chat_contexts', 'bills', 'goals', 'goal_contributions'])(
    'creates the %s table',
    async (table) => {
      expect(await dataSource.query('SELECT to_regclass($1) AS table', [table])).toEqual([
        { table },
      ]);
    },
  );

  it('records every migration as applied', async () => {
    const applied = await dataSource.query('SELECT name FROM migrations');
    const available = dataSource.migrations.map((migration) => migration.name);

    expect(applied.map((row: { name: string }) => row.name).sort()).toEqual(available.sort());
  });
});
