import { IsString, IsNumber, IsEnum, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty() @IsString() subscriptionId: string;

  @ApiProperty({ example: 2500.00 })
  @IsNumber() @Min(0.01) @Type(() => Number) amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod) method: PaymentMethod;

  @ApiProperty({ example: '2024-02-01' })
  @IsDateString() dueDate: string;

  @ApiPropertyOptional() @IsOptional() @IsString() externalId?: string;
}
