# Currency & Foreign Exchange Management
## Financy Multi-Currency Support Specification

**Version**: 1.0  
**Last Updated**: 2025-10-18  
**Scope**: Complete currency handling, conversion, and foreign exchange rate management  

---

## Overview

Financy supports global users with comprehensive multi-currency capabilities, including:
- Real-time currency conversion for transactions
- Historical exchange rate tracking
- Context-specific currency preferences
- Intelligent currency detection and validation
- Cost-optimized exchange rate providers

### Design Principles
1. **Context Currency**: Each financial context has a default currency for reporting
2. **Transaction Currency**: Preserve original transaction currency with conversion
3. **Rate Transparency**: Always show exchange rates and conversion details
4. **Historical Accuracy**: Maintain historical rates for audit and analysis
5. **Cost Optimization**: Intelligent provider selection based on usage patterns

---

## Supported Currencies

### Primary Currencies (Full Support)
```typescript
const PRIMARY_CURRENCIES = [
  'BRL', // Brazilian Real (primary market)
  'USD', // US Dollar (global standard)
  'EUR', // Euro (European market)
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'CAD', // Canadian Dollar
  'AUD', // Australian Dollar
  'CHF', // Swiss Franc
  'CNY', // Chinese Yuan
  'MXN'  // Mexican Peso (LATAM expansion)
];
```

### Secondary Currencies (Basic Support)
- All ISO 4217 compliant currency codes
- Limited to major trading pairs with USD/EUR
- May have higher conversion fees or delays

### Currency Metadata
```typescript
interface CurrencyDefinition {
  code: string;           // ISO 4217 code
  name: string;          // Full currency name
  symbol: string;        // Currency symbol
  decimal_places: number; // Standard decimal places
  countries: string[];   // Countries using this currency
  is_crypto: boolean;    // Cryptocurrency flag
  is_active: boolean;    // Currently supported
  priority: number;      // Display priority (1 = highest)
}

const CURRENCY_DEFINITIONS: CurrencyDefinition[] = [
  {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    decimal_places: 2,
    countries: ['BR'],
    is_crypto: false,
    is_active: true,
    priority: 1
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimal_places: 2,
    countries: ['US'],
    is_crypto: false,
    is_active: true,
    priority: 2
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimal_places: 2,
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'GR', 'FI', 'LU', 'SI', 'CY', 'MT', 'SK', 'EE', 'LV', 'LT'],
    is_crypto: false,
    is_active: true,
    priority: 3
  }
  // ... additional currencies
];
```

---

## Exchange Rate Providers

### Provider Hierarchy
1. **Primary Provider**: European Central Bank (ECB) - Free, reliable, daily rates
2. **Secondary Provider**: Fixer.io - Real-time rates, paid API
3. **Fallback Provider**: XE.com API - Backup for high-volume periods
4. **Emergency Provider**: Static rates for critical operations

### Provider Configuration
```typescript
interface ExchangeRateProvider {
  name: string;
  base_url: string;
  api_key_required: boolean;
  rate_limit: number; // requests per hour
  update_frequency: string; // 'real-time', 'hourly', 'daily'
  supported_currencies: string[];
  cost_per_request: number; // USD
  reliability_score: number; // 0.0-1.0
  latency_ms: number; // average response time
}

const EXCHANGE_RATE_PROVIDERS: ExchangeRateProvider[] = [
  {
    name: 'ecb',
    base_url: 'https://api.exchangerate-api.com/v4/latest',
    api_key_required: false,
    rate_limit: 1000,
    update_frequency: 'daily',
    supported_currencies: PRIMARY_CURRENCIES,
    cost_per_request: 0.0,
    reliability_score: 0.95,
    latency_ms: 200
  },
  {
    name: 'fixer',
    base_url: 'https://api.fixer.io/latest',
    api_key_required: true,
    rate_limit: 10000,
    update_frequency: 'real-time',
    supported_currencies: [...PRIMARY_CURRENCIES, ...SECONDARY_CURRENCIES],
    cost_per_request: 0.0001,
    reliability_score: 0.98,
    latency_ms: 150
  },
  {
    name: 'xe',
    base_url: 'https://api.xe.com/v1/convert',
    api_key_required: true,
    rate_limit: 5000,
    update_frequency: 'real-time',
    supported_currencies: [...PRIMARY_CURRENCIES, ...SECONDARY_CURRENCIES],
    cost_per_request: 0.001,
    reliability_score: 0.92,
    latency_ms: 300
  }
];
```

