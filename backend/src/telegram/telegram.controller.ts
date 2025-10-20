import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './interfaces/telegram.interface';

@ApiTags('telegram')
@Controller('webhooks/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Telegram webhook updates' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update format' })
  async handleWebhook(@Body() update: TelegramUpdate): Promise<{ status: string }> {
    this.logger.debug('Received Telegram update:', JSON.stringify(update, null, 2));

    try {
      await this.telegramService.processUpdate(update);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing Telegram update:', error);
      // Return success anyway to prevent Telegram from retrying
      return { status: 'error' };
    }
  }

  @Post('setup')
  @ApiOperation({ summary: 'Setup Telegram webhook' })
  @ApiResponse({ status: 200, description: 'Webhook setup initiated' })
  async setupWebhook(): Promise<{ message: string }> {
    try {
      await this.telegramService.setupWebhook();
      return { message: 'Webhook setup initiated' };
    } catch (error) {
      this.logger.error('Error setting up webhook:', error);
      throw error;
    }
  }
}