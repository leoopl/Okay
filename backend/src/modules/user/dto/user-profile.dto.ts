import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { User, UserStatus } from '../entities/user.entity';

/**
 * UserProfile is a Data Transfer Object that ensures only
 * non-sensitive user information is returned in API responses
 */
@Exclude()
export class UserProfile {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: "User's email address" })
  email: string;

  @Expose()
  @ApiProperty({ description: "User's name" })
  name: string;

  @Expose()
  @ApiProperty({ description: "User's surname", required: false })
  surname?: string;

  @Expose()
  @ApiProperty({ description: "User's gender", required: false })
  gender?: string;

  @Expose()
  @ApiProperty({ description: "User's birthdate", required: false })
  birthdate?: Date;

  @Expose()
  @ApiProperty({ description: 'User status' })
  status: UserStatus;

  @Expose()
  @ApiProperty({ description: "User's consent to data processing" })
  consentToDataProcessing: boolean;

  @Expose()
  @ApiProperty({ description: "User's consent to research" })
  consentToResearch: boolean;

  @Expose()
  @ApiProperty({ description: "User's consent to marketing" })
  consentToMarketing: boolean;

  @Expose()
  @ApiProperty({ description: 'Date when consent was last updated' })
  consentUpdatedAt?: Date;

  @Expose()
  @ApiProperty({ description: "User's account creation date" })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: "User's account last update date" })
  updatedAt: Date;

  @Expose()
  @ApiProperty({ description: "User's roles", type: [String] })
  roles: string[];

  @Expose()
  @ApiProperty({ description: "User's profile picture URL", required: false })
  profilePictureUrl?: string;

  @Expose()
  @ApiProperty({ description: 'Profile picture upload date', required: false })
  profilePictureUpdatedAt?: Date;

  // Excluded sensitive fields
  // @Exclude() is not needed because of the class-level @Exclude()
  password?: string;
  auth0Id?: string;

  constructor(user: User) {
    Object.assign(this, user);

    // Convert role objects to role names for simpler frontend handling
    this.roles = user.roles?.map((role) => role.name) || [];
  }
}