### Intelligent Provider Selection
```typescript
class ExchangeRateService {
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    options: ConversionOptions = {}
  ): Promise<ExchangeRateResult> {
    
    // Check cache first
    const cachedRate = await this.getCachedRate(fromCurrency, toCurrency);
    if (cachedRate && this.isCacheValid(cachedRate, options.maxAgeMinutes)) {
      return this.convertWithCachedRate(amount, cachedRate);
    }
    
    // Select optimal provider
    const provider = await this.selectOptimalProvider(fromCurrency, toCurrency, options);
    
    try {
      const rate = await this.fetchFromProvider(provider, fromCurrency, toCurrency);
      
      // Cache the rate
      await this.cacheRate(rate);
      
      // Convert amount
      return this.convertAmount(amount, rate);
      
    } catch (error) {
      // Try fallback provider
      return this.tryFallbackProvider(fromCurrency, toCurrency, amount, options);
    }
  }
  
  private async selectOptimalProvider(
    fromCurrency: string,
    toCurrency: string,
    options: ConversionOptions
  ): Promise<ExchangeRateProvider> {
    
    // For real-time requirements
    if (options.requireRealTime) {
      return this.providers.find(p => p.update_frequency === 'real-time' && p.reliability_score > 0.95);
    }
    
    // For cost optimization
    if (options.optimizeForCost) {
      return this.providers
        .filter(p => p.supported_currencies.includes(fromCurrency) && p.supported_currencies.includes(toCurrency))
        .sort((a, b) => a.cost_per_request - b.cost_per_request)[0];
    }
    
    // Default: balance cost and reliability
    return this.providers
      .filter(p => p.supported_currencies.includes(fromCurrency) && p.supported_currencies.includes(toCurrency))
      .sort((a, b) => (a.cost_per_request * (1 - a.reliability_score)) - (b.cost_per_request * (1 - b.reliability_score)))[0];
  }
}
```

---

## Currency Conversion Implementation

### Exchange Rate Data Model
```typescript
interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  inverse_rate: number;
  provider: string;
  rate_date: Date;
  fetched_at: Date;
  expires_at: Date;
  bid_rate?: number;  // For spread tracking
  ask_rate?: number;  // For spread tracking
  spread?: number;    // Bid-ask spread
  metadata: {
    provider_response_time_ms: number;
    provider_confidence?: number;
    market_conditions?: string;
  };
}

interface ConversionResult {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  converted_currency: string;
  exchange_rate: number;
  rate_date: Date;
  provider: string;
  conversion_fee?: number;
  total_cost?: number;
  confidence_score: number;
}
```

### Real-Time Conversion Service
```typescript
class CurrencyConversionService {
  async convertTransaction(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    transactionDate: Date
  ): Promise<ConversionResult> {
    
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        original_amount: amount,
        original_currency: fromCurrency,
        converted_amount: amount,
        converted_currency: toCurrency,
        exchange_rate: 1.0,
        rate_date: transactionDate,
        provider: 'none',
        confidence_score: 1.0
      };
    }
    
    // Get historical rate for transaction date
    const exchangeRate = await this.getHistoricalRate(
      fromCurrency, 
      toCurrency, 
      transactionDate
    );
    
    // Calculate conversion
    const convertedAmount = this.calculateConversion(amount, exchangeRate.rate);
    
    // Apply any conversion fees
    const fees = this.calculateConversionFees(amount, fromCurrency, toCurrency);
    
    return {
      original_amount: amount,
      original_currency: fromCurrency,
      converted_amount: convertedAmount,
      converted_currency: toCurrency,
      exchange_rate: exchangeRate.rate,
      rate_date: exchangeRate.rate_date,
      provider: exchangeRate.provider,
      conversion_fee: fees.total,
      total_cost: convertedAmount + fees.total,
      confidence_score: this.calculateConfidenceScore(exchangeRate)
    };
  }
  
  private calculateConversion(amount: number, rate: number): number {
    // Apply precise decimal arithmetic to avoid floating point errors
    const conversion = Decimal.mul(amount, rate);
    return conversion.toNumber();
  }
  
  private calculateConversionFees(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): ConversionFees {
    
    // No fees for major currency pairs
    const majorPairs = ['USD-EUR', 'EUR-USD', 'USD-BRL', 'BRL-USD'];
    const pair = `${fromCurrency}-${toCurrency}`;
    
    if (majorPairs.includes(pair)) {
      return { provider_fee: 0, service_fee: 0, total: 0 };
    }
    
    // Minor currency fee structure
    const providerFee = amount * 0.001; // 0.1%
    const serviceFee = Math.max(0.01, amount * 0.0005); // Min $0.01 or 0.05%
    
    return {
      provider_fee: providerFee,
      service_fee: serviceFee,
      total: providerFee + serviceFee
    };
  }
}
```

