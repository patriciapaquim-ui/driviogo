import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsOptional() @IsString() adminNotes?: string;
}
