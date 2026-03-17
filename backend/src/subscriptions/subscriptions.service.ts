import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

const SUBSCRIPTION_INCLUDE = {
  vehicle: { select: { id: true, brand: true, model: true, year: true, thumbnailUrl: true } },
  plan: true,
  payments: { orderBy: { dueDate: 'desc' as const }, take: 5 },
} as const;

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    // Validate vehicle & plan exist
    const [vehicle, plan] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
      this.prisma.plan.findUnique({ where: { id: dto.planId } }),
    ]);

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.vehicleId !== dto.vehicleId) {
      throw new BadRequestException('Plan does not belong to this vehicle');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    return this.prisma.subscription.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        planId: dto.planId,
        startDate,
        endDate,
        deliveryAddress: dto.deliveryAddress,
        notes: dto.notes,
      },
      include: SUBSCRIPTION_INCLUDE,
    });
  }

  findByUser(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: SUBSCRIPTION_INCLUDE,
    });

    if (!subscription) throw new NotFoundException('Subscription not found');
    if (userId && subscription.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  findAll() {
    return this.prisma.subscription.findMany({
      include: {
        ...SUBSCRIPTION_INCLUDE,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    return this.prisma.subscription.update({ where: { id }, data: dto });
  }

  async cancel(id: string, userId: string) {
    const sub = await this.findOne(id, userId);

    if ([SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED].includes(sub.status)) {
      throw new BadRequestException('Subscription is already cancelled or expired');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }
}
