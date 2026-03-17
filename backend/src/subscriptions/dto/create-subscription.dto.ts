import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty() @IsString() vehicleId: string;
  @ApiProperty() @IsString() planId: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
