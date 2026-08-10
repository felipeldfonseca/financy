import { resetDatabase } from './utils/database';

/**
 * Builds the test schema once, from empty, using migrations only — the same
 * path a production deploy takes.
 */
module.exports = async (): Promise<void> => {
  await resetDatabase();
};
