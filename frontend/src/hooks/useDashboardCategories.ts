import { useTranslation } from 'react-i18next';
import { 
  getDashboardCategory, 
  getDetailedCategoriesForDashboard,
  groupTransactionsByDashboardCategory,
  calculateDashboardCategoryTotals,
  getDashboardCategoriesForType
} from '../utils/categoryMapping';

/**
 * Hook for working with dashboard categories
 * Provides translated dashboard category names and utility functions
 */
export const useDashboardCategories = () => {
  const { t } = useTranslation('transactions');

  /**
   * Gets translated dashboard category name
   * @param type Transaction type (expense, income, transfer)
   * @param dashboardCategory Dashboard category key
   * @returns Translated category name
   */
  const getDashboardCategoryName = (type: string, dashboardCategory: string): string => {
    return t(`dashboardCategories.${type}.${dashboardCategory}`);
  };

  /**
   * Gets all dashboard categories for a type with their translated names
   * @param type Transaction type (expense, income, transfer)
   * @returns Array of objects with key and translated name
   */
  const getDashboardCategoriesWithNames = (type: string) => {
    const categoryKeys = getDashboardCategoriesForType(type);
    return categoryKeys.map(key => ({
      key,
      name: getDashboardCategoryName(type, key)
    }));
  };

  /**
   * Maps a detailed category to dashboard category with translated name
   * @param type Transaction type
   * @param detailedCategory Detailed category key
   * @returns Object with dashboard category key and translated name
   */
  const mapToDisplayCategory = (type: string, detailedCategory: string) => {
    const dashboardKey = getDashboardCategory(type, detailedCategory);
    return {
      key: dashboardKey,
      name: getDashboardCategoryName(type, dashboardKey)
    };
  };

  /**
   * Calculates dashboard category totals with translated names
   * @param transactions Array of transactions
   * @param type Transaction type to filter by
   * @returns Array of objects with translated name, key, and total amount
   */
  const getDashboardCategoryTotalsWithNames = (transactions: any[], type?: string) => {
    const totals = calculateDashboardCategoryTotals(transactions, type);
    
    return Object.entries(totals).map(([key, total]) => ({
      key,
      name: getDashboardCategoryName(type || 'expense', key),
      total,
      amount: total // Alias for backwards compatibility
    }));
  };

  /**
   * Groups transactions by dashboard category with translated names
   * @param transactions Array of transactions
   * @param type Transaction type to filter by
   * @returns Object with translated names as keys
   */
  const getTransactionsGroupedByDashboardCategory = (transactions: any[], type?: string) => {
    const grouped = groupTransactionsByDashboardCategory(transactions, type);
    const groupedWithNames: { [translatedName: string]: any[] } = {};
    
    Object.entries(grouped).forEach(([key, transactionList]) => {
      const translatedName = getDashboardCategoryName(type || 'expense', key);
      groupedWithNames[translatedName] = transactionList;
    });
    
    return groupedWithNames;
  };

  /**
   * Prepares data for pie chart visualization
   * @param transactions Array of transactions
   * @param type Transaction type to filter by
   * @returns Array of objects formatted for chart libraries
   */
  const getPieChartData = (transactions: any[], type: string = 'expense') => {
    const totals = getDashboardCategoryTotalsWithNames(transactions, type);
    
    return totals
      .filter(item => item.total > 0) // Only include categories with actual spending
      .sort((a, b) => b.total - a.total) // Sort by amount descending
      .map((item, index) => ({
        id: item.key,
        label: item.name,
        value: item.total,
        color: getChartColor(index, type) // You can implement color logic
      }));
  };

  /**
   * Gets a color for chart visualization based on index and type
   * @param index Index of the category
   * @param type Transaction type
   * @returns Color string
   */
  const getChartColor = (index: number, type: string): string => {
    const expenseColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    const incomeColors = [
      '#4BC0C0', '#36A2EB', '#FFCE56', '#9966FF'
    ];
    const transferColors = [
      '#36A2EB', '#FF9F40', '#C9CBCF'
    ];

    let colors = expenseColors;
    if (type === 'income') colors = incomeColors;
    if (type === 'transfer') colors = transferColors;

    return colors[index % colors.length];
  };

  return {
    getDashboardCategory,
    getDashboardCategoryName,
    getDashboardCategoriesWithNames,
    mapToDisplayCategory,
    getDashboardCategoryTotalsWithNames,
    getTransactionsGroupedByDashboardCategory,
    getPieChartData,
    getDetailedCategoriesForDashboard,
    groupTransactionsByDashboardCategory,
    calculateDashboardCategoryTotals
  };
};