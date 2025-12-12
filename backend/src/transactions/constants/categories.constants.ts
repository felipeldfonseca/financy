// Dashboard category constants for validation
// These must match the frontend dashboard categories exactly

export const VALID_DASHBOARD_CATEGORIES = {
  expense: [
    'housing',
    'transportation', 
    'fooddining',
    'healthfitness',
    'entertainmentshopping',
    'billsfinancial',
    'travellifestyle',
    'other'
  ],
  income: [
    'employment',
    'investment',
    'governmentbenefits',
    'other'
  ],
  transfer: [
    'accounts',
    'debt', 
    'other'
  ]
} as const;

// Helper function to get all valid dashboard categories for a transaction type
export function getValidDashboardCategories(transactionType: string): readonly string[] {
  const type = transactionType.toLowerCase();
  return VALID_DASHBOARD_CATEGORIES[type as keyof typeof VALID_DASHBOARD_CATEGORIES] || [];
}

// Helper function to get all valid dashboard categories (flat array)
export function getAllValidDashboardCategories(): string[] {
  return [
    ...VALID_DASHBOARD_CATEGORIES.expense,
    ...VALID_DASHBOARD_CATEGORIES.income,
    ...VALID_DASHBOARD_CATEGORIES.transfer
  ];
}

// Validation function to check if a dashboard category is valid for a given transaction type
export function isValidDashboardCategory(transactionType: string, dashboardCategory: string): boolean {
  const validCategories = getValidDashboardCategories(transactionType);
  return validCategories.includes(dashboardCategory);
}