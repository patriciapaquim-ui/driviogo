import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({ data: { userId, ...dto } });
  }

  findByUser(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.supportTicket.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.findOne(id);
    const resolvedAt =
      dto.status === TicketStatus.RESOLVED ? new Date() : undefined;

    return this.prisma.supportTicket.update({
      where: { id },
      data: { ...dto, ...(resolvedAt && { resolvedAt }) },
    });
  }
}
