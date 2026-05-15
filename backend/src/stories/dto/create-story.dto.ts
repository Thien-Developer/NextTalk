import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  mediaUrl: string;

  @IsEnum(['image', 'video'])
  type: 'image' | 'video';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
