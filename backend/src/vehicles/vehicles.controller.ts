import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List vehicles with filters and pagination' })
  findAll(@Query() filter: VehicleFilterDto) {
    return this.vehiclesService.findAll(filter);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle details with plans and images' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Create vehicle' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Update vehicle' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Deactivate vehicle' })
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
