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
import { GoalsService } from './goals.service';
import {
  CreateGoalDto,
  UpdateGoalDto,
  GoalFiltersDto,
  ContributeDto,
  AdjustBalanceDto,
  ReorderGoalsDto,
} from './dto/goal.dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('goals')
@ApiBearerAuth()
@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a savings goal' })
  @ApiResponse({ status: 201, description: 'Goal created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to context' })
  async create(@Body() createGoalDto: CreateGoalDto, @Request() req) {
    return await this.goalsService.create(createGoalDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List goals, active ones by default' })
  @ApiResponse({ status: 200, description: 'Goals retrieved successfully' })
  async findAll(@Query() filters: GoalFiltersDto, @Request() req) {
    return await this.goalsService.findAll(req.user.id, filters);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the hand-picked goal order (index = position)' })
  @ApiResponse({ status: 204, description: 'Order updated' })
  @ApiResponse({ status: 403, description: 'A listed goal is not editable by the caller' })
  async reorder(@Body() reorderDto: ReorderGoalsDto, @Request() req) {
    await this.goalsService.reorder(reorderDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific goal by ID' })
  @ApiResponse({ status: 200, description: 'Goal retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return await this.goalsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal (name, target, deadline, archive)' })
  @ApiResponse({ status: 200, description: 'Goal updated successfully' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @Request() req,
  ) {
    return await this.goalsService.update(id, updateGoalDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a goal and its contribution trail' })
  @ApiResponse({ status: 204, description: 'Goal deleted successfully' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.goalsService.remove(id, req.user.id);
  }

  @Post(':id/contributions')
  @ApiOperation({ summary: 'Deposit towards a goal, in the caller name' })
  @ApiResponse({ status: 201, description: 'Contribution recorded' })
  @ApiResponse({ status: 409, description: 'Goal is not active' })
  async contribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() contributeDto: ContributeDto,
    @Request() req,
  ) {
    return await this.goalsService.contribute(id, contributeDto, req.user.id);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust the goal balance by ± (yield, loss, recount)' })
  @ApiResponse({ status: 201, description: 'Adjustment recorded in the trail' })
  @ApiResponse({ status: 409, description: 'Adjustment would make the balance negative' })
  async adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() adjustDto: AdjustBalanceDto,
    @Request() req,
  ) {
    return await this.goalsService.adjust(id, adjustDto, req.user.id);
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'The goal contribution trail, newest first' })
  @ApiResponse({ status: 200, description: 'Contributions retrieved successfully' })
  async listContributions(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return await this.goalsService.listContributions(id, req.user.id);
  }

  @Delete(':id/contributions/:contributionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a contribution and subtract it from the total' })
  @ApiResponse({ status: 204, description: 'Contribution removed' })
  @ApiResponse({ status: 404, description: 'Contribution not found' })
  async removeContribution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @Request() req,
  ) {
    await this.goalsService.removeContribution(id, contributionId, req.user.id);
  }
}
