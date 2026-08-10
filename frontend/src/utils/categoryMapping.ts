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
  if (!mapping) {
    return 'other';
  }
  if (mapping[detailedCategory]) {
    return mapping[detailedCategory];
  }
  // Accept values that are already dashboard category keys (legacy rows
  // stored the dashboard key directly in category).
  if (Object.values(mapping).includes(detailedCategory)) {
    return detailedCategory;
  }
  return 'other'; // Fallback to 'other' for unknown categories
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

// Map subcategories to their translation paths. The third path segment is the
// detailed category each subcategory belongs to (categories.{type}.{detailed}.{sub}).
export const subcategoryTranslationPaths: Record<string, string> = {
  // Housing
  'rent': 'categories.expense.housing.rent',
  'utilities': 'categories.expense.housing.utilities', 
  'maintenance': 'categories.expense.housing.maintenance',
  'furniture': 'categories.expense.housing.furniture',
  'home': 'categories.expense.insurance.home',
  
  // Transportation
  'fuel': 'categories.expense.transportation.fuel',
  'parking': 'categories.expense.transportation.parking',
  'public': 'categories.expense.transportation.public',
  'rideshare': 'categories.expense.transportation.rideshare',
  'auto': 'categories.expense.insurance.auto',
  
  // Food & Dining
  'groceries': 'categories.expense.food.groceries',
  'restaurants': 'categories.expense.food.restaurants',
  'fastfood': 'categories.expense.food.fastfood',
  'coffee': 'categories.expense.food.coffee',
  'delivery': 'categories.expense.food.delivery',
  
  // Health & Fitness
  'doctor': 'categories.expense.healthfitness.doctor',
  'prescription': 'categories.expense.healthfitness.prescription',
  'dental': 'categories.expense.healthfitness.dental',
  'vision': 'categories.expense.healthfitness.vision',
  'gym': 'categories.expense.healthfitness.gym',
  'sports': 'categories.expense.healthfitness.sports',
  'health': 'categories.expense.insurance.health',
  
  // Entertainment & Shopping
  'movies': 'categories.expense.entertainment.movies',
  'hobbies': 'categories.expense.entertainment.hobbies',
  'subscriptions': 'categories.expense.entertainment.subscriptions',
  'gaming': 'categories.expense.entertainment.gaming',
  'clothing': 'categories.expense.shopping.clothing',
  'electronics': 'categories.expense.shopping.electronics',
  'gifts': 'categories.expense.shopping.gifts',
  'books': 'categories.expense.shopping.books',
  'hygiene': 'categories.expense.personalcare.hygiene',
  'cosmetics': 'categories.expense.personalcare.cosmetics',
  'haircare': 'categories.expense.personalcare.haircare',
  'skincare': 'categories.expense.personalcare.skincare',
  'wellness': 'categories.expense.personalcare.wellness',
  
  // Bills & Financial
  'phone': 'categories.expense.bills.phone',
  'internet': 'categories.expense.bills.internet',
  'electricity': 'categories.expense.bills.electricity',
  'water': 'categories.expense.bills.water',
  'gas': 'categories.expense.bills.gas',
  'bankfees': 'categories.expense.financial.bankfees',
  'advisor': 'categories.expense.financial.advisor',
  'taxes': 'categories.expense.financial.taxes',
  'accounting': 'categories.expense.financial.accounting',
  'life': 'categories.expense.insurance.life',
  'disability': 'categories.expense.insurance.disability',
  
  // Travel & Lifestyle
  'flights': 'categories.expense.travelvacation.flights',
  'hotels': 'categories.expense.travelvacation.hotels',
  'vacation': 'categories.expense.travelvacation.vacation',
  'business': 'categories.expense.travelvacation.business',
  'veterinary': 'categories.expense.pets.veterinary',
  'grooming': 'categories.expense.pets.grooming',
  'supplies': 'categories.expense.pets.supplies',
  'childcare': 'categories.expense.kidsfamily.childcare',
  'diapers': 'categories.expense.kidsfamily.diapers',
  'toys': 'categories.expense.kidsfamily.toys',
  'activities': 'categories.expense.kidsfamily.activities',
  'familytrips': 'categories.expense.kidsfamily.familytrips',
  
  // Other
  'tuition': 'categories.expense.education.tuition',
  'courses': 'categories.expense.education.courses',
  'training': 'categories.expense.education.training',
  'charity': 'categories.expense.giftdonations.charity',
  'religious': 'categories.expense.giftdonations.religious',
  'political': 'categories.expense.giftdonations.political',
  'nonprofit': 'categories.expense.giftdonations.nonprofit',
  'office': 'categories.expense.businessexpenses.office',
  'marketing': 'categories.expense.businessexpenses.marketing',
  'equipment': 'categories.expense.businessexpenses.equipment',
  'software': 'categories.expense.businessexpenses.software',
  'miscellaneous': 'categories.expense.otherexpenses.miscellaneous',
  'fees': 'categories.expense.otherexpenses.fees',
  'unexpected': 'categories.expense.otherexpenses.unexpected',
  'emergency': 'categories.expense.otherexpenses.emergency',
  
  // Income subcategories
  'salary': 'categories.income.employment.salary',
  'bonus': 'categories.income.employment.bonus',
  'overtime': 'categories.income.employment.overtime',
  'commission': 'categories.income.employment.commission',
  'freelance': 'categories.income.selfemployment.freelance',
  'consulting': 'categories.income.selfemployment.consulting',
  'contracting': 'categories.income.selfemployment.contracting',
  'dividends': 'categories.income.investment.dividends',
  'interest': 'categories.income.investment.interest',
  'capital': 'categories.income.investment.capital',
  'rental': 'categories.income.investment.rental',
  'revenue': 'categories.income.business.revenue',
  'partnership': 'categories.income.business.partnership',
  'royalties': 'categories.income.business.royalties',
  'licensing': 'categories.income.business.licensing',
  'unemployment': 'categories.income.governmentbenefits.unemployment',
  'retirement': 'categories.income.governmentbenefits.retirement',
  'social': 'categories.income.governmentbenefits.social',
  'tax': 'categories.income.governmentbenefits.tax',
  'purchases': 'categories.income.refundsreturns.purchases',
  'services': 'categories.income.refundsreturns.services',
  'warranty': 'categories.income.refundsreturns.warranty',
  'overpayment': 'categories.income.refundsreturns.overpayment',
  'lottery': 'categories.income.otherincome.lottery',
  'found': 'categories.income.otherincome.found',
  'cashback': 'categories.income.otherincome.cashback',
  
  // Transfer subcategories
  'checking': 'categories.transfer.accounts.checking',
  'savings': 'categories.transfer.accounts.savings',
  'investment': 'categories.transfer.accounts.investment',
  'credit': 'categories.transfer.debt.credit',
  'loan': 'categories.transfer.debt.loan',
  'mortgage': 'categories.transfer.debt.mortgage',
  'family': 'categories.transfer.personaltransfers.family',
  'friends': 'categories.transfer.personaltransfers.friends',
  'spouse': 'categories.transfer.personaltransfers.spouse',
  'children': 'categories.transfer.personaltransfers.children',
  'temporary': 'categories.transfer.othertransfers.temporary'
};

// Derives the detailed category key (e.g. 'food') a subcategory belongs to
// from its translation path, so transactions store the detailed key that the
// list, translations, and dashboard mapping all expect.
export const getDetailedCategoryForSubcategory = (type: string, subcategory?: string): string | undefined => {
  if (!subcategory) return undefined;
  const path = subcategoryTranslationPaths[subcategory];
  if (!path) return undefined;
  const segments = path.split('.');
  return segments[1] === type ? segments[2] : undefined;
};

