import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillFiltersDto } from './dto/bill-filters.dto';
import { PayBillDto } from './dto/pay-bill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bills')
@ApiBearerAuth()
@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bill to pay' })
  @ApiResponse({ status: 201, description: 'Bill created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to context' })
  async create(@Body() createBillDto: CreateBillDto, @Request() req) {
    return await this.billsService.create(createBillDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List bills, open ones by default, soonest due first' })
  @ApiResponse({ status: 200, description: 'Bills retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() filters: BillFiltersDto, @Request() req) {
    return await this.billsService.findAll(req.user.id, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific bill by ID' })
  @ApiResponse({ status: 200, description: 'Bill retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return await this.billsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bill (status open/canceled; paying goes through /pay)' })
  @ApiResponse({ status: 200, description: 'Bill updated successfully' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBillDto: UpdateBillDto,
    @Request() req,
  ) {
    return await this.billsService.update(id, updateBillDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bill' })
  @ApiResponse({ status: 204, description: 'Bill deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.billsService.remove(id, req.user.id);
  }

  @Post(':id/pay')
  @ApiOperation({
    summary: 'Pay a bill: records the expense in the payer name and links it to the bill',
  })
  @ApiResponse({ status: 201, description: 'Bill paid and settlement transaction created' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 409, description: 'Bill is not open' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payBillDto: PayBillDto,
    @Request() req,
  ) {
    return await this.billsService.pay(id, payBillDto, req.user.id);
  }
}
