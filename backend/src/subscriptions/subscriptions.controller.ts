import { Controller, Get, Post, Put, Patch, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a subscription request' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List current user subscriptions' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.subscriptionsService.findByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription details' })
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: string } },
  ) {
    const userId = req.user.role === Role.ADMIN ? undefined : req.user.id;
    return this.subscriptionsService.findOne(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  cancel(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.subscriptionsService.cancel(id, req.user.id);
  }

  // Admin
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] List all subscriptions' })
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Update subscription status' })
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }
}