### Historical Rate Management
```typescript
class HistoricalRateService {
  async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ExchangeRate> {
    
    // Check if we have the exact date
    let rate = await this.findExactDateRate(fromCurrency, toCurrency, date);
    
    if (!rate) {
      // Find nearest business day rate
      rate = await this.findNearestBusinessDayRate(fromCurrency, toCurrency, date);
    }
    
    if (!rate) {
      // Fetch historical rate from provider
      rate = await this.fetchHistoricalRate(fromCurrency, toCurrency, date);
    }
    
    if (!rate) {
      // Use current rate as fallback with confidence penalty
      rate = await this.getCurrentRateAsFallback(fromCurrency, toCurrency, date);
    }
    
    return rate;
  }
  
  async backfillHistoricalRates(
    currencies: string[],
    startDate: Date,
    endDate: Date
  ): Promise<BackfillResult> {
    
    const results: BackfillResult = {
      total_requests: 0,
      successful_rates: 0,
      failed_rates: 0,
      cost_incurred: 0,
      time_elapsed_ms: 0
    };
    
    const startTime = Date.now();
    
    // Generate all currency pairs
    const pairs = this.generateCurrencyPairs(currencies);
    
    // Generate date range (business days only)
    const dates = this.generateBusinessDays(startDate, endDate);
    
    for (const pair of pairs) {
      for (const date of dates) {
        try {
          const rate = await this.fetchHistoricalRateWithRetry(
            pair.from, 
            pair.to, 
            date
          );
          
          await this.storeHistoricalRate(rate);
          results.successful_rates++;
          
        } catch (error) {
          console.error(`Failed to fetch rate for ${pair.from}/${pair.to} on ${date}:`, error);
          results.failed_rates++;
        }
        
        results.total_requests++;
        
        // Rate limiting
        await this.sleep(100); // 100ms between requests
      }
    }
    
    results.time_elapsed_ms = Date.now() - startTime;
    return results;
  }
}
```

---

## Context Currency Management

### Context Currency Settings
```typescript
interface ContextCurrencySettings {
  default_currency: string;
  display_preferences: {
    show_original_currency: boolean;
    show_exchange_rate: boolean;
    round_to_major_unit: boolean;
    currency_symbol_position: 'before' | 'after';
  };
  conversion_preferences: {
    auto_convert_on_entry: boolean;
    require_conversion_confirmation: boolean;
    use_real_time_rates: boolean;
    max_rate_age_minutes: number;
  };
  supported_currencies: string[];
  conversion_rules: ConversionRule[];
}

interface ConversionRule {
  condition: {
    amount_threshold?: number;
    source_currencies?: string[];
    user_roles?: string[];
  };
  action: {
    require_approval: boolean;
    apply_fees: boolean;
    use_premium_rates: boolean;
    notify_members: boolean;
  };
}
```

### Multi-Currency Transaction Entry
```typescript
class MultiCurrencyTransactionService {
  async createTransaction(
    contextId: string,
    userId: string,
    transactionData: CreateTransactionDto
  ): Promise<Transaction> {
    
    const context = await this.getContext(contextId);
    const contextCurrency = context.currency_code;
    const transactionCurrency = transactionData.currency_code;
    
    // Prepare transaction with currency handling
    const transaction: Partial<Transaction> = {
      ...transactionData,
      context_id: contextId,
      user_id: userId,
      amount: transactionData.amount,
      currency_code: transactionCurrency
    };
    
    // Convert to context currency if different
    if (transactionCurrency !== contextCurrency) {
      const conversion = await this.currencyService.convertTransaction(
        transactionData.amount,
        transactionCurrency,
        contextCurrency,
        transactionData.transaction_date
      );
      
      transaction.amount_in_context_currency = conversion.converted_amount;
      transaction.exchange_rate = conversion.exchange_rate;
      transaction.exchange_rate_provider = conversion.provider;
      transaction.exchange_rate_date = conversion.rate_date;
      
      // Store conversion metadata
      transaction.processing_metadata = {
        ...transaction.processing_metadata,
        currency_conversion: {
          original_amount: conversion.original_amount,
          original_currency: conversion.original_currency,
          converted_amount: conversion.converted_amount,
          converted_currency: conversion.converted_currency,
          exchange_rate: conversion.exchange_rate,
          provider: conversion.provider,
          conversion_fees: conversion.conversion_fee,
          confidence_score: conversion.confidence_score
        }
      };
      
      // Check if approval required for large conversions
      if (await this.requiresConversionApproval(context, conversion)) {
        transaction.status = 'pending_approval';
        await this.notifyContextAdmins(contextId, transaction, conversion);
      }
      
    } else {
      // Same currency - no conversion needed
      transaction.amount_in_context_currency = transactionData.amount;
      transaction.exchange_rate = 1.0;
    }
    
    // Create transaction
    const savedTransaction = await this.transactionRepository.save(transaction);
    
    // Update context currency statistics
    await this.updateContextCurrencyStats(contextId, savedTransaction);
    
    return savedTransaction;
  }
  
  private async requiresConversionApproval(
    context: Context,
    conversion: ConversionResult
  ): Promise<boolean> {
    
    const rules = context.settings.conversion_rules || [];
    
    for (const rule of rules) {
      if (this.matchesConversionRule(conversion, rule)) {
        return rule.action.require_approval;
      }
    }
    
    return false;
  }
}
```

