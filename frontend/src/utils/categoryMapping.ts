// Dashboard category mapping for charts and analytics
// Maps detailed categories to simplified dashboard categories

export interface DashboardCategoryMapping {
  [transactionType: string]: {
    [detailedCategory: string]: string;
  };
}

export const dashboardCategoryMapping: DashboardCategoryMapping = {
  expense: {
    // Housing
    'housing': 'housing',
    
    // Transportation
    'transportation': 'transportation',
    
    // Food & Dining
    'food': 'fooddining',
    
    // Health & Fitness
    'healthfitness': 'healthfitness',
    
    // Entertainment & Shopping
    'entertainment': 'entertainmentshopping',
    'shopping': 'entertainmentshopping',
    'personalcare': 'entertainmentshopping',
    
    // Bills & Financial
    'bills': 'billsfinancial',
    'financial': 'billsfinancial',
    'insurance': 'billsfinancial',
    
    // Travel & Lifestyle
    'travelvacation': 'travellifestyle',
    'pets': 'travellifestyle',
    'kidsfamily': 'travellifestyle',
    
    // Other
    'education': 'other',
    'giftdonations': 'other',
    'businessexpenses': 'other',
    'otherexpenses': 'other'
  },
  
  income: {
    // Employment
    'employment': 'employment',
    'selfemployment': 'employment',
    
    // Investment
    'investment': 'investment',
    'business': 'investment',
    
    // Government & Benefits
    'governmentbenefits': 'governmentbenefits',
    'refundsreturns': 'governmentbenefits',
    
    // Other Income
    'otherincome': 'other'
  },
  
  transfer: {
    // Account Transfers
    'accounts': 'accounts',
    'savingsinvestments': 'accounts',
    
    // Debt Payments
    'debt': 'debt',
    
    // Other Transfers
    'personaltransfers': 'other',
    'othertransfers': 'other'
  }
};

/**
 * Maps a detailed category to its dashboard category
 * @param type Transaction type (expense, income, transfer)
 * @param detailedCategory The detailed category key
 * @returns Dashboard category key
 */
export const getDashboardCategory = (type: string, detailedCategory: string): string => {
  const mapping = dashboardCategoryMapping[type];
  if (!mapping || !mapping[detailedCategory]) {
    return 'other'; // Fallback to 'other' for unknown categories
  }
  return mapping[detailedCategory];
};

/**
 * Gets all detailed categories that map to a specific dashboard category
 * @param type Transaction type (expense, income, transfer)
 * @param dashboardCategory The dashboard category key
 * @returns Array of detailed category keys
 */
export const getDetailedCategoriesForDashboard = (
  type: string, 
  dashboardCategory: string
): string[] => {
  const mapping = dashboardCategoryMapping[type];
  if (!mapping) return [];
  
  return Object.keys(mapping).filter(key => mapping[key] === dashboardCategory);
};

/**
 * Groups transactions by dashboard category for analytics
 * @param transactions Array of transactions with category field
 * @param type Transaction type to filter by
 * @returns Object with dashboard categories as keys and transaction arrays as values
 */
export const groupTransactionsByDashboardCategory = (
  transactions: any[], 
  type?: string
) => {
  const grouped: { [dashboardCategory: string]: any[] } = {};
  
  transactions.forEach(transaction => {
    // Skip if type filter is specified and doesn't match
    if (type && transaction.type !== type) return;
    
    const dashboardCategory = getDashboardCategory(
      transaction.type, 
      transaction.category || 'other'
    );
    
    if (!grouped[dashboardCategory]) {
      grouped[dashboardCategory] = [];
    }
    grouped[dashboardCategory].push(transaction);
  });
  
  return grouped;
};

/**
 * Calculates total amounts by dashboard category
 * @param transactions Array of transactions
 * @param type Transaction type to filter by
 * @returns Object with dashboard categories as keys and total amounts as values
 */
export const calculateDashboardCategoryTotals = (
  transactions: any[], 
  type?: string
) => {
  const grouped = groupTransactionsByDashboardCategory(transactions, type);
  const totals: { [dashboardCategory: string]: number } = {};
  
  Object.keys(grouped).forEach(dashboardCategory => {
    totals[dashboardCategory] = grouped[dashboardCategory].reduce(
      (sum, transaction) => sum + Number(transaction.amount), 
      0
    );
  });
  
  return totals;
};

/**
 * Gets dashboard categories for a specific transaction type
 * @param type Transaction type (expense, income, transfer)
 * @returns Array of dashboard category keys
 */
export const getDashboardCategoriesForType = (type: string): string[] => {
  const mapping = dashboardCategoryMapping[type];
  if (!mapping) return [];
  
  // Get unique dashboard categories for this type
  const dashboardCategories = new Set(Object.values(mapping));
  return Array.from(dashboardCategories);
};