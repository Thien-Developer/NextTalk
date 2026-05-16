import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';

interface ReqUser { id: string; phone: string }

@ApiTags('calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get call history for current user' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  getHistory(
    @CurrentUser() user: ReqUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.callsService.getCallHistory(user.id, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call detail by ID' })
  getCall(@CurrentUser() user: ReqUser, @Param('id') callId: string) {
    return this.callsService.getCallById(callId);
  }
}
