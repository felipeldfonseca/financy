import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { ParsedTransaction } from './interfaces/telegram.interface';
import { CurrencyService } from '../currency/currency.service';

@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);
  private readonly openRouterApiKey: string;
  private readonly openRouterBaseUrl = 'https://openrouter.ai/api/v1';
  private readonly primaryModel: string;
  private readonly secondaryModel: string;
  private readonly tertiaryModel: string;
  private readonly storedTransactions = new Map<string, ParsedTransaction>();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private currencyService: CurrencyService,
  ) {
    this.openRouterApiKey = this.configService.get('OPENROUTER_API_KEY');
    this.primaryModel = this.configService.get('PRIMARY_MODEL', 'deepseek/deepseek-chat-v3.1:free');
    this.secondaryModel = this.configService.get('SECONDARY_MODEL', 'qwen/qwen3-coder:free');
    this.tertiaryModel = this.configService.get('TERTIARY_MODEL', 'google/gemini-2.5-flash-lite');
  }

  async processTextMessage(text: string, userId: string, defaultCurrency: string = 'USD'): Promise<ParsedTransaction | null> {
    try {
      if (!this.openRouterApiKey || this.openRouterApiKey === 'placeholder') {
        this.logger.warn('OpenRouter API key not configured. Using regex fallback.');
        return this.parseTransactionWithRegex(text, defaultCurrency);
      }

      const extractionPrompt = this.buildExtractionPrompt(text);
      
      // Try AI models in sequence: Primary -> Secondary -> Tertiary -> Regex
      let aiResponse = await this.tryAIModel(this.primaryModel, extractionPrompt, 'Primary');
      
      if (!aiResponse) {
        aiResponse = await this.tryAIModel(this.secondaryModel, extractionPrompt, 'Secondary');
      }
      
      if (!aiResponse) {
        aiResponse = await this.tryAIModel(this.tertiaryModel, extractionPrompt, 'Tertiary');
      }
      
      if (aiResponse) {
        const parsedTransaction = await this.parseAIResponse(aiResponse, text, defaultCurrency);
        if (parsedTransaction) {
          // Store temporarily for confirmation
          this.storeTransaction(parsedTransaction);
          return parsedTransaction;
        }
      }

      // Final fallback to regex
      this.logger.warn('All AI models failed, using regex fallback');
      return this.parseTransactionWithRegex(text, defaultCurrency);
    } catch (error) {
      this.logger.error('Error processing text message:', error);
      // Fallback to regex parsing
      return this.parseTransactionWithRegex(text, defaultCurrency);
    }
  }

  async processVoiceMessage(voice: any, userId: string): Promise<string | null> {
    try {
      if (!this.openRouterApiKey || this.openRouterApiKey === 'placeholder') {
        this.logger.warn('OpenRouter API key not configured. Voice processing disabled.');
        return null;
      }

      // For now, return null - voice processing would require additional setup
      // This would involve downloading the voice file and using Whisper API
      this.logger.warn('Voice message processing not yet implemented');
      return null;
    } catch (error) {
      this.logger.error('Error processing voice message:', error);
      return null;
    }
  }

  async processPhotoMessage(photo: any, userId: string): Promise<ParsedTransaction | null> {
    try {
      if (!this.openRouterApiKey || this.openRouterApiKey === 'placeholder') {
        this.logger.warn('OpenRouter API key not configured. Photo processing disabled.');
        return null;
      }

      // For now, return null - photo processing would require additional setup
      // This would involve downloading the image and using vision models
      this.logger.warn('Photo message processing not yet implemented');
      return null;
    } catch (error) {
      this.logger.error('Error processing photo message:', error);
      return null;
    }
  }

  async getStoredTransaction(tempId: string): Promise<ParsedTransaction | null> {
    return this.storedTransactions.get(tempId) || null;
  }

  async removeStoredTransaction(tempId: string): Promise<void> {
    this.storedTransactions.delete(tempId);
  }

  private buildExtractionPrompt(text: string): string {
    return `Extract transaction details from this natural language text: "${text}"

Respond with ONLY a valid JSON object with these exact fields:
{
  "amount": number (positive value),
  "currency": "USD" | "BRL" | "EUR" | "GBP" | "CAD" (detect from context or default to USD),
  "type": "income" | "expense" | "transfer",
  "description": "brief description",
  "category": "category name or null",
  "merchantName": "merchant name or null",
  "confidence": number between 0.0 and 1.0
}

Guidelines:
- Extract the numeric amount (convert words to numbers if needed)
- Detect currency symbols ($, R$, €, £) or currency codes
- Determine if it's income (received, earned, got, salary, etc.) or expense (spent, paid, bought, etc.)
- Create a concise description without redundant words
- Suggest appropriate category if obvious from context
- Extract merchant name if mentioned
- Set confidence based on clarity (0.9+ for clear, 0.7+ for good, 0.5+ for unclear)

Examples:
"Paid $50 for groceries at Walmart" → {"amount": 50, "currency": "USD", "type": "expense", "description": "groceries", "category": "Food & Dining", "merchantName": "Walmart", "confidence": 0.95}
"Received $1000 salary" → {"amount": 1000, "currency": "USD", "type": "income", "description": "salary", "category": "Income", "merchantName": null, "confidence": 0.9}
"Spent R$25 on lunch" → {"amount": 25, "currency": "BRL", "type": "expense", "description": "lunch", "category": "Food & Dining", "merchantName": null, "confidence": 0.85}

Remember: Respond with ONLY the JSON object, no additional text.`;
  }

  private async tryAIModel(model: string, prompt: string, tier: string): Promise<string | null> {
    try {
      this.logger.debug(`Trying ${tier} model: ${model}`);
      
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.openRouterBaseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are a financial transaction parser. Respond only with valid JSON objects. Do not include any additional text, explanations, or formatting.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 200,
            temperature: 0.1,
            top_p: 0.9,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://financy-app.com',
              'X-Title': 'Financy Transaction Parser',
            },
            timeout: 10000, // 10 second timeout
          }
        )
      );

      const content = response.data.choices?.[0]?.message?.content?.trim();
      if (content) {
        this.logger.log(`${tier} model (${model}) succeeded`);
        return content;
      }
      
      this.logger.warn(`${tier} model (${model}) returned empty response`);
      return null;
    } catch (error) {
      this.logger.warn(`${tier} model (${model}) failed:`, error.response?.data?.error || error.message);
      return null;
    }
  }

  private async parseAIResponse(aiResponse: string, originalText: string, defaultCurrency: string): Promise<ParsedTransaction | null> {
    try {
      // Clean the response in case there's extra text
      let cleanedResponse = aiResponse.trim();
      
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1];
      }

      // Try to find JSON object in the response
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate the parsed response
      if (!this.isValidParsedTransaction(parsed)) {
        this.logger.warn('Invalid AI response format:', parsed);
        return null;
      }

      const tempId = crypto.randomBytes(16).toString('hex');

      // Apply currency conversion if needed
      const convertedTransaction = await this.applyCurrencyConversion(parsed, defaultCurrency);

      return {
        ...convertedTransaction,
        tempId,
        originalText,
      };
    } catch (error) {
      this.logger.error('Error parsing AI response:', error, 'Response:', aiResponse);
      return null;
    }
  }

  private async parseTransactionWithRegex(text: string, defaultCurrency: string): Promise<ParsedTransaction | null> {
    try {
      const tempId = crypto.randomBytes(16).toString('hex');
      
      // Simple regex patterns for fallback parsing
      const patterns = {
        // Currency and amount patterns
        amount: /(?:[$]|R\$|€|£|USD|BRL|EUR|GBP)?\s*(\d+(?:[.,]\d{2})?)\s*(?:USD|BRL|EUR|GBP|dollars?|reais?|euros?)?/i,
        currency: /(?:[$]|R\$|€|£)|(?:USD|BRL|EUR|GBP)|(?:dollars?|reais?|euros?)/i,
        
        // Transaction type patterns
        income: /(?:received|earned|got|salary|income|payment|bonus|refund)/i,
        expense: /(?:spent|paid|bought|purchase|cost|bill|fee|charge)/i,
        
        // Category patterns
        food: /(?:food|grocery|groceries|restaurant|lunch|dinner|breakfast|coffee|meal)/i,
        transport: /(?:gas|fuel|transport|uber|taxi|bus|train|metro)/i,
        shopping: /(?:shopping|store|market|mall|clothes|clothing)/i,
        bills: /(?:bill|utility|utilities|electric|water|internet|phone|rent)/i,
      };

      // Extract amount
      const amountMatch = text.match(patterns.amount);
      if (!amountMatch) {
        return null; // No amount found
      }
      
      const amount = parseFloat(amountMatch[1].replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        return null;
      }

      // Detect currency
      let currency = 'USD'; // default
      const currencyMatch = text.match(patterns.currency);
      if (currencyMatch) {
        const currencyText = currencyMatch[0].toLowerCase();
        if (currencyText.includes('r$') || currencyText.includes('brl') || currencyText.includes('reais')) {
          currency = 'BRL';
        } else if (currencyText.includes('€') || currencyText.includes('eur') || currencyText.includes('euros')) {
          currency = 'EUR';
        } else if (currencyText.includes('£') || currencyText.includes('gbp')) {
          currency = 'GBP';
        }
      }

      // Determine transaction type
      let type: 'income' | 'expense' = 'expense'; // default
      if (patterns.income.test(text)) {
        type = 'income';
      } else if (patterns.expense.test(text)) {
        type = 'expense';
      }

      // Basic category detection
      let category: string | null = null;
      if (patterns.food.test(text)) {
        category = 'Food & Dining';
      } else if (patterns.transport.test(text)) {
        category = 'Transportation';
      } else if (patterns.shopping.test(text)) {
        category = 'Shopping';
      } else if (patterns.bills.test(text)) {
        category = 'Bills & Utilities';
      }

      // Create basic description (remove amount and currency from text)
      const description = text
        .replace(patterns.amount, '')
        .replace(/(?:spent|paid|bought|received|earned|got)/i, '')
        .replace(/(?:on|for|at|from)/i, '')
        .trim()
        .substring(0, 50) || 'Transaction';

      const parsedTransaction = {
        amount,
        currency,
        type,
        description,
        category,
        merchantName: null,
        confidence: 0.6, // Lower confidence for regex parsing
      };

      // Apply currency conversion if needed
      const convertedTransaction = await this.applyCurrencyConversion(parsedTransaction, defaultCurrency);

      const finalTransaction: ParsedTransaction = {
        ...convertedTransaction,
        tempId,
        originalText: text,
      };

      this.logger.log('Using regex fallback for transaction parsing');
      return finalTransaction;
    } catch (error) {
      this.logger.error('Error in regex parsing:', error);
      return null;
    }
  }

  private async applyCurrencyConversion(transaction: any, defaultCurrency: string): Promise<any> {
    try {
      const originalCurrency = transaction.currency;
      const originalAmount = transaction.amount;

      // If currencies are the same, no conversion needed
      if (originalCurrency === defaultCurrency) {
        return {
          ...transaction,
          currency: defaultCurrency,
          // Keep original values for reference
          originalAmount,
          originalCurrency,
          exchangeRate: 1.0,
        };
      }

      // Perform currency conversion
      const conversion = await this.currencyService.convertCurrency(
        originalAmount,
        originalCurrency,
        defaultCurrency
      );

      this.logger.log(`Currency conversion: ${originalAmount} ${originalCurrency} = ${conversion.convertedAmount} ${defaultCurrency} (rate: ${conversion.exchangeRate})`);

      return {
        ...transaction,
        amount: conversion.convertedAmount,
        currency: defaultCurrency,
        originalAmount: conversion.originalAmount,
        originalCurrency: conversion.originalCurrency,
        exchangeRate: conversion.exchangeRate,
      };
    } catch (error) {
      this.logger.warn(`Currency conversion failed: ${error.message}. Using original currency.`);
      
      // Return original transaction if conversion fails
      return {
        ...transaction,
        originalAmount: transaction.amount,
        originalCurrency: transaction.currency,
        exchangeRate: 1.0,
      };
    }
  }

  private isValidParsedTransaction(parsed: any): boolean {
    return (
      parsed &&
      typeof parsed.amount === 'number' &&
      parsed.amount > 0 &&
      typeof parsed.currency === 'string' &&
      ['USD', 'BRL', 'EUR', 'GBP', 'CAD'].includes(parsed.currency) &&
      typeof parsed.type === 'string' &&
      ['income', 'expense', 'transfer'].includes(parsed.type) &&
      typeof parsed.description === 'string' &&
      parsed.description.length > 0 &&
      typeof parsed.confidence === 'number' &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1
    );
  }

  private storeTransaction(transaction: ParsedTransaction): void {
    // Store for 10 minutes
    this.storedTransactions.set(transaction.tempId, transaction);
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      this.storedTransactions.delete(transaction.tempId);
    }, 10 * 60 * 1000);
  }
}