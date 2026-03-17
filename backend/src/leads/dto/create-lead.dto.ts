import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+5511988887777' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Vehicle the lead is interested in' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: 'landing_page' })
  @IsOptional()
  @IsString()
  source?: string;
}
