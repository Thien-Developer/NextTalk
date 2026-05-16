import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { UserRole, UserStatus } from './admin.service';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateRoleDto {
  @ApiProperty({ enum: ['user', 'admin', 'superadmin'] })
  @IsEnum(['user', 'admin', 'superadmin'])
  role: UserRole;
}

class UpdateStatusDto {
  @ApiProperty({ enum: ['active', 'banned'] })
  @IsEnum(['active', 'banned'])
  status: UserStatus;
}

interface AdminUser { id: string; role: string }

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Stats ──────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard overview: users, messages, calls, chart data' })
  getStats() {
    return this.adminService.getOverviewStats();
  }

  // ─── Users ──────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with search, filter, pagination' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'banned'] })
  @ApiQuery({ name: 'role', required: false, enum: ['user', 'admin', 'superadmin'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  listUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.adminService.listUsers({ search, status, role, limit, offset });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail with activity counts' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/role')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Change user role (superadmin only)' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() admin: AdminUser,
  ) {
    return this.adminService.updateUserRole(id, dto.role, admin.id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Ban or unban a user' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() admin: AdminUser,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, admin.id);
  }

  @Delete('users/:id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Permanently delete a user (superadmin only)' })
  deleteUser(@Param('id') id: string, @CurrentUser() admin: AdminUser) {
    return this.adminService.deleteUser(id, admin.id);
  }

  // ─── Conversations ───────────────────────────────────────────────────────

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations with member/message counts' })
  @ApiQuery({ name: 'type', required: false, enum: ['direct', 'group'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  listConversations(
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.adminService.listConversations({ type, limit, offset });
  }

  @Delete('conversations/:id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a conversation and all its messages (superadmin only)' })
  deleteConversation(@Param('id') id: string) {
    return this.adminService.deleteConversation(id);
  }

  // ─── Calls ───────────────────────────────────────────────────────────────

  @Get('calls')
  @ApiOperation({ summary: 'List all calls with filter by status' })
  @ApiQuery({ name: 'status', required: false, enum: ['ringing', 'accepted', 'rejected', 'ended', 'missed', 'busy'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  listCalls(
    @Query('status') status?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.adminService.listCalls({ status, limit, offset });
  }
}
