import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface ReqUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser() user: ReqUser) {
    return this.userService.getProfile(user.id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: ReqUser, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Get('search')
  search(@Query('phone') phone: string, @CurrentUser() user: ReqUser) {
    return this.userService.searchByPhone(phone, user.id);
  }

  @Get('friends')
  getFriends(@CurrentUser() user: ReqUser) {
    return this.userService.getFriends(user.id);
  }

  @Get('friend-requests')
  getFriendRequests(@CurrentUser() user: ReqUser) {
    return this.userService.getFriendRequests(user.id);
  }

  @Post(':id/friend-request')
  sendFriendRequest(@CurrentUser() user: ReqUser, @Param('id') addresseeId: string) {
    return this.userService.sendFriendRequest(user.id, addresseeId);
  }

  @Patch(':id/friend-request/accept')
  acceptFriendRequest(@CurrentUser() user: ReqUser, @Param('id') requesterId: string) {
    return this.userService.respondFriendRequest(user.id, requesterId, 'accept');
  }

  @Patch(':id/friend-request/reject')
  rejectFriendRequest(@CurrentUser() user: ReqUser, @Param('id') requesterId: string) {
    return this.userService.respondFriendRequest(user.id, requesterId, 'reject');
  }

  @Delete(':id/friend')
  removeFriend(@CurrentUser() user: ReqUser, @Param('id') friendId: string) {
    return this.userService.removeFriend(user.id, friendId);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}
