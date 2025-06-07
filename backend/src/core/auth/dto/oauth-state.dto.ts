import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class OAuthStateDto {
  @IsNotEmpty()
  @IsString()
  codeVerifier: string;

  @IsNotEmpty()
  @IsString()
  codeChallenge: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;

  @IsOptional()
  @IsUUID()
  linkAccountUserId?: string; // For account linking flow
}
