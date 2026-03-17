import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(vehicleId?: string) {
    return this.prisma.plan.findMany({
      where: { isActive: true, ...(vehicleId && { vehicleId }) },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  create(dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: dto });
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }
}
