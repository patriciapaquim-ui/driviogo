import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new user account' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@Request() req: { user: { id: string } }) {
    return this.usersService.findOne(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(@Request() req: { user: { id: string } }, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.id, dto);
  }

  // Admin-only routes
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] List all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Deactivate user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
