import { Controller, Get, Post, Patch, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.notificationsService.findByUser(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  unreadCount(@Request() req: { user: { id: string } }) {
    return this.notificationsService.countUnread(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Request() req: { user: { id: string } }) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
