import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty() @IsString() userId: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType) type: NotificationType;

  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() body: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
