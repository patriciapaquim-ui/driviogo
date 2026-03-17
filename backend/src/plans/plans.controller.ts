import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List plans (optionally filter by vehicleId)' })
  findAll(@Query('vehicleId') vehicleId?: string) {
    return this.plansService.findAll(vehicleId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get plan details' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Create plan' })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Update plan' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Deactivate plan' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