---

## Currency Display and Formatting

### Localized Currency Formatting
```typescript
class CurrencyFormatter {
  formatAmount(
    amount: number,
    currency: string,
    locale: string = 'pt-BR',
    options: FormatOptions = {}
  ): string {
    
    const currencyDef = this.getCurrencyDefinition(currency);
    
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: options.showDecimals !== false ? currencyDef.decimal_places : 0,
      maximumFractionDigits: options.showDecimals !== false ? currencyDef.decimal_places : 0
    });
    
    return formatter.format(amount);
  }
  
  formatConversionDisplay(
    originalAmount: number,
    originalCurrency: string,
    convertedAmount: number,
    convertedCurrency: string,
    exchangeRate: number,
    locale: string = 'pt-BR'
  ): ConversionDisplay {
    
    const original = this.formatAmount(originalAmount, originalCurrency, locale);
    const converted = this.formatAmount(convertedAmount, convertedCurrency, locale);
    const rate = this.formatExchangeRate(exchangeRate, originalCurrency, convertedCurrency);
    
    return {
      primary_display: converted,
      secondary_display: `(${original})`,
      exchange_rate_display: rate,
      full_display: `${converted} (${original} @ ${rate})`
    };
  }
  
  formatExchangeRate(
    rate: number,
    fromCurrency: string,
    toCurrency: string
  ): string {
    
    // Format rate with appropriate precision
    const precision = rate < 0.01 ? 6 : rate < 1 ? 4 : 2;
    const formattedRate = rate.toFixed(precision);
    
    return `1 ${fromCurrency} = ${formattedRate} ${toCurrency}`;
  }
  
  // Brazilian Real specific formatting
  formatBRL(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }
  
  // US Dollar specific formatting
  formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
```

### Context-Aware Display
```typescript
class ContextCurrencyDisplay {
  async getTransactionDisplayData(
    transaction: Transaction,
    viewerUserId: string,
    contextId: string
  ): Promise<TransactionDisplayData> {
    
    const context = await this.getContext(contextId);
    const userPreferences = await this.getUserPreferences(viewerUserId);
    const contextSettings = context.settings.display_preferences;
    
    // Primary display in context currency
    const primaryAmount = this.formatter.formatAmount(
      transaction.amount_in_context_currency,
      context.currency_code,
      userPreferences.locale
    );
    
    let secondaryAmount: string | null = null;
    let exchangeRateDisplay: string | null = null;
    
    // Show original currency if different and user preference allows
    if (transaction.currency_code !== context.currency_code && 
        contextSettings.show_original_currency) {
      
      secondaryAmount = this.formatter.formatAmount(
        transaction.amount,
        transaction.currency_code,
        userPreferences.locale
      );
      
      if (contextSettings.show_exchange_rate && transaction.exchange_rate) {
        exchangeRateDisplay = this.formatter.formatExchangeRate(
          transaction.exchange_rate,
          transaction.currency_code,
          context.currency_code
        );
      }
    }
    
    return {
      primary_amount: primaryAmount,
      secondary_amount: secondaryAmount,
      exchange_rate_display: exchangeRateDisplay,
      currency_symbol: this.getCurrencySymbol(context.currency_code),
      conversion_confidence: transaction.processing_metadata?.currency_conversion?.confidence_score
    };
  }
}
```

