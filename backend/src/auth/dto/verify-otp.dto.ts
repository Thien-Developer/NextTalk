import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Matches(/^(\+84|0)[0-9]{9}$/, { message: 'Invalid Vietnamese phone number' })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}
