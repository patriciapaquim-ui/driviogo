import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPIs and stats' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Recent platform activity' })
  getActivity() {
    return this.adminService.getRecentActivity();
  }
}
