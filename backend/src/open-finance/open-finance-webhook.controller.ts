import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OpenFinanceService, PluggyWebhookEvent } from './open-finance.service';

@ApiTags('open-finance')
@Controller('webhooks/open-finance')
export class OpenFinanceWebhookController {
  private readonly logger = new Logger(OpenFinanceWebhookController.name);

  constructor(
    private readonly openFinanceService: OpenFinanceService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Pluggy webhook receiver. Two defenses, since Pluggy does not sign
   * payloads: a shared secret in the URL (?token=..., set the same value in
   * PLUGGY_WEBHOOK_URL and PLUGGY_WEBHOOK_SECRET), and zero trust in the body
   * — the service only uses event/itemId as hints and re-fetches everything
   * from the API with our credentials.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Pluggy webhook notifications' })
  @ApiResponse({ status: 200, description: 'Event accepted' })
  @ApiResponse({ status: 401, description: 'Invalid webhook token' })
  async handleWebhook(
    @Body() payload: PluggyWebhookEvent,
    @Query('token') token?: string,
  ): Promise<{ status: string }> {
    const expectedToken = this.configService.get('PLUGGY_WEBHOOK_SECRET');
    if (expectedToken && token !== expectedToken) {
      this.logger.warn('Webhook rejected: invalid token');
      throw new UnauthorizedException('Invalid webhook token');
    }

    // Acknowledge fast; process asynchronously so provider timeouts/retries
    // don't pile up behind a long sync.
    this.openFinanceService.handleWebhookEvent(payload).catch(error => {
      this.logger.error(`Webhook processing failed: ${error.message}`);
    });

    return { status: 'ok' };
  }
}
