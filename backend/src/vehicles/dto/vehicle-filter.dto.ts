import { IsOptional, IsString, IsInt, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VehicleStatus } from '@prisma/client';

export class VehicleFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transmission?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fuelType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) featured?: boolean;
  @ApiPropertyOptional({ enum: VehicleStatus }) @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2000) @Type(() => Number) yearFrom?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Max(2030) @Type(() => Number) yearTo?: number;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 12 }) @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number = 12;
}
