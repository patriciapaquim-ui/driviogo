import { Controller, Get, Post, Patch, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment for a subscription' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user payment history' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.paymentsService.findByUser(req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] List all payments' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/paid')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Mark payment as paid' })
  markAsPaid(@Param('id') id: string) {
    return this.paymentsService.markAsPaid(id);
  }

  @Patch(':id/failed')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Mark payment as failed' })
  markAsFailed(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.paymentsService.markAsFailed(id, body.reason);
  }
}
