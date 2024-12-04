import {
  IsAlphanumeric,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'Name must have atleast 2 characters.' })
  @MaxLength(30)
  @IsNotEmpty()
  @IsAlphanumeric(null, {
    message: 'Username does not allow other than alpha numeric chars.',
  })
  readonly name: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @IsAlphanumeric(null, {
    message: 'Username does not allow other than alpha numeric chars.',
  })
  readonly surname?: string;

  // @IsNotEmpty()
  // @MinLength(3, { message: 'Username must have atleast 3 characters.' })
  // @IsAlphanumeric(null, {
  //   message: 'Username does not allow other than alpha numeric chars.',
  // })
  // username: string;

  @IsNotEmpty()
  @IsEmail(null, { message: 'Please provide valid Email.' })
  readonly email: string;

  @IsDateString()
  @IsNotEmpty()
  readonly birthdate?: Date;

  @IsString()
  @IsOptional()
  readonly gender?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(passwordRegEx, {
    message: `Password must contain Minimum 8 and maximum 20 characters, 
      at least one uppercase letter, 
      one lowercase letter, 
      one number and 
      one special character`,
  })
  readonly password: string;
}
