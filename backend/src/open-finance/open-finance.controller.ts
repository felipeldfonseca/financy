import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OpenFinanceService } from './open-finance.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

@ApiTags('open-finance')
@ApiBearerAuth()
@Controller('open-finance')
export class OpenFinanceController {
  constructor(private readonly openFinanceService: OpenFinanceService) {}

  @Get('status')
  @ApiOperation({ summary: 'Whether Open Finance sync is configured on this server' })
  getStatus() {
    return { enabled: this.openFinanceService.isEnabled() };
  }

  @Post('connect-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a short-lived token to open the Pluggy Connect widget' })
  @ApiResponse({ status: 200, description: 'Connect token created' })
  @ApiResponse({ status: 503, description: 'Open Finance not configured' })
  async createConnectToken(@Request() req) {
    return await this.openFinanceService.createConnectToken(req.user.id);
  }

  @Post('connections')
  @ApiOperation({ summary: 'Register a bank connection after the widget succeeds' })
  @ApiResponse({ status: 201, description: 'Connection registered; first sync started' })
  @ApiResponse({ status: 403, description: 'No permission on the target context' })
  async createConnection(@Body() dto: CreateConnectionDto, @Request() req) {
    return await this.openFinanceService.registerConnection(req.user.id, dto);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List the current user bank connections and accounts' })
  async listConnections(@Request() req) {
    return await this.openFinanceService.listConnections(req.user.id);
  }

  @Post('connections/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a manual sync of one connection' })
  @ApiResponse({ status: 200, description: 'Sync executed' })
  async syncConnection(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return await this.openFinanceService.syncNow(req.user.id, id);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a bank (deletes the provider item; keeps imported transactions)' })
  @ApiResponse({ status: 204, description: 'Connection removed' })
  async disconnect(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.openFinanceService.disconnect(req.user.id, id);
  }
}
