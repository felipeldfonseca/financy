import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  timestamp: Date;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly rateCache = new Map<string, ExchangeRate>();
  private readonly cacheTimeout = 1000 * 60 * 60; // 1 hour cache

  // Common currency symbols for detection
  private readonly currencySymbols = {
    '$': 'USD',
    '€': 'EUR', 
    '£': 'GBP',
    '¥': 'JPY',
    'R$': 'BRL',
    '₹': 'INR',
    '₽': 'RUB',
    'C$': 'CAD',
    'A$': 'AUD',
    'CHF': 'CHF',
    'Kr': 'SEK',
  };

  private readonly supportedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'BRL', 'CAD', 'AUD', 'CHF', 'INR', 'RUB', 'SEK', 'NOK', 'DKK'
  ];

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Detect currency from text input
   */
  detectCurrency(text: string): string | null {
    // Check for currency symbols
    for (const [symbol, currency] of Object.entries(this.currencySymbols)) {
      if (text.includes(symbol)) {
        return currency;
      }
    }

    // Check for currency codes (USD, EUR, etc.)
    const upperText = text.toUpperCase();
    for (const currency of this.supportedCurrencies) {
      if (upperText.includes(currency)) {
        return currency;
      }
    }

    return null;
  }

  /**
   * Get exchange rate from one currency to another
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) {
      return 1.0;
    }

    const cacheKey = `${from}_${to}`;
    const cached = this.rateCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.cacheTimeout) {
      return cached.rate;
    }

    try {
      const rate = await this.fetchExchangeRate(from, to);
      
      // Cache the rate
      this.rateCache.set(cacheKey, {
        from,
        to,
        rate,
        timestamp: new Date(),
      });

      return rate;
    } catch (error) {
      this.logger.error(`Failed to get exchange rate ${from} to ${to}:`, error);
      
      // Return cached rate if available, even if expired
      if (cached) {
        this.logger.warn(`Using expired exchange rate for ${from} to ${to}`);
        return cached.rate;
      }
      
      throw new Error(`Could not get exchange rate from ${from} to ${to}`);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = Math.round(amount * rate * 100) / 100; // Round to 2 decimals

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      convertedCurrency: toCurrency,
      exchangeRate: rate,
      timestamp: new Date(),
    };
  }

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies(): string[] {
    return [...this.supportedCurrencies];
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
  }

  /**
   * Fetch exchange rate from external API
   */
  private async fetchExchangeRate(from: string, to: string): Promise<number> {
    // Using exchangerate-api.io (free tier: 1,500 requests/month)
    // Alternative: fixer.io, currencyapi.com, or similar
    const apiKey = this.configService.get('EXCHANGE_RATE_API_KEY');
    
    if (!apiKey) {
      // Fallback: use a free service without API key (limited)
      return this.fetchFreeExchangeRate(from, to);
    }

    try {
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`;
      const response = await lastValueFrom(this.httpService.get(url));
      
      if (response.data.result === 'success') {
        return response.data.conversion_rate;
      } else {
        throw new Error(`API error: ${response.data.error_type}`);
      }
    } catch (error) {
      this.logger.error('Error fetching exchange rate with API key:', error);
      return this.fetchFreeExchangeRate(from, to);
    }
  }

  /**
   * Fallback to free exchange rate service
   */
  private async fetchFreeExchangeRate(from: string, to: string): Promise<number> {
    try {
      // Using exchangerate-api.io free tier
      const url = `https://api.exchangerate-api.com/v4/latest/${from}`;
      const response = await lastValueFrom(this.httpService.get(url));
      
      if (response.data.rates && response.data.rates[to]) {
        return response.data.rates[to];
      } else {
        throw new Error(`Rate not found for ${to}`);
      }
    } catch (error) {
      this.logger.error('Error fetching free exchange rate:', error);
      
      // Ultimate fallback: return 1 (no conversion)
      this.logger.warn(`Using fallback rate 1.0 for ${from} to ${to}`);
      return 1.0;
    }
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.rateCache.clear();
    this.logger.log('Exchange rate cache cleared');
  }
}