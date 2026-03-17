import { Controller, Get, Post, Patch, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadStatus, Role } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a lead (interest form)' })
  create(
    @Body() dto: CreateLeadDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.leadsService.create(dto, req.user?.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] List all leads' })
  findAll(@Query('status') status?: LeadStatus) {
    return this.leadsService.findAll(status);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Get lead details' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Update lead status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: LeadStatus; notes?: string },
  ) {
    return this.leadsService.updateStatus(id, body.status, body.notes);
  }
}
