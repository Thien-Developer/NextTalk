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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatGateway } from './chat.gateway';

interface ReqUser {
  id: string;
  phone: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  getConversations(@CurrentUser() user: ReqUser) {
    return this.chatService.getConversations(user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new direct or group conversation' })
  async createConversation(
    @CurrentUser() user: ReqUser,
    @Body() dto: CreateConversationDto,
  ) {
    const conversation = await this.chatService.createConversation(user.id, dto);

    const allMemberIds = [user.id, ...dto.memberIds];
    for (const memberId of allMemberIds) {
      await this.chatGateway.joinConversationRoom(memberId, conversation.id);
    }

    return conversation;
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation detail with members' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  getConversation(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.chatService.getConversation(user.id, id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages with cursor-based pagination' })
  getMessages(
    @CurrentUser() user: ReqUser,
    @Param('id') id: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.chatService.getMessages(user.id, id, query);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Update group name or avatar (admin only)' })
  async updateGroup(
    @CurrentUser() user: ReqUser,
    @Param('id') conversationId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const result = await this.chatService.updateGroup(user.id, conversationId, dto);
    this.chatGateway.server.to(`conv:${conversationId}`).emit('group_updated', result);
    return result;
  }

  @Post('conversations/:id/members')
  @ApiOperation({ summary: 'Add members to group (admin only)' })
  async addMembers(
    @CurrentUser() user: ReqUser,
    @Param('id') conversationId: string,
    @Body() dto: AddMembersDto,
  ) {
    const result = await this.chatService.addMembers(user.id, conversationId, dto);
    for (const memberId of dto.memberIds) {
      await this.chatGateway.joinConversationRoom(memberId, conversationId);
    }
    this.chatGateway.server.to(`conv:${conversationId}`).emit('members_added', { conversationId, newMemberIds: dto.memberIds });
    return result;
  }

  @Delete('conversations/:id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from group (admin only)' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  async removeMember(
    @CurrentUser() user: ReqUser,
    @Param('id') conversationId: string,
    @Param('userId') targetUserId: string,
  ) {
    const result = await this.chatService.removeMember(user.id, conversationId, targetUserId);
    this.chatGateway.server.to(`conv:${conversationId}`).emit('member_removed', result);
    return result;
  }

  @Patch('conversations/:id/members/:userId/role')
  @ApiOperation({ summary: 'Change member role to admin or member (admin only)' })
  async updateMemberRole(
    @CurrentUser() user: ReqUser,
    @Param('id') conversationId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const result = await this.chatService.updateMemberRole(user.id, conversationId, targetUserId, dto.role);
    this.chatGateway.server.to(`conv:${conversationId}`).emit('member_role_updated', { conversationId, userId: targetUserId, role: dto.role });
    return result;
  }

  @Delete('conversations/:id/leave')
  @ApiOperation({ summary: 'Leave a group conversation (auto-assigns new admin if needed)' })
  async leaveGroup(@CurrentUser() user: ReqUser, @Param('id') conversationId: string) {
    const result = await this.chatService.leaveGroup(user.id, conversationId);
    this.chatGateway.server.to(`conv:${conversationId}`).emit('member_left', { conversationId, userId: user.id });
    return result;
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Recall (soft-delete) own message' })
  async recallMessage(@CurrentUser() user: ReqUser, @Param('id') messageId: string) {
    const result = await this.chatService.recallMessage(user.id, messageId);
    this.chatGateway.server
      .to(`conv:${result.conversationId}`)
      .emit('message_recalled', result);
    return result;
  }

  @Post('messages/:id/reactions')
  @ApiOperation({ summary: 'Add or remove emoji reaction on a message' })
  @ApiResponse({ status: 201, description: 'Returns updated reactions list' })
  async reactToMessage(
    @CurrentUser() user: ReqUser,
    @Param('id') messageId: string,
    @Body('emoji') emoji: string,
    @Body('conversationId') conversationId: string,
  ) {
    const result = await this.chatService.reactToMessage(user.id, messageId, emoji);
    this.chatGateway.server
      .to(`conv:${conversationId}`)
      .emit('message_reaction', result);
    return result;
  }
}
