import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  employeeNumber: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
