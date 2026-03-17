import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    return this.prisma.payment.create({
      data: {
        subscriptionId: dto.subscriptionId,
        userId,
        amount: dto.amount,
        method: dto.method,
        dueDate: new Date(dto.dueDate),
        externalId: dto.externalId,
      },
    });
  }

  findByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: {
        subscription: {
          select: {
            id: true,
            vehicle: { select: { brand: true, model: true } },
            plan: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  findAll() {
    return this.prisma.payment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { subscription: true, user: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async markAsPaid(id: string) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });
  }

  async markAsFailed(id: string, reason?: string) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    });
  }
}
