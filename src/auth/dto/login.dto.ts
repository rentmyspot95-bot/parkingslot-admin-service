import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** 6-digit TOTP code, required only if the admin has TOTP enabled. */
  @IsOptional()
  @IsString()
  totp?: string;
}
