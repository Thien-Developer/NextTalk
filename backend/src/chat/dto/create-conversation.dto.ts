import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ enum: ['direct', 'group'], example: 'group' })
  @IsEnum(['direct', 'group'])
  type: 'direct' | 'group';

  @ApiProperty({ type: [String], description: 'Array of user UUIDs to add' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  memberIds: string[];

  @ApiPropertyOptional({ example: 'Dev Team' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
