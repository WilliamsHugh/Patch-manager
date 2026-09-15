import { Role } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(8)
  password!: string;
}
