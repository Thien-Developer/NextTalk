import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

class BaseProfileDto {
  @IsString()
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateProfileDto extends PartialType(BaseProfileDto) {}
