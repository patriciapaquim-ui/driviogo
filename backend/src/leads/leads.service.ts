import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLeadDto, userId?: string) {
    return this.prisma.lead.create({
      data: { ...dto, userId },
    });
  }

  findAll(status?: LeadStatus) {
    return this.prisma.lead.findMany({
      where: { ...(status && { status }) },
      include: {
        vehicle: { select: { id: true, brand: true, model: true, year: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateStatus(id: string, status: LeadStatus, notes?: string) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data: { status, ...(notes && { notes }) },
    });
  }
}
