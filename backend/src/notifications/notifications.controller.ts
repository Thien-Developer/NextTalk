import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

interface ReqUser { id: string }

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('fcm-token')
  @ApiOperation({ summary: 'Register FCM token for push notifications' })
  register(@CurrentUser() user: ReqUser, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(user.id, dto.token);
  }

  @Delete('fcm-token')
  @ApiOperation({ summary: 'Remove FCM token (on logout)' })
  remove(@Body() dto: RegisterTokenDto) {
    return this.notificationsService.removeToken(dto.token);
  }
}
