import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsString()
  employeeNumber: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  employeeNumber: string;

  @IsNotEmpty()
  @IsString()
  resetCode: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
