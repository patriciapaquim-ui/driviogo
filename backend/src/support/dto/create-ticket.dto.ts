import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Problema com meu veículo' })
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
