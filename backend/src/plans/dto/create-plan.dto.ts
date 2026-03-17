import { IsString, IsInt, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @ApiProperty() @IsString() vehicleId: string;
  @ApiProperty({ example: 'Plano 12 meses' }) @IsString() name: string;

  @ApiProperty({ example: 12 })
  @IsInt() @Min(1) @Type(() => Number) durationMonths: number;

  @ApiProperty({ example: 2500.00 })
  @IsNumber() @Min(0) @Type(() => Number) monthlyPrice: number;

  @ApiProperty({ example: 2000 })
  @IsInt() @Min(0) @Type(() => Number) includedKm: number;

  @ApiProperty({ example: 1.50 })
  @IsNumber() @Min(0) @Type(() => Number) extraKmPrice: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean() includesInsurance?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean() includesMaintenance?: boolean;
}
