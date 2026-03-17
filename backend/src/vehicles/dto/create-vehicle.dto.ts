import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Corolla' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(2000)
  @Max(2030)
  year: number;

  @ApiPropertyOptional({ example: 'Prata' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ example: 'automatic' })
  @IsOptional()
  @IsString()
  transmission?: string;

  @ApiPropertyOptional({ example: 'flex' })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  doors?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  seats?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
