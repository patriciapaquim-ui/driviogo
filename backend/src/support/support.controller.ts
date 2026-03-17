import { Controller, Get, Post, Put, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Open a support ticket' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.create(req.user.id, dto);
  }

  @Get('tickets/my')
  @ApiOperation({ summary: 'List own support tickets' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.supportService.findByUser(req.user.id);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details' })
  findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  @Get('tickets')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] List all tickets' })
  findAll() {
    return this.supportService.findAll();
  }

  @Put('tickets/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Update ticket status/notes' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.update(id, dto);
  }
}
