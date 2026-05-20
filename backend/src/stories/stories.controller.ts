import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface ReqUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private storiesService: StoriesService) {}

  /** POST /api/stories — publish a new story (24 h TTL) */
  @Post()
  createStory(@CurrentUser() user: ReqUser, @Body() dto: CreateStoryDto) {
    return this.storiesService.createStory(user.id, dto);
  }

  /** GET /api/stories/feed — stories from friends + self, grouped by author */
  @Get('feed')
  getStoryFeed(@CurrentUser() user: ReqUser) {
    return this.storiesService.getStoryFeed(user.id);
  }

  /** GET /api/stories/my — own active stories with viewer lists */
  @Get('my')
  getMyStories(@CurrentUser() user: ReqUser) {
    return this.storiesService.getMyStories(user.id);
  }

  /** DELETE /api/stories/:id */
  @Delete(':id')
  deleteStory(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.storiesService.deleteStory(user.id, id);
  }

  /** POST /api/stories/:id/view — mark story as viewed */
  @Post(':id/view')
  viewStory(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.storiesService.viewStory(user.id, id);
  }

  /** GET /api/stories/:id/viewers — who viewed my story */
  @Get(':id/viewers')
  getStoryViewers(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.storiesService.getStoryViewers(user.id, id);
  }
}
