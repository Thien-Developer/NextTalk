import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '0912345678', description: 'Vietnamese phone number' })
  @IsString()
  @Matches(/^(\+84|0)[0-9]{9}$/, { message: 'Invalid Vietnamese phone number' })
  phone: string;
}
