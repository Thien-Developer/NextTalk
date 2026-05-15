import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsEnum(['text', 'image', 'file', 'audio', 'video', 'sticker'])
  type: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mediaSize?: number;

  @IsOptional()
  @IsString()
  mediaMime?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
