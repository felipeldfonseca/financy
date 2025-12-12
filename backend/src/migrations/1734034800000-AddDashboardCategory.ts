import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDashboardCategory1734034800000 implements MigrationInterface {
  name = 'AddDashboardCategory1734034800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add dashboardCategory column to transactions table
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'dashboardCategory',
        type: 'varchar',
        isNullable: true,
      })
    );

    // Map existing categories to dashboard categories for data consistency
    // This ensures existing data works with the new two-tier system
    
    // EXPENSE category mappings
    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'housing' 
      WHERE type = 'expense' AND (
        category = 'Housing' OR 
        category ILIKE '%housing%' OR
        category ILIKE '%rent%' OR
        category ILIKE '%utilities%' OR
        category ILIKE '%home%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'transportation' 
      WHERE type = 'expense' AND (
        category = 'Transportation' OR
        category ILIKE '%transport%' OR
        category ILIKE '%fuel%' OR
        category ILIKE '%gas%' OR
        category ILIKE '%car%' OR
        category ILIKE '%parking%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'fooddining' 
      WHERE type = 'expense' AND (
        category = 'Food & Dining' OR
        category = 'Food' OR
        category ILIKE '%food%' OR
        category ILIKE '%dining%' OR
        category ILIKE '%restaurant%' OR
        category ILIKE '%grocery%' OR
        category ILIKE '%groceries%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'healthfitness' 
      WHERE type = 'expense' AND (
        category = 'Health & Fitness' OR
        category = 'Healthcare' OR
        category ILIKE '%health%' OR
        category ILIKE '%fitness%' OR
        category ILIKE '%medical%' OR
        category ILIKE '%doctor%' OR
        category ILIKE '%gym%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'entertainmentshopping' 
      WHERE type = 'expense' AND (
        category = 'Entertainment' OR
        category = 'Shopping' OR
        category = 'Personal Care' OR
        category ILIKE '%entertainment%' OR
        category ILIKE '%shopping%' OR
        category ILIKE '%personal%' OR
        category ILIKE '%clothing%' OR
        category ILIKE '%movie%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'billsfinancial' 
      WHERE type = 'expense' AND (
        category = 'Bills & Utilities' OR
        category = 'Financial' OR
        category = 'Insurance' OR
        category ILIKE '%bill%' OR
        category ILIKE '%financial%' OR
        category ILIKE '%insurance%' OR
        category ILIKE '%bank%' OR
        category ILIKE '%tax%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'travellifestyle' 
      WHERE type = 'expense' AND (
        category = 'Travel & Vacation' OR
        category = 'Pets' OR
        category = 'Kids & Family' OR
        category ILIKE '%travel%' OR
        category ILIKE '%vacation%' OR
        category ILIKE '%pet%' OR
        category ILIKE '%kids%' OR
        category ILIKE '%family%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'other' 
      WHERE type = 'expense' AND dashboardCategory IS NULL
    `);

    // INCOME category mappings
    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'employment' 
      WHERE type = 'income' AND (
        category = 'Employment Income' OR
        category = 'Employment' OR
        category = 'Self-Employment' OR
        category ILIKE '%employment%' OR
        category ILIKE '%salary%' OR
        category ILIKE '%freelance%' OR
        category ILIKE '%consulting%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'investment' 
      WHERE type = 'income' AND (
        category = 'Investment Income' OR
        category = 'Investment' OR
        category = 'Business Income' OR
        category ILIKE '%investment%' OR
        category ILIKE '%business%' OR
        category ILIKE '%dividend%' OR
        category ILIKE '%interest%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'governmentbenefits' 
      WHERE type = 'income' AND (
        category = 'Government & Benefits' OR
        category = 'Refunds & Returns' OR
        category ILIKE '%government%' OR
        category ILIKE '%benefit%' OR
        category ILIKE '%refund%' OR
        category ILIKE '%return%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'other' 
      WHERE type = 'income' AND dashboardCategory IS NULL
    `);

    // TRANSFER category mappings
    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'accounts' 
      WHERE type = 'transfer' AND (
        category = 'Account Transfers' OR
        category = 'Savings & Investments' OR
        category ILIKE '%account%' OR
        category ILIKE '%saving%' OR
        category ILIKE '%investment%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'debt' 
      WHERE type = 'transfer' AND (
        category = 'Debt Payments' OR
        category ILIKE '%debt%' OR
        category ILIKE '%payment%' OR
        category ILIKE '%loan%' OR
        category ILIKE '%mortgage%'
      )
    `);

    await queryRunner.query(`
      UPDATE transactions SET dashboardCategory = 'other' 
      WHERE type = 'transfer' AND dashboardCategory IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the dashboardCategory column
    await queryRunner.dropColumn('transactions', 'dashboardCategory');
  }
}