---

## Rate Caching and Performance

### Intelligent Caching Strategy
```typescript
class ExchangeRateCacheService {
  private cache: Map<string, CachedRate> = new Map();
  private redis: Redis;
  
  async getCachedRate(
    fromCurrency: string,
    toCurrency: string,
    maxAgeMinutes: number = 60
  ): Promise<ExchangeRate | null> {
    
    const cacheKey = this.generateCacheKey(fromCurrency, toCurrency);
    
    // Check memory cache first
    const memoryRate = this.cache.get(cacheKey);
    if (memoryRate && this.isCacheValid(memoryRate, maxAgeMinutes)) {
      return memoryRate.rate;
    }
    
    // Check Redis cache
    const redisRate = await this.redis.get(cacheKey);
    if (redisRate) {
      const cachedRate: CachedRate = JSON.parse(redisRate);
      if (this.isCacheValid(cachedRate, maxAgeMinutes)) {
        // Update memory cache
        this.cache.set(cacheKey, cachedRate);
        return cachedRate.rate;
      }
    }
    
    return null;
  }
  
  async setCachedRate(rate: ExchangeRate): Promise<void> {
    const cacheKey = this.generateCacheKey(rate.from_currency, rate.to_currency);
    const cachedRate: CachedRate = {
      rate,
      cached_at: new Date(),
      expires_at: rate.expires_at
    };
    
    // Store in memory cache
    this.cache.set(cacheKey, cachedRate);
    
    // Store in Redis with TTL
    const ttlSeconds = Math.floor((rate.expires_at.getTime() - Date.now()) / 1000);
    await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(cachedRate));
    
    // Also cache inverse rate for efficiency
    const inverseRate: ExchangeRate = {
      ...rate,
      from_currency: rate.to_currency,
      to_currency: rate.from_currency,
      rate: 1 / rate.rate,
      inverse_rate: rate.rate
    };
    
    const inverseCacheKey = this.generateCacheKey(inverseRate.from_currency, inverseRate.to_currency);
    const inverseCachedRate: CachedRate = {
      rate: inverseRate,
      cached_at: new Date(),
      expires_at: rate.expires_at
    };
    
    this.cache.set(inverseCacheKey, inverseCachedRate);
    await this.redis.setex(inverseCacheKey, ttlSeconds, JSON.stringify(inverseCachedRate));
  }
  
  private generateCacheKey(fromCurrency: string, toCurrency: string): string {
    return `fx:${fromCurrency}:${toCurrency}`;
  }
  
  private isCacheValid(cachedRate: CachedRate, maxAgeMinutes: number): boolean {
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    const age = Date.now() - cachedRate.cached_at.getTime();
    return age < maxAge && cachedRate.expires_at > new Date();
  }
}
```

### Performance Optimization
```typescript
class CurrencyPerformanceOptimizer {
  // Pre-warm cache with commonly used currency pairs
  async preWarmCache(): Promise<void> {
    const commonPairs = [
      ['USD', 'BRL'], ['BRL', 'USD'],
      ['EUR', 'BRL'], ['BRL', 'EUR'],
      ['USD', 'EUR'], ['EUR', 'USD']
    ];
    
    const promises = commonPairs.map(([from, to]) =>
      this.exchangeRateService.getExchangeRate(from, to, 1, { useCache: false })
    );
    
    await Promise.allSettled(promises);
  }
  
  // Batch rate requests for efficiency
  async getBatchRates(
    pairs: Array<{from: string, to: string}>,
    date?: Date
  ): Promise<Map<string, ExchangeRate>> {
    
    const results = new Map<string, ExchangeRate>();
    const uncachedPairs: Array<{from: string, to: string}> = [];
    
    // Check cache first
    for (const pair of pairs) {
      const cached = await this.cacheService.getCachedRate(pair.from, pair.to, 30);
      if (cached) {
        results.set(`${pair.from}-${pair.to}`, cached);
      } else {
        uncachedPairs.push(pair);
      }
    }
    
    // Fetch uncached rates in batch
    if (uncachedPairs.length > 0) {
      const batchResults = await this.fetchBatchRates(uncachedPairs, date);
      batchResults.forEach((rate, key) => results.set(key, rate));
    }
    
    return results;
  }
}
```

This comprehensive currency and foreign exchange system provides robust multi-currency support with intelligent caching, cost optimization, and accurate historical rate management for the Financy platform.